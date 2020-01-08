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
using CefSharp.WinForms;
using Microsoft.SqlServer.Types;

namespace Tokafew420.MDbScriptTool
{
    internal class AppHandlers
    {
        private readonly Application _app;
        private readonly ChromiumWebBrowser _browser;
        private readonly Regex _goRegex = new Regex(@"^\s*go\s*(--.*)*$", RegexOptions.IgnoreCase);
        private static readonly Random _rnd = new Random();
        private static readonly char[] _padding = { '=' };

        public OsEvent OsEvent { get; set; }
        public UiEvent UiEvent { get; set; }

        /// <summary>
        /// Initializes a new instance of App
        /// </summary>
        /// <param name="application"></param>
        /// <param name="browser"></param>
        internal AppHandlers(Application application, ChromiumWebBrowser browser)
        {
            _app = application ?? throw new ArgumentNullException(nameof(application));
            _browser = browser ?? throw new ArgumentNullException(nameof(browser));
            OsEvent = new OsEvent(browser);
            UiEvent = new UiEvent(browser);

            // Register event handlers
            UiEvent.On("parse-connection-string", ParseConnectionString);
            UiEvent.On("encrypt-password", EncryptPassword);
            UiEvent.On("fetch-connection-dbs", GetDatabases);
            UiEvent.On("execute-sql", ExecuteSql);
            UiEvent.On("parse-sql", ParseSql);
            UiEvent.On("get-versions", GetVersions);
            UiEvent.On("get-settings", GetSettings);
            UiEvent.On("set-settings", SetSettings);
            UiEvent.On("open-explorer", OpenExplorer);
            UiEvent.On("list-directory", ListDirectory);
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

                versions.Cef = _browser.ProductVersion;

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
        /// Emits event: password-encrypted
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
        /// Emits event: connection-dbs-fetched
        /// Event params:
        /// [0] <see cref="Exception"/> if any.
        /// [1] An array of databases.
        /// </remarks>
        private void GetDatabases(object[] args)
        {
            var replyMsgName = "connection-dbs-fetched";

            var connStr = args.Length > 0 ? args[0] as string : "";
            var connId = args.Length > 1 ? args[1] as string : "";

            if (string.IsNullOrWhiteSpace(connStr))
            {
                OsEvent.Emit(replyMsgName, new ArgumentNullException("connectionString"), connId);
                return;
            }

            try
            {
                var sql = "SELECT * FROM sys.databases";
                var builder = new SqlConnectionStringBuilder(connStr);
                var targetDatabase = builder.InitialCatalog;
                builder.InitialCatalog = "master";

                if (!string.IsNullOrWhiteSpace(builder.Password))
                {
                    builder.Password = TryDecrypt(builder.Password);
                }

                try
                {
                    // Try connecting to master first
                    using (var conn = new SqlConnection(builder.ToString()))
                    {
                        conn.Open();
                        using (var cmd = conn.CreateCommand())
                        {
                            cmd.CommandType = CommandType.Text;
                            cmd.CommandText = sql;

                            using (var reader = cmd.ExecuteReader())
                            {
                                OsEvent.Emit(replyMsgName, null, ConvertToExpando(reader), connId);
                            }
                        }
                    }
                }
                catch (Exception)
                {
                    if (!string.IsNullOrWhiteSpace(targetDatabase) && !targetDatabase.Equals("master", StringComparison.OrdinalIgnoreCase))
                    {
                        // If a different database was specified then try connecting to that single database
                        builder.InitialCatalog = targetDatabase;

                        using (var conn = new SqlConnection(builder.ToString()))
                        {
                            conn.Open();
                            using (var cmd = conn.CreateCommand())
                            {
                                cmd.CommandType = CommandType.Text;
                                cmd.CommandText = sql;

                                using (var reader = cmd.ExecuteReader())
                                {
                                    OsEvent.Emit(replyMsgName, null, ConvertToExpando(reader), connId);
                                }
                            }
                        }
                    }
                    else
                    {
                        throw;
                    }
                }
            }
            catch (Exception e)
            {
                OsEvent.Emit(replyMsgName, e, connId);
            }
        }

        /// <summary>
        /// Execute the sql commands(s)
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
        private async void ExecuteSql(object[] args)
        {
            var replyMsgName = "sql-exe-complete";
            if (args == null || args.Length < 4)
            {
                OsEvent.Emit(replyMsgName, new ArgumentException("Invalid arguments"));
                return;
            }

            var connStr = args[0] as string;
            var dbs = (args[1] as List<object>).OfType<string>();
            var sql = args[2] as string;
            var id = args[3] as string;

            dynamic opts = null;
            if (args.Length == 5)
            {
                opts = args[4] as dynamic;
            }

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
                    if (!string.IsNullOrWhiteSpace(builder.Password))
                    {
                        builder.Password = TryDecrypt(builder.Password);
                    }

                    SqlLogger.Log(builder.ToString(), dbs, sql);

                    var tasks = new List<Task>();

                    foreach (var db in dbs)
                    {
                        if (!string.IsNullOrWhiteSpace(db))
                        {
                            builder.InitialCatalog = db;
#pragma warning disable CS4014 // Because this call is not awaited, execution of the current method continues before the call is completed
                            tasks.Add(ExecuteSqlBatches(builder.ToString(), db, batches, id, opts));
#pragma warning restore CS4014 // Because this call is not awaited, execution of the current method continues before the call is completed
                        }
                    }

                    await Task.WhenAll(tasks);
                }
                OsEvent.Emit(replyMsgName, null, id);
            }
            catch (Exception e)
            {
                OsEvent.Emit(replyMsgName, e, id);
            }
        }

