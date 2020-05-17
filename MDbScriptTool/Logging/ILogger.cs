namespace Tokafew420.MDbScriptTool.Logging
{
    /// <summary>
    /// A logging interface.
    /// </summary>
    public interface ILogger
    {
        /// <summary>
        /// Writes a log event to the VS output window and the browser console.
        /// </summary>
        /// <param name="logLevel">The log message severity level.</param>
        /// <param name="message">The message to log.</param>
        /// <param name="args">Any message parameters.</param>
        void Write(LogLevel logLevel, string message, params object[] args);

        /// <summary>
        /// Get or set the logger's log level.
        /// </summary>
        LogLevel Level { get; set; }
    }
}