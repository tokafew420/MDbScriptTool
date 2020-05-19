using System;
using System.ComponentModel;

namespace Tokafew420.MDbScriptTool.Logging
{
    /// <summary>
    /// Logger extensions.
    /// </summary>
    public static class ILoggerExtensions
    {
        /// <summary>
        /// Logs an error message.
        /// </summary>
        /// <param name="logger">The logger instance.</param>
        /// <param name="message">The message to log.</param>
        /// <param name="args">Any message parameters.</param>
        public static void Error(this ILogger logger, [Localizable(false)] string message, params object[] args)
        {
            if (logger == null) throw new ArgumentNullException(nameof(logger));

            logger.Write(LogLevel.Error, message, args);
        }

        /// <summary>
        /// Logs a warning message.
        /// </summary>
        /// <param name="logger">The logger instance.</param>
        /// <param name="message">The message to log.</param>
        /// <param name="args">Any message parameters.</param>
        public static void Warn(this ILogger logger, [Localizable(false)] string message, params object[] args)
        {
            if (logger == null) throw new ArgumentNullException(nameof(logger));

            logger.Write(LogLevel.Warn, message, args);
        }

        /// <summary>
        /// Logs an info message.
        /// </summary>
        /// <param name="logger">The logger instance.</param>
        /// <param name="message">The message to log.</param>
        /// <param name="args">Any message parameters.</param>
        public static void Info(this ILogger logger, [Localizable(false)] string message, params object[] args)
        {
            if (logger == null) throw new ArgumentNullException(nameof(logger));

            logger.Write(LogLevel.Info, message, args);
        }

        /// <summary>
        /// Logs an info message. An alias for Logger.Info()
        /// </summary>
        /// <param name="logger">The logger instance.</param>
        /// <param name="message">The message to log.</param>
        /// <param name="args">Any message parameters.</param>
        public static void Log(this ILogger logger, [Localizable(false)] string message, params object[] args)
        {
            if (logger == null) throw new ArgumentNullException(nameof(logger));

            logger.Write(LogLevel.Info, message, args);
        }

        /// <summary>
        /// Logs a debug message.
        /// </summary>
        /// <param name="logger">The logger instance.</param>
        /// <param name="message">The message to log.</param>
        /// <param name="args">Any message parameters.</param>
        public static void Debug(this ILogger logger, [Localizable(false)] string message, params object[] args)
        {
            if (logger == null) throw new ArgumentNullException(nameof(logger));

            logger.Write(LogLevel.Debug, message, args);
        }
    }
}