        /// <summary>
        /// Parse the sql.
        /// </summary>
        /// <param name="args">Expects:
        /// [0] The connection string
        /// [1] The sql to execute
        /// [2] A batch id.
        /// </param>
        /// <remarks>
        /// Emits event: sql-parse-complete
        /// Event params:
        /// [0] <see cref="Exception"/> if any.
        /// [1] The sql execute batch id
        /// [2] A list of parse errors if any.
        /// </remarks>
        private async void ParseSql(object[] args)
        {
            var replyMsgName = "sql-parse-complete";
            if (args == null || args.Length != 3)
            {
                OsEvent.Emit(replyMsgName, new ArgumentException("Invalid arguments"));
                return;
            }

            var connStr = args[0] as string;
            var sql = args[1] as string;
            var id = args[2] as string;

            try
            {
                var errors = new List<SqlError>();
                var handler = new SqlInfoMessageEventHandler((object sender, SqlInfoMessageEventArgs evt) =>
                {
                    //ensure that all errors are caught
                    var errs = new SqlError[evt.Errors.Count];
                    evt.Errors.CopyTo(errs, 0);
                    errors.AddRange(errs);
                });

                if (!string.IsNullOrWhiteSpace(connStr) &&
                    !string.IsNullOrWhiteSpace(sql) &&
                    !string.IsNullOrWhiteSpace(id))
                {
                    OsEvent.Emit("sql-parse-begin", null, id);

                    var batches = GetSqlBatches(sql);
                    var builder = new SqlConnectionStringBuilder(connStr);

                    if (string.IsNullOrWhiteSpace(builder.InitialCatalog))
                    {
                        builder.InitialCatalog = "master";
                    }
                    if (!string.IsNullOrWhiteSpace(builder.Password))
                    {
                        builder.Password = TryDecrypt(builder.Password);
                    }
                    connStr = builder.ToString();

                    using (var conn = new SqlConnection(connStr))
                    {
                        try
                        {
                            conn.FireInfoMessageEventOnUserErrors = true;
                            conn.InfoMessage += handler;

                            OsEvent.Emit("sql-parse-connecting", null, id);
                            Logger.Debug($"Connecting to {connStr}");

                            await conn.OpenAsync();

                            using (var cmd = conn.CreateCommand())
                            {
                                cmd.CommandType = CommandType.Text;
                                cmd.CommandText = "SET PARSEONLY ON";
                                await cmd.ExecuteNonQueryAsync();

                                OsEvent.Emit("sql-parse-parsing", null, id);
                                foreach (var batch in batches)
                                {
                                    if (!string.IsNullOrWhiteSpace(batch))
                                    {
                                        cmd.CommandText = batch;
                                        var result = await cmd.ExecuteNonQueryAsync();
                                    }
                                }

                                cmd.CommandText = "SET PARSEONLY OFF";
                                await cmd.ExecuteNonQueryAsync();
                            }
                        }
                        finally
                        {
                            conn.FireInfoMessageEventOnUserErrors = false;
                            conn.InfoMessage -= handler;
                        }
                    }
                }

                OsEvent.Emit(replyMsgName, null, id, errors);
            }
            catch (Exception e)
            {
                OsEvent.Emit(replyMsgName, e, id, null);
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
        private void GetSettings(object[] args)
        {
            var replyMsgName = "settings";

            OsEvent.Emit(replyMsgName, null, new
            {
                logging = new
                {
                    enabled = Logger.Browser != null,
                    debug = (Logger.Level & Logger.LogLevel.Debug) != Logger.LogLevel.None,
                    info = (Logger.Level & Logger.LogLevel.Info) != Logger.LogLevel.None,
                    warn = (Logger.Level & Logger.LogLevel.Warn) != Logger.LogLevel.None,
                    error = (Logger.Level & Logger.LogLevel.Error) != Logger.LogLevel.None
                },
                sqlLogging = new
                {
                    enabled = SqlLogger.Enabled,
                    directory = SqlLogger.Directory,
                    retention = SqlLogger.Retention
                },
                scriptLibrary = new
                {
                    directory = _app.ScriptLibraryDirectory
                }
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
        private void SetSettings(object[] args)
        {
            var replyMsgName = "settings-saved";

            if (args == null && args.Length != 1)
            {
                OsEvent.Emit(replyMsgName, new ArgumentNullException("logSettings"));
                return;
            }
            var settings = args[0] as dynamic;

            if (settings != null)
            {
                if (settings.logging != null)
                {
                    if (settings.logging.enabled)
                    {
                        Logger.Browser = _browser;
                    }
                    else
                    {
                        Logger.Browser = null;
                    }

                    Logger.Level = Logger.LogLevel.None;
                    if (settings.logging.debug) Logger.Level |= Logger.LogLevel.Debug;
                    if (settings.logging.info) Logger.Level |= Logger.LogLevel.Info;
                    if (settings.logging.warn) Logger.Level |= Logger.LogLevel.Warn;
                    if (settings.logging.error) Logger.Level |= Logger.LogLevel.Error;
                }

                if (settings.sqlLogging != null)
                {
                    SqlLogger.Enabled = settings.sqlLogging.enabled;
                    SqlLogger.Directory = settings.sqlLogging.directory;
                    SqlLogger.Retention = settings.sqlLogging.retention;
                }

                if (settings.scriptLibrary != null)
                {
                    _app.ScriptLibraryDirectory = settings.scriptLibrary.directory;
                }

                OsEvent.Emit(replyMsgName);
            }
        }

        /// <summary>
        /// Get the windows file Explorer window.
        /// </summary>
        /// <param name="args">Expects:
        /// [0] The path to the directory or file to start in.
        /// </param>
        /// <remarks>
        /// Emits event: explorer-opened
        /// Event params:
        /// [0] <see cref="Exception"/> if any.
        /// [1] The parsed path.
        /// </remarks>
        private void OpenExplorer(object[] args)
        {
            var replyMsgName = "explorer-opened";
            var path = "";
            var explorerArgs = "";
            try
            {
                if (args != null && args.Length > 0)
                {
                    if (!string.IsNullOrWhiteSpace(path = args[0] as string))
                    {
                        path = Path.GetFullPath(path);
                        // If file, then select the file within the directory
                        if (File.Exists(path))
                        {
                            explorerArgs = "/select,\"{0}\"";
                        }
                        else if (Directory.Exists(path))
                        {
                            explorerArgs = "\"{0}\"";
                        }
                        // Maybe it's a file that's been deleted, in that case just try to open the directory
                        else if (!string.IsNullOrWhiteSpace(Path.GetExtension(path)))
                        {
                            path = Path.GetDirectoryName(path);
                            if (Directory.Exists(path))
                            {
                                explorerArgs = "\"{0}\"";
                            }
                        }
                    }
                }

                Process.Start("explorer.exe", string.Format(explorerArgs, path));
                OsEvent.Emit(replyMsgName, null, path);
            }
            catch (Exception e)
            {
                OsEvent.Emit(replyMsgName, e, path);
            }
        }

        /// <summary>
        /// List files and directories within a given path.
        /// </summary>
        /// <param name="args">Expects:
        /// [0] The path to the directory to list.
        /// </param>
        /// <remarks>
        /// Emits event: directory listed
        /// Event params:
        /// [0] <see cref="Exception"/> if any.
        /// [1] An array of file objects.
        /// </remarks>
        private void ListDirectory(object[] args)
        {
            var replyMsgName = "directory-listed";
            var entries = new List<FsFile>();
            try
            {
                if (args != null && args.Length > 0)
                {
                    string path;
                    if (!string.IsNullOrWhiteSpace(path = args[0] as string))
                    {
                        path = Path.GetFullPath(path);
                        if (!Directory.Exists(path))
                        {
                            throw new DirectoryNotFoundException();
                        }

                        foreach (var dir in Directory.EnumerateDirectories(path, "*", SearchOption.AllDirectories))
                        {
                            entries.Add(new FsFile
                            {
                                Name = Path.GetFileName(dir),
                                Path = dir,
                                Type = "directory"
                            });
                        }

                        foreach (var file in Directory.EnumerateFiles(path, "*.sql", SearchOption.AllDirectories))
                        {
                            var info = new FileInfo(file);
                            entries.Add(new FsFile
                            {
                                Name = info.Name,
                                Path = info.FullName,
                                Type = Utils.GetMimeType(info.Extension),
                                Size = info.Length,
                                LastModified = (long)Utils.ConvertToUnixTimestamp(info.LastWriteTime)
                            });
                        }

                        OsEvent.Emit(replyMsgName, null, entries);
                        return;
                    }
                }
                OsEvent.Emit(replyMsgName, new ArgumentNullException("path"));
            }
            catch (Exception e)
            {
                OsEvent.Emit(replyMsgName, e);
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
        internal async Task ExecuteSqlBatches(string connectionString, string db, IEnumerable<string> batches, string id, dynamic opts = null)
        {
            OsEvent.Emit("sql-exe-db-begin", null, id, db);
            Logger.Debug($"Begin batches for {db}");

            batches = batches.Where(b => !string.IsNullOrWhiteSpace(b));

            var stopWatch = new Stopwatch();
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
                        if (opts != null)
                        {
                            if (opts.timeout as int? >= 0)
                            {
                                cmd.CommandTimeout = opts.timeout;
                            }
                        }

                        foreach (var batch in batches)
                        {
                            cmd.CommandText = batch;

                            OsEvent.Emit("sql-exe-db-batch-executing", null, id, db, batchNum);
                            Logger.Debug($"Executing to {connectionString}");

                            try
                            {
                                stopWatch.Reset();
                                stopWatch.Start();
                                using (var reader = await cmd.ExecuteReaderAsync())
                                {
                                    stopWatch.Stop();
                                    do
                                    {
                                        OsEvent.Emit("sql-exe-db-batch-result", null, id, db, batchNum, ConvertToResultset(reader), reader.RecordsAffected, stopWatch.ElapsedMilliseconds);
                                    } while (reader.NextResult());
                                }
                            }
                            catch (Exception e)
                            {
                                stopWatch.Stop();
                                OsEvent.Emit("sql-exe-db-batch-result", e, id, db, batchNum, null, null, stopWatch.ElapsedMilliseconds);
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

            if (count > 0)
            {
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

                    for (i = 0; i < count; i++)
                    {
                        if (reader.IsDBNull(i))
                        {
                            row[i] = null;
                        }
                        else if (reader[i] is ISqlSpatialGridIndexable)
                        {
                            // Just get the string of the SqlGeography or SqlGeometry types
                            // because Json.Net can't deserialize these types
                            row[i] = reader[i].ToString();
                        }
                        else
                        {
                            row[i] = reader[i];
                        }
                    }

                    yield return row;
                }
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
        /// <returns>The decrypted clear text.</returns>
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
            if (string.IsNullOrWhiteSpace(cipher)) return cipher;

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