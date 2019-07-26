using CefSharp;
using CefSharp.WinForms;
using Newtonsoft.Json;

namespace Tokafew420.MDbScriptTool
{
    /// <summary>
    /// A logging class.
    /// </summary>
    public static class Logger
    {
        /// <summary>
        /// The log serverity.
        /// </summary>
        public enum LogLevel
        {
            None = 0,
            Error = 1,
            Warn = 2,
            Info = 4,
            Debug = 8,
            All = Error | Warn | Info | Debug
        }

        /// <summary>
        /// Writes a log event to the VS output window and the browser console.
        /// </summary>
        /// <param name="logLevel">The log message serverity level.</param>
        /// <param name="message">The message to log.</param>
        /// <param name="args">Any message parameters.</param>
        public static void Write(LogLevel logLevel, string message, params object[] args)
        {
            if ((logLevel & Level) != LogLevel.None)
            {
                if (!string.IsNullOrWhiteSpace(message))
                {
                    if (args != null || args.Length > 0)
                    {
                        message = string.Format(message, args);
                    }

                    switch (logLevel)
                    {
                        case LogLevel.Error:
                            System.Diagnostics.Debug.WriteLine(message);
                            break;

                        case LogLevel.Warn:
                            System.Diagnostics.Debug.WriteLine(message);
                            break;

                        case LogLevel.Info:
                            System.Diagnostics.Debug.WriteLine(message);
                            break;

                        case LogLevel.Debug:
                            System.Diagnostics.Debug.WriteLine(message);
                            break;

                        default:
                            break;
                    }
                    if (Browser?.IsBrowserInitialized == true)
                    {
                        switch (logLevel)
                        {
                            case LogLevel.Error:
                                Browser.ExecuteScriptAsync($"console.log({JsonConvert.SerializeObject("%cError:%c " + message)}, 'background-color: rgba(0, 0, 0, .8); font-weight: bold; color: #ff7474;', 'background-color: rgba(0, 0, 0, .1); color: #7d0000;');");
                                break;

                            case LogLevel.Warn:
                                Browser.ExecuteScriptAsync($"console.log({JsonConvert.SerializeObject("%cWarn: %c " + message)}, 'background-color: rgba(0, 0, 0, .8); font-weight: bold; color: #ffe200;', 'background-color: rgba(0, 0, 0, .1); color: #373c00;');");
                                break;

                            case LogLevel.Info:
                                Browser.ExecuteScriptAsync($"console.log({JsonConvert.SerializeObject("%cInfo: %c " + message)}, 'background-color: rgba(0, 0, 0, .8); font-weight: bold; color: #7296ff;', 'background-color: rgba(0, 0, 0, .1); color: #0500ca;');");
                                break;

                            case LogLevel.Debug:
                                Browser.ExecuteScriptAsync($"console.log({JsonConvert.SerializeObject("%cDebug:%c " + message)}, 'background-color: rgba(0, 0, 0, .8); font-weight: bold; color: #ffffff;', 'background-color: rgba(0, 0, 0, .1); color: #000000;');");
                                break;

                            default:
                                break;
                        }
                    }
                }
            }
        }

        /// <summary>
        /// Logs an error message.
        /// </summary>
        /// <param name="message">The message to log.</param>
        /// <param name="args">Any message parameters.</param>
        public static void Error(string message, params object[] args) => Write(LogLevel.Error, message, args);

        /// <summary>
        /// Logs a warning message.
        /// </summary>
        /// <param name="message">The message to log.</param>
        /// <param name="args">Any message parameters.</param>
        public static void Warn(string message, params object[] args) => Write(LogLevel.Warn, message, args);

        /// <summary>
        /// Logs an info message.
        /// </summary>
        /// <param name="message">The message to log.</param>
        /// <param name="args">Any message parameters.</param>
        public static void Info(string message, params object[] args) => Write(LogLevel.Info, message, args);

        /// <summary>
        /// Logs an info message. An alias for Logger.Info()
        /// </summary>
        /// <param name="message">The message to log.</param>
        /// <param name="args">Any message parameters.</param>
        public static void Log(string message, params object[] args) => Write(LogLevel.Info, message, args);

        /// <summary>
        /// Logs a debug message.
        /// </summary>
        /// <param name="message">The message to log.</param>
        /// <param name="args">Any message parameters.</param>
        public static void Debug(string message, params object[] args) => Write(LogLevel.Debug, message, args);

        /// <summary>
        /// Get or set the logger's log level.
        /// </summary>
        public static LogLevel Level { get; set; }

        /// <summary>
        /// Get or set the Chromium Web Browser. If set, the output may go to browser console.
        /// </summary>
        public static ChromiumWebBrowser Browser { get; set; }
    }
}