using System;
using System.Collections.Generic;
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
        /// <param name="properties">A dictionary of properties to log.</param>
        /// <param name="message">The message to log.</param>
        /// <param name="args">Any message parameters.</param>
        public static void Error(this ILogger logger, IDictionary<string, object> properties, [Localizable(false)] string message, params object[] args)
        {
            if (logger == null) throw new ArgumentNullException(nameof(logger));

            logger.Write(LogLevel.Error, properties, message, args);
        }

        /// <summary>
        /// Logs an error message.
        /// </summary>
        /// <param name="logger">The logger instance.</param>
        /// <param name="message">The message to log.</param>
        /// <param name="args">Any message parameters.</param>
        public static void Error(this ILogger logger, [Localizable(false)] string message, params object[] args)
        {
            if (logger == null) throw new ArgumentNullException(nameof(logger));

            logger.Write(LogLevel.Error, null, message, args);
        }

        /// <summary>
        /// Logs a warning message.
        /// </summary>
        /// <param name="logger">The logger instance.</param>
        /// <param name="properties">A dictionary of properties to log.</param>
        /// <param name="message">The message to log.</param>
        /// <param name="args">Any message parameters.</param>
        public static void Warn(this ILogger logger, IDictionary<string, object> properties, [Localizable(false)] string message, params object[] args)
        {
            if (logger == null) throw new ArgumentNullException(nameof(logger));

            logger.Write(LogLevel.Warn, properties, message, args);
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

            logger.Write(LogLevel.Warn, null, message, args);
        }

        /// <summary>
        /// Logs an info message.
        /// </summary>
        /// <param name="logger">The logger instance.</param>
        /// <param name="properties">A dictionary of properties to log.</param>
        /// <param name="message">The message to log.</param>
        /// <param name="args">Any message parameters.</param>
        public static void Info(this ILogger logger, IDictionary<string, object> properties, [Localizable(false)] string message, params object[] args)
        {
            if (logger == null) throw new ArgumentNullException(nameof(logger));

            logger.Write(LogLevel.Info, properties, message, args);
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

            logger.Write(LogLevel.Info, null, message, args);
        }

        /// <summary>
        /// Logs an info message. An alias for Logger.Info()
        /// </summary>
        /// <param name="logger">The logger instance.</param>
        /// <param name="properties">A dictionary of properties to log.</param>
        /// <param name="message">The message to log.</param>
        /// <param name="args">Any message parameters.</param>
        public static void Log(this ILogger logger, IDictionary<string, object> properties, [Localizable(false)] string message, params object[] args)
        {
            if (logger == null) throw new ArgumentNullException(nameof(logger));

            logger.Write(LogLevel.Info, properties, message, args);
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

            logger.Write(LogLevel.Info, null, message, args);
        }

        /// <summary>
        /// Logs a debug message.
        /// </summary>
        /// <param name="logger">The logger instance.</param>
        /// <param name="properties">A dictionary of properties to log.</param>
        /// <param name="message">The message to log.</param>
        /// <param name="args">Any message parameters.</param>
        public static void Debug(this ILogger logger, IDictionary<string, object> properties, [Localizable(false)] string message, params object[] args)
        {
            if (logger == null) throw new ArgumentNullException(nameof(logger));
            if (properties == null) throw new ArgumentNullException(nameof(properties));

            logger.Write(LogLevel.Debug, properties, message, args);
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

            logger.Write(LogLevel.Debug, null, message, args);
        }
    }
}