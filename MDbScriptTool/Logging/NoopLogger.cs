using System.Collections.Generic;

namespace Tokafew420.MDbScriptTool.Logging
{
    /// <summary>
    /// A logging class that does nothing.
    /// </summary>
    public class NoopLogger : ILogger
    {
        /// <summary>
        /// Initialize a new instance of logger.
        /// </summary>
        /// <param name="logLevel">The initial log level.</param>
        public NoopLogger(LogLevel logLevel = LogLevel.Info) => Level = logLevel;

        /// <summary>
        /// Do nothing.
        /// </summary>
        /// <param name="logLevel">The log message severity level.</param>
        /// <param name="properties">A dictionary of properties to log.</param>
        /// <param name="message">The message to log.</param>
        /// <param name="args">Any message parameters.</param>
        public virtual void Write(LogLevel logLevel, IDictionary<string, object> properties, string message, params object[] args)
        {
            // Do nothing
        }

        /// <summary>
        /// Get or set the logger's log level.
        /// </summary>
        public virtual LogLevel Level { get; set; }
    }
}