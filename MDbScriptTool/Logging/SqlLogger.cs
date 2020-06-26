using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace Tokafew420.MDbScriptTool.Logging
{
    /// <summary>
    /// A SQL logging class.
    /// </summary>
    public class SqlLogger : ILogger
    {
        public const string CONN_STR_KEY = "ConnectionString";
        public const string DATABASES_KEY = "Databases";

        private string _directory = "";
        private LogLevel _level;
        private int? _retention = 10;
        private readonly Regex _passwordRegex = new Regex("Password=[^;]*(;|$)", RegexOptions.IgnoreCase | RegexOptions.Compiled);

        public SqlLogger(string directory, int? retention = 10, LogLevel logLevel = LogLevel.None)
        {
            _directory = directory;
            _retention = retention;
            _level = logLevel;

            InitialilzeAsync();
        }

        /// <summary>
        /// Log the sql being executed.
        /// </summary>
        /// <param name="logLevel">The log message severity level.</param>
        /// <param name="properties">A dictionary of properties. Shold contain the connection and list of databases.</param>
        /// <param name="sql">The SQL being executed.</param>
        /// <param name="args">Ignored</param>
        public virtual void Write(LogLevel logLevel, IDictionary<string, object> properties, string sql, params object[] args)
        {
            if (Level != LogLevel.None && logLevel <= Level)
            {
                try
                {
                    var connectionString = "";
                    IEnumerable<string> dbs = new List<string>();

                    if (properties != null)
                    {
                        connectionString = properties.TryGetValue(CONN_STR_KEY, out var tmp) ? tmp as string : "";
                        dbs = properties.TryGetValue(DATABASES_KEY, out tmp) ? tmp as IEnumerable<string> : dbs;
                    }

                    var file = new FileInfo(Path.Combine(Directory, Filename));
                    file.Directory.Create();
                    File.AppendAllText(file.FullName, $@"
---------------------------------------------------------------------------------------
-- DateTime:   {DateTime.Now.ToString("MM/dd/yyyy hh:mm:ss", CultureInfo.CurrentCulture)}
-- Connection: {_passwordRegex.Replace(connectionString, "Password=*****;")}
-- Databases:  {string.Join(", ", dbs)}
---------------------------------------------------------------------------------------
{sql}
");
                }
                catch (Exception e)
                {
                    AppContext.Logger.Error(e.ToString());
                }
            }
        }

        /// <summary>
        /// Get or set the logger's log level.
        /// </summary>
        /// <remarks>LogLevel is used as a binary flag here. LogLevel.None means don't log, any other value will enable logs.</remarks>
        public virtual LogLevel Level
        {
            get => _level;
            set
            {
                _level = value;
                AppSettings.Set(Constants.Settings.SqlLoggingEnabled, _level != LogLevel.None);
            }
        }

        public virtual bool Enabled
        {
            get => _level != LogLevel.None;
            set
            {
                _level = value ? LogLevel.All : LogLevel.None;
                AppSettings.Set(Constants.Settings.SqlLoggingEnabled, value);
            }
        }

        /// <summary>
        /// Get or set the directory where the log files are saved.
        /// </summary>
        public string Directory
        {
            get => _directory;
            set
            {
                var doInit = _directory != value;

                _directory = value ?? "";
                AppSettings.Set(Constants.Settings.SqlLoggingDirectory, _directory);

                if (doInit) InitialilzeAsync();
            }
        }

        /// <summary>
        /// Get the log file name.
        /// </summary>
        public string Filename => $"execute-history-{DateTime.Now.ToString("yyyyMMdd", CultureInfo.CurrentCulture)}.sql";

        /// <summary>
        /// Get or set the number of log files to retain.
        /// </summary>
        public int? Retention
        {
            get => _retention;
            set
            {
                var doInit = _retention != value;

                _retention = value;
                AppSettings.Set(Constants.Settings.SqlLoggingRetention, _retention);

                if (doInit) InitialilzeAsync();
            }
        }

        /// <summary>
        /// Initializes the logger
        /// </summary>
        /// <returns></returns>
        private Task InitialilzeAsync()
        {
            // Run cleanup based on the retention value
            if (Level != LogLevel.None && Retention.HasValue)
            {
                return Task.Run(() =>
                {
                    try
                    {
                        var dir = string.IsNullOrWhiteSpace(_directory) ? Environment.CurrentDirectory : _directory;
                        var files = System.IO.Directory.EnumerateFiles(dir, "execute-history-*.sql", SearchOption.TopDirectoryOnly);

                        files = files
                            .Where(f => Path.GetFileName(f).Length == 28)   // Test the length for the file name (ie: execute-history-20190901.sql). Regex Maybe?
                            .OrderByDescending(f => Path.GetFileName(f))
                            .Skip(Retention.Value)
                            .ToList();

                        foreach (var file in files)
                        {
                            File.Delete(file);
                        }
                    }
                    catch (Exception e)
                    {
                        AppContext.Logger.Error(e.ToString());
                    }
                });
            }

            return Task.CompletedTask;
        }
    }
}