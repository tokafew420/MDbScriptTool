using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;

namespace Tokafew420.MDbScriptTool.Logging
{
    /// <summary>
    /// A logging class that write logs to file.
    /// </summary>
    public class FileLogger : ILogger
    {
        /// <summary>
        /// Initialize a new instance of logger.
        /// </summary>
        /// <param name="path">The filepath of the log file.</param>
        /// <param name="logLevel">The initial log level.</param>
        public FileLogger(string path, LogLevel logLevel = LogLevel.Info)
        {
            if (string.IsNullOrWhiteSpace(path)) throw new ArgumentNullException(nameof(path));

            Path = path;
            Level = logLevel;
        }

        /// <summary>
        /// Writes a log event to a log file.
        /// </summary>
        /// <param name="logLevel">The log message severity level.</param>
        /// <param name="properties">A dictionary of properties to log.</param>
        /// <param name="message">The message to log.</param>
        /// <param name="args">Any message parameters.</param>
        public virtual void Write(LogLevel logLevel, IDictionary<string, object> properties, string message, params object[] args)
        {
            if (Level != LogLevel.None && logLevel <= Level)
            {
                var strBuilder = new StringBuilder();
                if (!string.IsNullOrWhiteSpace(message))
                {
                    strBuilder.AppendLine($"[{DateTime.UtcNow.ToString("G", CultureInfo.InvariantCulture)}] {message.Format(args)}");
                }
                if (properties != null)
                {
                    foreach (var prop in properties)
                    {
                        strBuilder.AppendLine($"\t[{prop.Key}]: {prop.Value}");
                    }
                }

                try
                {
                    var file = new FileInfo(Path);
                    file.Directory.Create();
                    File.AppendAllText(file.FullName, strBuilder.ToString());
                }
                catch
                {
                }
            }
        }

        /// <summary>
        /// Get or set the logger's log level.
        /// </summary>
        public virtual LogLevel Level { get; set; }

        /// <summary>
        /// Get or set the log file path.
        /// </summary>
        public virtual string Path { get; set; }
    }
}