using System.Collections.Generic;
using System.Linq;

namespace Tokafew420.MDbScriptTool.Logging
{
    /// <summary>
    /// A logging class that writes to other loggers.
    /// </summary>
    public class CompositeLogger : ILogger
    {
        private readonly List<ILogger> _loggers;

        /// <summary>
        /// Initializes a new instance of CompositeLogger.
        /// </summary>
        public CompositeLogger() => _loggers = new List<ILogger>();

        #region Implementation

        /// <summary>
        /// Writes a log event to the group of loggers.
        /// </summary>
        /// <param name="logLevel">The log message severity level.</param>
        /// <param name="properties">A dictionary of properties to log.</param>
        /// <param name="message">The message to log.</param>
        /// <param name="args">Any message parameters.</param>
        public virtual void Write(LogLevel logLevel, IDictionary<string, object> properties, string message, params object[] args)
        {
            foreach (var logWriter in _loggers)
            {
                logWriter.Write(logLevel, properties, message, args);
            }
        }

        /// <summary>
        /// Gets or Sets the log level for all logger.
        /// </summary>
        public virtual LogLevel Level
        {
            get
            {
                var levels = LogLevel.None;
                foreach (var logger in _loggers)
                    levels |= logger.Level;

                return levels;
            }

            set
            {
                foreach (var logger in _loggers)
                    logger.Level = value;
            }
        }

        #endregion Implementation

        /// <summary>
        /// Adds a logger instance to the composite logger.
        /// </summary>
        /// <param name="logger">The logger instance.</param>
        /// <returns>This instance (self).</returns>
        public virtual CompositeLogger Add(ILogger logger)
        {
            _loggers.Add(logger);

            return this;
        }

        /// <summary>
        /// Clears all loggers from the composite logger.
        /// </summary>
        /// <returns>This instance (self).</returns>
        public virtual CompositeLogger Clear()
        {
            _loggers.Clear();
            return this;
        }

        /// <summary>
        /// Create a clone of this composite logger.
        /// </summary>
        /// <returns>A clone of the composite logger.</returns>
        public virtual CompositeLogger Clone()
        {
            var clone = new CompositeLogger();
            clone.Loggers.AddRange(_loggers);

            return clone;
        }

        /// <summary>
        /// Removes a logger instance from the composite logger.
        /// </summary>
        /// <param name="logger">The logger instance.</param>
        /// <returns>This instance (self).</returns>
        public virtual CompositeLogger Remove(ILogger logger)
        {
            _loggers.Remove(logger);

            return this;
        }

        /// <summary>
        /// Removes all logger instance from the composite logger of a particular type.
        /// </summary>
        /// <returns>This instance (self).</returns>
        public virtual CompositeLogger RemoveTypeOf<T>() where T : ILogger
        {
            var loggersToRmove = _loggers.OfType<T>().ToList();
            foreach (var logger in loggersToRmove)
            {
                _loggers.Remove(logger);
            }

            return this;
        }

        /// <summary>
        /// Gets a count of the registered loggers.
        /// </summary>
        public virtual int Count => _loggers.Count;

        /// <summary>
        /// Gets the list of Loggers.
        /// </summary>
        protected virtual List<ILogger> Loggers => _loggers;

        /// <summary>
        /// Creates a CompositeLogger instance from the given loggers.
        /// </summary>
        /// <param name="loggers">Instances of Loggers.</param>
        /// <returns>A CompositeLogger instance.</returns>
        public static CompositeLogger Create(params ILogger[] loggers)
        {
            var compositeLogger = new CompositeLogger();
            if (loggers != null)
            {
                foreach (var logger in loggers)
                {
                    compositeLogger.Add(logger);
                }
            }

            return compositeLogger;
        }
    }
}