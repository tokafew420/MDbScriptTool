using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Diagnostics;
using System.Dynamic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using CefSharp.WinForms;
using Microsoft.SqlServer.Types;
using Tokafew420.MDbScriptTool.Logging;

namespace Tokafew420.MDbScriptTool
{
    internal class AppHandlers
    {
        private readonly App _app;
        private readonly ChromiumWebBrowser _browser;
        private readonly Regex _goRegex = new Regex(@"^\s*go\s*(--.*)*$", RegexOptions.IgnoreCase);

        public OsEvent OsEvent { get; set; }
        public UiEvent UiEvent { get; set; }

        /// <summary>
        /// Initializes a new instance of App
        /// </summary>
        /// <param name="app"></param>
        /// <param name="browser"></param>
        internal AppHandlers(App app, ChromiumWebBrowser browser)
        {
            _app = app ?? throw new ArgumentNullException(nameof(app));
            _browser = browser ?? throw new ArgumentNullException(nameof(browser));
            OsEvent = new OsEvent(_browser);
            UiEvent = new UiEvent(_app, _browser);

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
            UiEvent.On("client-initialized", ClientInitialized);
            UiEvent.On("set-file-association", SetFileAssociation);
            UiEvent.On("remove-file-association", RemoveFileAssociation);
            UiEvent.On("add-context-menu", AddContextMenu);
            UiEvent.On("remove-context-menu", RemoveContextMenu);
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
                _app.Logger.Warn(e.ToString());
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
                var builder = new SqlConnectionStringBuilder(connStr);
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
                Crypto.Decrypt(pass);
                OsEvent.Emit(replyMsgName, null, pass);
                return;
            }
            catch (Exception e)
            {
                // Do Nothing
                _app.Logger.Error(e.ToString());
            }

