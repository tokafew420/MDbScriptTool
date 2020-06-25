using System;
using System.Collections.Generic;
using System.Globalization;

namespace Tokafew420.MDbScriptTool.Logging
{
    /// <summary>
    /// A logging class that write logs to the console.
    /// </summary>
    public class ConsoleLogger : ILogger
    {
        /// <summary>
        /// Initialize a new instance of logger.
        /// </summary>
        /// <param name="logLevel">The initial log level.</param>
        public ConsoleLogger(LogLevel logLevel = LogLevel.Info) => Level = logLevel;

        /// <summary>
        /// Writes a log event to the console window.
        /// </summary>
        /// <param name="logLevel">The log message severity level.</param>
        /// <param name="properties">A dictionary of properties to log.</param>
        /// <param name="message">The message to log.</param>
        /// <param name="args">Any message parameters.</param>
        public virtual void Write(LogLevel logLevel, IDictionary<string, object> properties, string message, params object[] args)
        {
            if (Level != LogLevel.None && logLevel <= Level)
            {
                if (!string.IsNullOrWhiteSpace(message))
                {
                    Console.WriteLine($"[{DateTime.UtcNow.ToString("G", CultureInfo.InvariantCulture)}] [{Level}] {message.Format(args)}");
                }
                if (properties != null)
                {
                    foreach (var prop in properties)
                    {
                        Console.WriteLine($"\t[{prop.Key}]: {prop.Value}");
                    }
                }
            }
        }

        /// <summary>
        /// Get or set the logger's log level.
        /// </summary>
        public virtual LogLevel Level { get; set; }
    }
}