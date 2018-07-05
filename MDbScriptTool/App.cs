using CefSharp.WinForms;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Diagnostics;
using System.Dynamic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace Tokafew420.MDbScriptTool
{
    /// <summary>
    /// An example of the application class.
    /// </summary>
    internal class App
    {
        private Form _form;
        private ChromiumWebBrowser _browser;
        private SystemEvent _systemEvent;
        private ScriptEvent _scriptEvent;
        private Regex _goRegex = new Regex(@"^\s*go\s*(--.*)*$", RegexOptions.IgnoreCase);

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
            _scriptEvent.On("get-databases", GetDatabases);
            _scriptEvent.On("execute-sql", ExecuteSql);
        }

        /// <summary>
        /// Handles the "test" event.
        /// </summary>
        /// <param name="args">The event parameters.</param>
        /// <remarks>
        /// If a name was passord, then reply with "Hello {name}", otherwise reply with a message indicating no name.
        /// </remarks>
        internal void ParseConnectionString(object[] args)
        {
            Debug.WriteLine("Event received: parse-connection-string");

            if (args.Length > 3)
            {
                try
                {
                    SqlConnectionStringBuilder builder = null;
                    if (!string.IsNullOrWhiteSpace(args[0] as string))
                    {
                        try
                        {
                            builder = new SqlConnectionStringBuilder(args[0] as string);
                        }
                        catch (Exception) { }
                    }
                    if (builder == null) builder = new SqlConnectionStringBuilder();

                    if (!string.IsNullOrWhiteSpace(args[1] as string)) builder.DataSource = args[1] as string;
                    if (!string.IsNullOrWhiteSpace(args[2] as string)) builder.UserID = args[2] as string;
                    if (!string.IsNullOrWhiteSpace(args[3] as string)) builder.Password = args[3] as string;

                    _systemEvent.Emit("connection-string-parsed", null, builder.ConnectionString, builder);
                }
                catch (Exception e)
                {
                    _systemEvent.Emit("connection-string-parsed", e);
                }
            }
        }

        /// <summary>
        /// Handles the "multi-args" event.
        /// </summary>
        /// <param name="args">The event parameters.</param>
        /// <remarks>
        /// Inspects the event parameters and responsd with a message indicating the type and value of each parameter.
        /// This is a test/example of receiving/sending a message with multiple parameters.
        /// </remarks>
        internal void GetDatabases(object[] args)
        {
            var replyEventName = "database-list";

            if (args != null && args.Length == 1)
            {
                try
                {
                    var connStr = args[0] as string;
                    var builder = new SqlConnectionStringBuilder(connStr);
                    builder.InitialCatalog = "master";

                    using (var conn = new SqlConnection(builder.ToString()))
                    {
                        conn.Open();
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandType = System.Data.CommandType.Text;
                            cmd.CommandText = "SELECT * FROM sys.databases";

                            using (var reader = cmd.ExecuteReader())
                            {
                                _systemEvent.Emit(replyEventName, null, SqlDataReaderToExpando(reader));
                            }
                        }
                    }
                }
                catch (Exception e)
                {
                    _systemEvent.Emit(replyEventName, e);
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

        /// <summary>
        /// Handles the "complex-arg" event.
        /// </summary>
        /// <param name="args">The event parameters.</param>
        /// <remarks>
        /// Inspects the event parameter as a complex object and repsond with the objects properties (i.e. name, type, and value).
        /// This is a test/example of receiving/sending a message with a complex object.
        /// </remarks>
        private void ExecuteSql(object[] args)
        {
            if (args == null || args.Length != 4)
            {
                _systemEvent.Emit("sql-execute-complete", new ArgumentException("Invalid arguments"));
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
                _systemEvent.Emit("sql-execute-complete", e);
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
    }
}