            try
            {
                // Assume not encrypted
                var cipher = Crypto.Encrypt(pass);
                OsEvent.Emit(replyMsgName, null, cipher);
            }
            catch (Exception e)
            {
                // Do nothing
                _app.Logger.Error(e.ToString());
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

                if (!string.IsNullOrWhiteSpace(builder.Password) && Crypto.TryDecrypt(builder.Password, out var pass))
                {
                    builder.Password = pass;
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
                    if (!string.IsNullOrWhiteSpace(builder.Password) && Crypto.TryDecrypt(builder.Password, out var pass))
                    {
                        builder.Password = pass;
                    }

                    AppContext.SqlLogger.Log(new Dictionary<string, object> {
                        { SqlLogger.CONN_STR_KEY,  builder.ToString() },
                        { SqlLogger.DATABASES_KEY, dbs }
                    }, sql);

                    var tasks = new List<Task>();

                    foreach (var db in dbs)
                    {
                        if (!string.IsNullOrWhiteSpace(db))
                        {
                            builder.InitialCatalog = db;
                            tasks.Add(ExecuteSqlBatches(builder.ToString(), db, batches, id, opts));
                        }
                    }

                    await Task.WhenAll(tasks).ConfigureAwait(false);
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
                    if (!string.IsNullOrWhiteSpace(builder.Password) && Crypto.TryDecrypt(builder.Password, out var pass))
                    {
                        builder.Password = pass;
                    }
                    connStr = builder.ToString();

                    using (var conn = new SqlConnection(connStr))
                    {
                        try
                        {
                            conn.FireInfoMessageEventOnUserErrors = true;
                            conn.InfoMessage += handler;

                            OsEvent.Emit("sql-parse-connecting", null, id);
                            _app.Logger.Debug($"Connecting to {connStr}");

                            await conn.OpenAsync().ConfigureAwait(false);

                            using (var cmd = conn.CreateCommand())
                            {
                                cmd.CommandType = CommandType.Text;
                                cmd.CommandText = "SET PARSEONLY ON";
                                await cmd.ExecuteNonQueryAsync().ConfigureAwait(false);

                                OsEvent.Emit("sql-parse-parsing", null, id);
                                foreach (var batch in batches)
                                {
                                    if (!string.IsNullOrWhiteSpace(batch))
                                    {
#pragma warning disable CA2100 // Review SQL queries for security vulnerabilities
                                        cmd.CommandText = batch;
#pragma warning restore CA2100 // Review SQL queries for security vulnerabilities
                                        var result = await cmd.ExecuteNonQueryAsync().ConfigureAwait(false);
                                    }
                                }

                                cmd.CommandText = "SET PARSEONLY OFF";
                                await cmd.ExecuteNonQueryAsync().ConfigureAwait(false);
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
        internal void GetSettings(object[] args)
        {
            var replyMsgName = "settings";

            OsEvent.Emit(replyMsgName, null, new
            {
                appId = _app.Id,
                singleInstance = AppContext.SingleInstance,
                isMainForm = _app.IsMainForm,
                isStartup = _app.IsStartup,
                logging = new
                {
                    logToDevConsole = _app.LogToDevConsole,
                    logLevel = _app.Logger.Level.ToString()
                },
                sqlLogging = new
                {
                    enabled = AppContext.SqlLogger.Enabled,
                    directory = AppContext.SqlLogger.Directory,
                    retention = AppContext.SqlLogger.Retention
                },
                scriptLibrary = AppSettings.GetOrDefault(Constants.Settings.ScriptLibraryDirectory, Path.GetFullPath(Path.Combine(AppContext.DataDirectory, Constants.Defaults.ScriptLibraryDirectory))),
                addOnJs = AppSettings.GetOrDefault(Constants.Settings.AddOnJs, ""),
                addOnCss = AppSettings.GetOrDefault(Constants.Settings.AddOnCss, "")
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
                AppContext.SingleInstance = (settings.singleInstance as bool?).GetValueOrDefault(AppContext.SingleInstance);

                if (settings.logging != null)
                {
                    _app.LogToDevConsole = settings.logging.logToDevConsole;
                    if (Enum.TryParse<LogLevel>(settings.logging.logLevel, true, out LogLevel logLevel))
                    {
                        _app.Logger.Level = logLevel;
                    }
                }

                if (settings.sqlLogging != null)
                {
                    AppContext.SqlLogger.Enabled = settings.sqlLogging.enabled == true;
                    AppContext.SqlLogger.Retention = settings.sqlLogging.retention;
                    AppContext.SqlLogger.Directory = settings.sqlLogging.directory;
                }

                AppSettings.Set(Constants.Settings.ScriptLibraryDirectory, settings.scriptLibrary as string ?? "");
                AppSettings.Set(Constants.Settings.AddOnJs, settings.addOnJs as string ?? "");
                AppSettings.Set(Constants.Settings.AddOnCss, settings.addOnCss as string ?? "");

                OsEvent.Emit(replyMsgName);
                AppSettings.Save(_app);
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

                _ = Process.Start("explorer.exe", string.Format(CultureInfo.InvariantCulture, explorerArgs, path));
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
        /// Sets the file association for .sql files to this application.
        /// </summary>
        /// <param name="args">Ignored</param>
        /// <remarks>
        /// Emits event: file-association-set
        /// Event params:
        /// [0] <see cref="Exception"/> if any.
        /// [1] A message indicating the status of the operation.
        /// </remarks>
        private void SetFileAssociation(object[] args)
        {
            var replyMsgName = "file-association-set";

            try
            {
                // Use CodeBase instead of Location property because location property may not be the pyhsical path
                // in some cases (ie: shadow copy)
                var exePath = Assembly.GetExecutingAssembly().CodeBase
                    .Replace("file:///", "")
                    .Replace("/", @"\");

                // Note: Using HKEY_CURRENT_USER because HKEY_LOCAL_MACHINE requires admin permissions

                // Set the file association icon
                Utils.SetRegistryKey($@"HKEY_CURRENT_USER\Software\Classes\{Constants.App.ProgId}\DefaultIcon", "", $@"""{exePath}"",0");
                // Set the open cmdline
                Utils.SetRegistryKey($@"HKEY_CURRENT_USER\Software\Classes\{Constants.App.ProgId}\shell\open\command", "", $@"""{exePath}"" ""%1""");
                // Set extension to program id
                var existingAssoc = Utils.SetRegistryKey(@"HKEY_CURRENT_USER\Software\Classes\.sql", "", Constants.App.ProgId) as string;

                // In windows 8+, windows doesn't allow programmatic setting of file associations. This is done via a secret hash at
                // HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.sql\UserChoice
                // Although we can set the ProdId, we cannot calculate the hash.
                // So instead of jumping through hoops, we will add an entry to the OpenWWith options
                Utils.SetRegistryKey(@"HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.sql\OpenWithProgids", Constants.App.ProgId, "");

                if (existingAssoc != Constants.App.ProgId)
                {
                    Native.NativeMethods.SHChangeNotify(Native.HChangeNotifyEventID.SHCNE_ASSOCCHANGED, Native.SHChangeNotifyFlags.SHCNF_FLUSH, IntPtr.Zero, IntPtr.Zero);

                    // Save this off so we can restore it later (if needed)
                    if (!string.IsNullOrWhiteSpace(existingAssoc))
                    {
                        AppSettings.Set(Constants.Settings.PreviousFileAssociation, existingAssoc);
                        AppSettings.Save();
                    }
                }

                OsEvent.Emit(replyMsgName, null, "File association set.");
            }
            catch (Exception e)
            {
                OsEvent.Emit(replyMsgName, e, e.Message);
            }
        }

        /// <summary>
        /// Remove the file association for .sql files from this application.
        /// </summary>
        /// <param name="args">Ignored</param>
        /// <remarks>
        /// Emits event: file-association-removed
        /// Event params:
        /// [0] <see cref="Exception"/> if any.
        /// [1] A message indicating the status of the operation.
        /// </remarks>
        private void RemoveFileAssociation(object[] args)
        {
            var replyMsgName = "file-association-removed";

            try
            {
                Utils.SetRegistryKey($@"HKEY_CURRENT_USER\Software\Classes\{Constants.App.ProgId}", null, null);
                Utils.SetRegistryKey(@"HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.sql\OpenWithProgids", Constants.App.ProgId, null);

                // Restore previous association if any
                var previousAssoc = AppSettings.Get<string>(Constants.Settings.PreviousFileAssociation)?.Trim() ?? "";
                Utils.SetRegistryKey(@"HKEY_CURRENT_USER\Software\Classes\.sql", "", previousAssoc);

                Native.NativeMethods.SHChangeNotify(Native.HChangeNotifyEventID.SHCNE_ASSOCCHANGED, Native.SHChangeNotifyFlags.SHCNF_FLUSH, IntPtr.Zero, IntPtr.Zero);

                // Save this off so we can restore it later (if needed)
                if (!string.IsNullOrWhiteSpace(previousAssoc))
                {
                    AppSettings.Set(Constants.Settings.PreviousFileAssociation, "");
                    AppSettings.Save();
                }

                OsEvent.Emit(replyMsgName, null, "File association removed.");
            }
            catch (Exception e)
            {
                OsEvent.Emit(replyMsgName, e, e.Message);
            }
        }

        /// <summary>
        /// Adds a Windows context menu (for all files) for this application.
        /// </summary>
        /// <param name="args">Ignored</param>
        /// <remarks>
        /// Emits event: context-menu-added
        /// Event params:
        /// [0] <see cref="Exception"/> if any.
        /// [1] A message indicating the status of the operation.
        /// </remarks>
        private void AddContextMenu(object[] args)
        {
            var replyMsgName = "context-menu-added";

            try
            {
                // Use CodeBase instead of Location property because location property may not be the pyhsical path
                // in some cases (ie: shadow copy)
                var exePath = Assembly.GetExecutingAssembly().CodeBase
                    .Replace("file:///", "")
                    .Replace("/", @"\");

                // Note: Using HKEY_CURRENT_USER because HKEY_LOCAL_MACHINE requires admin permissions
                // Set context menu text
                Utils.SetRegistryKey($@"HKEY_CURRENT_USER\Software\Classes\*\shell\{Constants.App.ProgId}", "", $@"Open with {Constants.App.Name}");
                // Set context menu icon
                Utils.SetRegistryKey($@"HKEY_CURRENT_USER\Software\Classes\*\shell\{Constants.App.ProgId}", "Icon", $@"""{exePath}"",0");
                // Set context menu command
                Utils.SetRegistryKey($@"HKEY_CURRENT_USER\Software\Classes\*\shell\{Constants.App.ProgId}\command", "", $@"""{exePath}"" ""%1""");

                OsEvent.Emit(replyMsgName, null, "Context menu added.");
            }
            catch (Exception e)
            {
                OsEvent.Emit(replyMsgName, e, e.Message);
            }
        }

        /// <summary>
        /// Remove the Windows context menu (for all files) for this application.
        /// </summary>
        /// <param name="args">Ignored</param>
        /// <remarks>
        /// Emits event: context-menu-removed
        /// Event params:
        /// [0] <see cref="Exception"/> if any.
        /// [1] A message indicating the status of the operation.
        /// </remarks>
        private void RemoveContextMenu(object[] args)
        {
            var replyMsgName = "context-menu-removed";

            try
            {
                Utils.SetRegistryKey($@"HKEY_CURRENT_USER\Software\Classes\*\shell\{Constants.App.ProgId}", null, null);

                OsEvent.Emit(replyMsgName, null, "File association removed.");
            }
            catch (Exception e)
            {
                OsEvent.Emit(replyMsgName, e, e.Message);
            }
        }

        /// <summary>
        /// Called from client to notify server that the client is initialized.
        /// </summary>
        /// <param name="args">Ignored</param>
        private void ClientInitialized(object[] args) => _app.IsClientInitialized = true;

        /// <summary>
        /// Sends a message to the client telling it to open the specified file.
        /// </summary>
        /// <param name="path">The file path to open.</param>
        internal void InitiateOpenFile(string path)
        {
            if (!string.IsNullOrWhiteSpace(path))
            {
                var emitMsgName = "open-file";
                var name = Path.GetFileName(path);

                OsEvent.Emit(emitMsgName, name, path);
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
            _app.Logger.Debug($"Begin batches for {db}");

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
                    _app.Logger.Debug($"Connecting to {connectionString}");
                    await conn.OpenAsync().ConfigureAwait(false);

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
#pragma warning disable CA2100 // Review SQL queries for security vulnerabilities
                            cmd.CommandText = batch;
#pragma warning restore CA2100 // Review SQL queries for security vulnerabilities

                            OsEvent.Emit("sql-exe-db-batch-executing", null, id, db, batchNum);
                            _app.Logger.Debug($"Executing to {connectionString}");

                            try
                            {
                                stopWatch.Reset();
                                stopWatch.Start();
                                using (var reader = await cmd.ExecuteReaderAsync().ConfigureAwait(false))
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
                                _app.Logger.Error(e.ToString());
                            }

                            OsEvent.Emit("sql-exec-db-batch-complete", null, id, db, batchNum);
                            _app.Logger.Debug($"Completed batch {id} for {db}");

                            batchNum++;
                        }
                    }
                }

                OsEvent.Emit("sql-exe-db-complete", null, id, db, batchCt);
                _app.Logger.Debug($"Completed batches {id} for {db}");
            }
            catch (Exception e)
            {
                OsEvent.Emit("sql-exe-db-complete", e, id, db, batchCt);
                _app.Logger.Debug($"Completed batches {id} for {db}");
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