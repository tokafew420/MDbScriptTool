using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Diagnostics;
using System.Dynamic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows.Forms;
using CefSharp.WinForms;

namespace Tokafew420.MDbScriptTool
{
    internal class App
    {
        private readonly Form _form;
        private readonly ChromiumWebBrowser _browser;
        private readonly Regex _goRegex = new Regex(@"^\s*go\s*(--.*)*$", RegexOptions.IgnoreCase);
        private static readonly Random _rnd = new Random();
        private static readonly char[] _padding = { '=' };

        public OsEvent OsEvent { get; set; }
        public UiEvent UiEvent { get; set; }

        /// <summary>
        /// Initalizes a new instance of App
        /// </summary>
        /// <param name="form"></param>
        /// <param name="browser"></param>
        internal App(Form form, ChromiumWebBrowser browser)
        {
            _form = form ?? throw new ArgumentNullException(nameof(form));
            _browser = browser ?? throw new ArgumentNullException(nameof(browser));
            OsEvent = new OsEvent(browser);
            UiEvent = new UiEvent(browser);

            // Register event handlers
            UiEvent.On("parse-connection-string", ParseConnectionString);
            UiEvent.On("encrypt-password", EncryptPassword);
            UiEvent.On("list-databases", GetDatabases);
            UiEvent.On("execute-sql", ExecuteSql);
            UiEvent.On("get-versions", GetVersions);
            UiEvent.On("get-log-settings", GetLogSettings);
            UiEvent.On("set-log-settings", SetLogSettings);
        }

        /// <summary>
        /// Get version numbers of the app and dependencies.
        /// </summary>
        /// <param name="args">Ignored</param>
        /// <remarks>
        /// Emits event: versions
        /// Event params:
        /// [0] <see cref="Exception"/> if any.
        /// [1] <see cref="Versions"/>
        /// </remarks>
        private void GetVersions(object[] args)
        {
            var replyMsgName = "versions";
            var versions = new Versions();

            try
            {
                var appVersion = Assembly.GetExecutingAssembly().GetName().Version;

                versions.App = $"{appVersion.Major}.{appVersion.Minor}.{appVersion.Build}";

                versions.Cef = FileVersionInfo.GetVersionInfo(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "libcef.dll")).ProductVersion;

                OsEvent.Emit(replyMsgName, null, versions);
            }
            catch (Exception e)
            {
                Logger.Warn(e.ToString());
                OsEvent.Emit(replyMsgName, e, versions);
            }
        }

        /// <summary>
        /// Parses the connection string.
        /// </summary>
        /// <param name="args">Expects:
        /// [0] - A connection string.</param>
        /// <remarks>
        /// Emits event: connection-string-parsed
        /// Event params:
        /// [0] <see cref="Exception"/> if any.
        /// [1] The parsed connection string
        /// [2] The connection string builder instance.
        /// </remarks>
        private void ParseConnectionString(object[] args)
        {
            var replyMsgName = "connection-string-parsed";

            if (args == null || args.Length != 1 || string.IsNullOrWhiteSpace(args[0] as string))
            {
                OsEvent.Emit(replyMsgName, new ArgumentNullException("connectionString"));
                return;
            }

            var connStr = args[0] as string;

            try
            {
                var builder = new SqlConnectionStringBuilder(args[0] as string);
                OsEvent.Emit(replyMsgName, null, builder.ConnectionString, builder);
            }
            catch (Exception e)
            {
                OsEvent.Emit(replyMsgName, e);
            }
        }

        /// <summary>
        /// Encrypts the password.
        /// </summary>
        /// <param name="args">Expects:
        /// [0] The password to encrypt.
        /// </param>
        /// <remarks>
        /// Emits event: password-ecrypted
        /// Event params:
        /// [0] <see cref="Exception"/> if any.
        /// [1] The encrypted password.
        /// </remarks>
        private void EncryptPassword(object[] args)
        {
            var replyMsgName = "password-encrypted";

            if (args == null | args.Length != 1 || string.IsNullOrWhiteSpace(args[0] as string))
            {
                OsEvent.Emit(replyMsgName, new ArgumentNullException("password"));
                return;
            }
            var pass = args[0] as string;

            try
            {
                // If we can decrypt then the arg is already encrypted
                // Then just return the arg
                Decrypt(pass);
                OsEvent.Emit(replyMsgName, null, pass);
                return;
            }
            catch (Exception e)
            {
                // Do Nothing
                Logger.Error(e.ToString());
            }

            try
            {
                // Assume not encrypted
                var cipher = Encrypt(pass);
                OsEvent.Emit(replyMsgName, null, cipher);
            }
            catch (Exception e)
            {
                // Do nothing
                Logger.Error(e.ToString());
                OsEvent.Emit(replyMsgName, e);
            }
        }

