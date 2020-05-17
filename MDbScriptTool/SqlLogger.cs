using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Tokafew420.MDbScriptTool.Logging;

namespace Tokafew420.MDbScriptTool
{
    /// <summary>
    /// A SQL logging class.
    /// </summary>
    public static class SqlLogger
    {
        private static readonly Regex _passwordRegex = new Regex("Password=[^;]*(;|$)", RegexOptions.IgnoreCase | RegexOptions.Compiled);

        /// <summary>
        /// Get or set whether SQL logging is enabled.
        /// </summary>
        public static bool Enabled { get; set; } = true;

        /// <summary>
        /// Get or set the directory where the log files are saved.
        /// </summary>
        public static string Directory { get; set; }

        /// <summary>
        /// Get the log file name.
        /// </summary>
        public static string Filename => $"execute-history-{DateTime.Now.ToString("yyyyMMdd", CultureInfo.CurrentCulture)}.sql";

        /// <summary>
        /// Get or set the number of log files to retain.
        /// </summary>
        public static int? Retention { get; set; } = 10;

        /// <summary>
        /// Log the sql being executed.
        /// </summary>
        /// <param name="connectionString">The connection string</param>
        /// <param name="dbs">The list of databases being executed against</param>
        /// <param name="sql">The SQL being executed.</param>
        public static void Log(string connectionString, IEnumerable<string> dbs, string sql)
        {
            if (Enabled)
            {
                try
                {
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
        /// Initializes the logger
        /// </summary>
        /// <returns></returns>
        public static Task InitialilzeAsync()
        {
            // Run cleanup based on the retention value
            if (Retention.HasValue)
            {
                return Task.Run(() =>
                {
                    try
                    {
                        var dir = string.IsNullOrWhiteSpace(Directory) ? Environment.CurrentDirectory : Directory;
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