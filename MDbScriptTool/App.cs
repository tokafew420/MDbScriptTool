using CefSharp.WinForms;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Diagnostics;
using System.Dynamic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Tokafew420.MDbScriptTool
{

    internal class App
    {
        private Form _form;
        private ChromiumWebBrowser _browser;
        private SystemEvent _systemEvent;
        private ScriptEvent _scriptEvent;
        private Regex _goRegex = new Regex(@"^\s*go\s*(--.*)*$", RegexOptions.IgnoreCase);
        private static readonly Random _rnd = new Random();
        private static readonly char[] padding = { '=' };

        /// <summary>
        /// Initalizes a new instance of App
        /// </summary>
        /// <param name="form"></param>
        /// <param name="browser"></param>
        /// <param name="systemEvent"></param>
        /// <param name="scriptEvent"></param>
        internal App(Form form, ChromiumWebBrowser browser, SystemEvent systemEvent, ScriptEvent scriptEvent)
        {
            _form = form ?? throw new ArgumentNullException("form");
            _browser = browser ?? throw new ArgumentNullException("browser");
            _systemEvent = systemEvent ?? throw new ArgumentNullException("systemEvent");
            _scriptEvent = scriptEvent ?? throw new ArgumentNullException("scriptEvent");

            // Register event handlers
            _scriptEvent.On("parse-connection-string", ParseConnectionString);
            _scriptEvent.On("encrypt-password", EncryptPassword);
            _scriptEvent.On("list-databases", GetDatabases);
            _scriptEvent.On("execute-sql", ExecuteSql);
        }

        internal void ParseConnectionString(object[] args)
        {
            var replyMsgName = "connection-string-parsed";

            Debug.WriteLine("Event received: parse-connection-string");

            if (args != null && args.Length == 1)
            {
                if (!string.IsNullOrWhiteSpace(args[0] as string))
                {
                    try
                    {
                        var builder = new SqlConnectionStringBuilder(args[0] as string);
                        _systemEvent.Emit(replyMsgName, null, builder.ConnectionString, builder);
                    }
                    catch (Exception e)
                    {
                        _systemEvent.Emit(replyMsgName, e);
                    }
                }
            }
        }

        internal void EncryptPassword(object[] args)
        {
            var replyMsgName = "password-encrypted";
            var pass = "";

            Debug.WriteLine("Event received: encrypt-password");

            if (args != null && args.Length == 1)
            {
                if (!string.IsNullOrWhiteSpace(args[0] as string))
                {
                    pass = args[0] as string;

                    try
                    {
                        // If we can decrypt then the arg is already encrypted
                        // Then just return the arg
                        Decrypt(pass);
                        _systemEvent.Emit(replyMsgName, pass);
                        return;
                    }
                    catch (Exception e)
                    {
                        // Do Nothing
                        Debug.WriteLine(e.ToString());
                    }

                    try
                    {
                        // Assume not encrypted
                        var cipher = Encrypt(pass);
                        _systemEvent.Emit(replyMsgName, cipher);
                        return;
                    }
                    catch (Exception e)
                    {
                        // Do nothing
                        Debug.WriteLine(e.ToString());
                    }
                }
            }

            _systemEvent.Emit(replyMsgName, pass);
        }

        internal void GetDatabases(object[] args)
        {
            var replyMsgName = "database-list";

            if (args != null && args.Length == 1)
            {
                try
                {
                    var connStr = args[0] as string;
                    var builder = new SqlConnectionStringBuilder(connStr)
                    {
                        InitialCatalog = "master"
                    };
                    builder.Password = TryDecrypt(builder.Password);

                    using (var conn = new SqlConnection(builder.ToString()))
                    {
                        conn.Open();
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandType = System.Data.CommandType.Text;
                            cmd.CommandText = "SELECT * FROM sys.databases";

                            using (var reader = cmd.ExecuteReader())
                            {
                                _systemEvent.Emit(replyMsgName, null, SqlDataReaderToExpando(reader));
                            }
                        }
                    }
                }
                catch (Exception e)
                {
                    _systemEvent.Emit(replyMsgName, e);
                }
            }
        }

        private IEnumerable<dynamic> SqlDataReaderToExpando(SqlDataReader reader)
        {
            var count = reader.FieldCount;

            while (reader.Read())
            {
                var expandoObject = new ExpandoObject() as IDictionary<string, object>;

                for (var i = 0; i < count; i++)
                    expandoObject.Add(reader.GetName(i), reader[i]);

                yield return expandoObject;
            }
        }

        private void ExecuteSql(object[] args)
        {
            var replyMsgName = "sql-execute-complete";
            if (args == null || args.Length != 4)
            {
                _systemEvent.Emit(replyMsgName, new ArgumentException("Invalid arguments"));
                return;
            }

            try
            {
                var connStr = args[0] as string;
                var dbs = (args[1] as List<object>).OfType<string>();
                var sql = args[2] as string;
                var id = args[3] as string;

                if (!string.IsNullOrWhiteSpace(connStr) &&
                    dbs.Count() > 0 &&
                    !string.IsNullOrWhiteSpace(sql) &&
                    !string.IsNullOrWhiteSpace(id))
                {
                    var batches = GetSqlBatches(sql);
                    var builder = new SqlConnectionStringBuilder(connStr);
                    builder.Password = TryDecrypt(builder.Password);

                    foreach (var db in dbs)
                    {
                        if (!string.IsNullOrWhiteSpace(db))
                        {
                            builder.InitialCatalog = db;
#pragma warning disable CS4014 // Because this call is not awaited, execution of the current method continues before the call is completed
                            ExecuteSqlBatches(builder.ToString(), db, batches, id);
#pragma warning restore CS4014 // Because this call is not awaited, execution of the current method continues before the call is completed
                        }
                    }
                }
            }
            catch (Exception e)
            {
                _systemEvent.Emit(replyMsgName, e);
            }
        }

        private async Task ExecuteSqlBatches(string connectionString, string db, IEnumerable<string> batches, string id)
        {
            _systemEvent.Emit("sql-execute-begin", id, db);
            Debug.WriteLine($"Begin batches for {db}");

            foreach (var batch in batches)
            {
                if (!string.IsNullOrWhiteSpace(batch))
                {
                    using (var conn = new SqlConnection(connectionString))
                    {
                        _systemEvent.Emit("sql-execute-connecting", id, db);
                        Debug.WriteLine($"Connecting to {connectionString}");
                        await conn.OpenAsync();

                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandType = CommandType.Text;
                            cmd.CommandText = batch;

                            _systemEvent.Emit("sql-execute-executing", id, db);
                            Debug.WriteLine($"Executing to {connectionString}");

                            using (var reader = await cmd.ExecuteReaderAsync())
                            {
                                do
                                {
                                    _systemEvent.Emit("sql-execute-result", id, db, SqlDataReaderToExpando(reader));
                                } while (reader.NextResult());

                                _systemEvent.Emit("sql-execute-batch-complete", id, db);
                                Debug.WriteLine($"Completed batch {id} for {db}");
                            }
                        }
                    }
                }
            }

            _systemEvent.Emit("sql-execute-complete", id, db);
            Debug.WriteLine($"Completed batches {id} for {db}");
        }

        private IEnumerable<string> GetSqlBatches(string sql)
        {
            var startIdx = 0;
            var count = 0;
            var lines = sql.Split('\n');

            foreach (var line in lines)
            {
                if (_goRegex.IsMatch(line))
                {
                    var batch = string.Join("\n", lines, startIdx, count);

                    startIdx += count + 1;   // Skip the GO line
                    count = 0;
                    yield return batch;
                }
                else
                {
                    count++;
                }
            }

            if (count > 0)
            {
                yield return string.Join("\n", lines, startIdx, count);
            }
        }

        internal static string Encrypt(string clearText)
        {
            byte[] bytes;
            var salt = new byte[32];

            if (clearText == null)
            {
                bytes = new byte[0];
            }
            else
            {
                bytes = Encoding.UTF8.GetBytes(clearText);
            }

            _rnd.NextBytes(salt);

            var cipher = ProtectedData.Protect(bytes, salt, DataProtectionScope.CurrentUser);
            var final = new byte[cipher.Length + 32];

            Buffer.BlockCopy(salt, 0, final, 0, 32);
            Buffer.BlockCopy(cipher, 0, final, 32, cipher.Length);

            return Convert.ToBase64String(final)
                .TrimEnd(padding).Replace('+', '-').Replace('/', '_');
        }

        internal static string Decrypt(string cipher)
        {
            cipher = cipher
                .Replace('_', '/').Replace('-', '+');
            switch (cipher.Length % 4)
            {
                case 2: cipher += "=="; break;
                case 3: cipher += "="; break;
            }
            var bytes = Convert.FromBase64String(cipher);
            var salt = new byte[32];
            var tmpCipher = new byte[bytes.Length - 32];

            Buffer.BlockCopy(bytes, 0, salt, 0, 32);
            Buffer.BlockCopy(bytes, 32, tmpCipher, 0, tmpCipher.Length);

            return Encoding.UTF8.GetString(ProtectedData.Unprotect(tmpCipher, salt, DataProtectionScope.CurrentUser));
        }

        internal static string TryDecrypt(string cipher)
        {
            try
            {
                return Decrypt(cipher);
            }
            catch (Exception e)
            {
                Debug.WriteLine(e.ToString());
                return cipher;
            }
        }
    }
}