        /// <summary>
        /// Get a list of databases using the given connection string.
        /// </summary>
        /// <param name="args">Expects:
        /// [0] The connection string.
        /// </param>
        /// <remarks>
        /// Emits event: database-list
        /// Event params:
        /// [0] <see cref="Exception"/> if any.
        /// [1] An array of databases.
        /// </remarks>
        private void GetDatabases(object[] args)
        {
            var replyMsgName = "database-list";

            if (args == null || args.Length != 1 || string.IsNullOrWhiteSpace(args[0] as string))
            {
                OsEvent.Emit(replyMsgName, new ArgumentNullException("connectionString"));
                return;
            }

            var connStr = args[0] as string;

            try
            {
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
                            OsEvent.Emit(replyMsgName, null, ConvertToExpando(reader));
                        }
                    }
                }
            }
            catch (Exception e)
            {
                OsEvent.Emit(replyMsgName, e);
            }
        }

        /// <summary>
        /// Execute the sql commands(s);
        /// </summary>
        /// <param name="args">Expects:
        /// [0] The connection string
        /// [1] The list of databases
        /// [2] The sql to execute
        /// [3] A batch id.
        /// </param>
        /// <remarks>
        /// Emits event: sql-exe-complete
        /// Event params:
        /// [0] <see cref="Exception"/> if any.
        /// [1] The sql execute batch id
        ///
        /// Emits event: sql-exe-begin
        /// Event params:
        /// [0] <see cref="Exception"/> if any.
        /// [1] The sql execute batch id
        /// [2] The number of databases.
        /// </remarks>
        private void ExecuteSql(object[] args)
        {
            var replyMsgName = "sql-exe-complete";
            if (args == null || args.Length != 4)
            {
                OsEvent.Emit(replyMsgName, new ArgumentException("Invalid arguments"));
                return;
            }

            var connStr = args[0] as string;
            var dbs = (args[1] as List<object>).OfType<string>();
            var sql = args[2] as string;
            var id = args[3] as string;

            try
            {
                var dbCt = dbs.Count();

                if (!string.IsNullOrWhiteSpace(connStr) &&
                    dbCt > 0 &&
                    !string.IsNullOrWhiteSpace(sql) &&
                    !string.IsNullOrWhiteSpace(id))
                {
                    OsEvent.Emit("sql-exe-begin", null, id, dbCt);

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
                OsEvent.Emit(replyMsgName, null, id);
            }
            catch (Exception e)
            {
                OsEvent.Emit(replyMsgName, e, id);
            }
        }

        /// <summary>
        /// Get the logger settings for the UI. This is used to sync the configurations for the settings dialog.
        /// </summary>
        /// <param name="args">Ignored</param>
        /// <remarks>
        /// Emits event: log-settings
        /// Event params:
        /// [0] Always null
        /// [1] The log settings
        /// </remarks>
        private void GetLogSettings(object[] args)
        {
            var replyMsgName = "log-settings";

            OsEvent.Emit(replyMsgName, null, new
            {
                enabled = Logger.Browser != null,
                debug = (Logger.Level & Logger.LogLevel.Debug) != Logger.LogLevel.None,
                info = (Logger.Level & Logger.LogLevel.Info) != Logger.LogLevel.None,
                warn = (Logger.Level & Logger.LogLevel.Warn) != Logger.LogLevel.None,
                error = (Logger.Level & Logger.LogLevel.Error) != Logger.LogLevel.None
            });
        }

        /// <summary>
        /// Set the settings configured in the UI to the native logger.
        /// </summary>
        /// <param name="args">Expects:
        /// [0] An object of logger settings
        /// </param>
        /// <remarks>
        /// Emits event: log-settings-saved
        /// Event params:
        /// [0] <see cref="Exception"/> if any.
        /// </remarks>
        private void SetLogSettings(object[] args)
        {
            var replyMsgName = "log-settings-saved";

            if (args == null && args.Length != 1)
            {
                OsEvent.Emit(replyMsgName, new ArgumentNullException("logSettings"));
                return;
            }
            var settings = args[0] as dynamic;

            if (settings != null)
            {
                if (settings.enabled)
                {
                    Logger.Browser = _browser;
                }
                else
                {
                    Logger.Browser = null;
                }

                Logger.Level = Logger.LogLevel.None;
                if (settings.debug) Logger.Level = Logger.Level | Logger.LogLevel.Debug;
                if (settings.info) Logger.Level = Logger.Level | Logger.LogLevel.Info;
                if (settings.warn) Logger.Level = Logger.Level | Logger.LogLevel.Warn;
                if (settings.error) Logger.Level = Logger.Level | Logger.LogLevel.Error;

                OsEvent.Emit(replyMsgName);
            }
        }

        /// <summary>
        /// Executes each sql batch and emits the results.
        /// </summary>
        /// <param name="connectionString">The connection string.</param>
        /// <param name="db">The database list.</param>
        /// <param name="batches">A list of sql batches</param>
        /// <param name="id">The entire batch id</param>
        /// <returns>A task representing the asynchronous operation.</returns>
        /// <remarks>
        /// Emits event: sql-exe-db-begin
        /// Emits event: sql-exe-db-complete
        /// Event params:
        /// [0] <see cref="Exception"/> if any.
        /// [1] The sql execute batch id
        /// [2] The database name
        /// [3] The number of batches
        ///
        /// Emits event: sql-exe-db-batch-begin
        /// Event params:
        /// [0] <see cref="Exception"/> if any.
        /// [1] The sql execute batch id
        /// [2] The database name.
        /// [3] The number of batches.
        ///
        /// Emits event: sql-exe-db-batch-connecting
        /// Emits event: sql-exe-db-batch-executing
        /// Emits event: sql-exe-db-batch-complete
        /// Event params:
        /// [0] <see cref="Exception"/> if any.
        /// [1] The sql execute batch id
        /// [2] The database name.
        /// [3] The batch number.
        ///
        /// Emits event: sql-exe-db-batch-result
        /// Event params:
        /// [0] <see cref="Exception"/> if any.
        /// [1] The sql execute batch id
        /// [2] The database name.
        /// [3] The batch number.
        /// [4] The resultset.
        /// </remarks>
        internal async Task ExecuteSqlBatches(string connectionString, string db, IEnumerable<string> batches, string id)
        {
            OsEvent.Emit("sql-exe-db-begin", null, id, db);
            Logger.Debug($"Begin batches for {db}");

            batches = batches.Where(b => !string.IsNullOrWhiteSpace(b));

            var batchCt = batches.Count();
            var batchNum = 0;

            OsEvent.Emit("sql-exe-db-batch-begin", null, id, db, batchNum);

            try
            {
                using (var conn = new SqlConnection(connectionString))
                {
                    OsEvent.Emit("sql-exe-db-batch-connecting", null, id, db, batchNum);
                    Logger.Debug($"Connecting to {connectionString}");
                    await conn.OpenAsync();

                    using (var cmd = conn.CreateCommand())
                    {
                        cmd.CommandType = CommandType.Text;

                        foreach (var batch in batches)
                        {
                            cmd.CommandText = batch;

                            OsEvent.Emit("sql-exe-db-batch-executing", null, id, db, batchNum);
                            Logger.Debug($"Executing to {connectionString}");

                            try
                            {
                                using (var reader = await cmd.ExecuteReaderAsync())
                                {
                                    do
                                    {
                                        OsEvent.Emit("sql-exe-db-batch-result", null, id, db, batchNum, ConvertToResultset(reader));
                                    } while (reader.NextResult());
                                }
                            }
                            catch (Exception e)
                            {
                                OsEvent.Emit("sql-exe-db-batch-result", e, id, db, batchNum);
                                Logger.Error(e.ToString());
                            }

                            OsEvent.Emit("sql-exec-db-batch-complete", null, id, db, batchNum);
                            Logger.Debug($"Completed batch {id} for {db}");

                            batchNum++;
                        }
                    }
                }

                OsEvent.Emit("sql-exe-db-complete", null, id, db, batchCt);
                Logger.Debug($"Completed batches {id} for {db}");
            }
            catch (Exception e)
            {
                OsEvent.Emit("sql-exe-db-complete", e, id, db, batchCt);
                Logger.Debug($"Completed batches {id} for {db}");
            }
        }

        /// <summary>
        /// Converts the DataReader instance into a list of objects.
        /// </summary>
        /// <param name="reader">The data reader</param>
        /// <returns>The list of objects.</returns>
        internal IEnumerable<dynamic> ConvertToExpando(IDataReader reader)
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

        /// <summary>
        /// Converts the DataReader instance into a list of objects arrays.
        /// </summary>
        /// <param name="reader">The data reader</param>
        /// <returns>The list of objects arrays.</returns>
        /// <remarks>The first row contains the column names.</remarks>
        internal IEnumerable<object[]> ConvertToResultset(IDataReader reader)
        {
            var count = reader.FieldCount;
            var i = 0;

            var columnNames = new object[count];
            for (; i < count; i++)
            {
                columnNames[i] = reader.GetName(i);
            }

            // Return header
            yield return columnNames;

            while (reader.Read())
            {
                var row = new object[count];

                for (i = 0; i < count; i++) row[i] = reader[i];

                yield return row;
            }
        }

        /// <summary>
        /// Break the SQL into batches that are delimited by GO.
        /// </summary>
        /// <param name="sql">The original SQL from the editor.</param>
        /// <returns>An iterator that returns each SQL batch.</returns>
        internal IEnumerable<string> GetSqlBatches(string sql)
        {
            if (string.IsNullOrWhiteSpace(sql)) yield break;

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

        /// <summary>
        /// Encrypts the clearText.
        /// </summary>
        /// <param name="clearText">The clear text to encrypt.</param>
        /// <returns>The cipher text.</returns>
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
                .TrimEnd(_padding).Replace('+', '-').Replace('/', '_');
        }

        /// <summary>
        /// Decrypts the cipher text.
        /// </summary>
        /// <param name="cipher">The cipher text to decrypt.</param>
        /// <returns>The descrypted clear text.</returns>
        internal static string Decrypt(string cipher)
        {
            cipher = cipher
                .Replace('_', '/').Replace('-', '+');
            switch (cipher.Length % 4)
            {
                case 2:
                    cipher += "==";
                    break;

                case 3:
                    cipher += "=";
                    break;
            }
            var bytes = Convert.FromBase64String(cipher);
            var salt = new byte[32];
            var tmpCipher = new byte[bytes.Length - 32];

            Buffer.BlockCopy(bytes, 0, salt, 0, 32);
            Buffer.BlockCopy(bytes, 32, tmpCipher, 0, tmpCipher.Length);

            return Encoding.UTF8.GetString(ProtectedData.Unprotect(tmpCipher, salt, DataProtectionScope.CurrentUser));
        }

        /// <summary>
        /// Tries to decrypt the cipher text. If the decryption fails, then return the original cipher.
        /// </summary>
        /// <param name="cipher">The cipher to decrypt.</param>
        /// <returns>The decrypted cipher if decryption is successful, otherwise the original cipher.</returns>
        internal static string TryDecrypt(string cipher)
        {
            try
            {
                return Decrypt(cipher);
            }
            catch (Exception e)
            {
                Logger.Error(e.ToString());
                return cipher;
            }
        }
    }

    /// <summary>
    /// Container for version numbers.
    /// </summary>
    internal class Versions
    {
        /// <summary>
        /// This application version.
        /// </summary>
        public string App { get; set; } = "Unknown";

        /// <summary>
        /// The CEF dependency version.
        /// </summary>
        public string Cef { get; set; } = "Unknown";
    }
}