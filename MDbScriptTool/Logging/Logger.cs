using System.Globalization;
using CefSharp;
using CefSharp.WinForms;
using Newtonsoft.Json;

namespace Tokafew420.MDbScriptTool.Logging
{
    /// <summary>
    /// A logging class.
    /// </summary>
    public class Logger : ILogger
    {
        /// <summary>
        /// Initialize a new instance of logger.
        /// </summary>
        /// <param name="logLevel">The initial log level.</param>
        /// <param name="browser">The browser instance to log to.</param>
        public Logger(LogLevel logLevel, ChromiumWebBrowser browser = null)
        {
            Level = logLevel;
            Browser = browser;
        }

        /// <summary>
        /// Writes a log event to the VS output window and the browser console.
        /// </summary>
        /// <param name="logLevel">The log message severity level.</param>
        /// <param name="message">The message to log.</param>
        /// <param name="args">Any message parameters.</param>
        public virtual void Write(LogLevel logLevel, string message, params object[] args)
        {
            if ((logLevel & Level) != LogLevel.None)
            {
                if (!string.IsNullOrWhiteSpace(message))
                {
                    if (args != null || args.Length > 0)
                    {
                        message = string.Format(CultureInfo.CurrentCulture, message, args);
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
        /// Get or set the logger's log level.
        /// </summary>
        public virtual LogLevel Level { get; set; }

        /// <summary>
        /// Get or set the Chromium Web Browser. If set, the output may go to browser console.
        /// </summary>
        public ChromiumWebBrowser Browser { get; set; }
    }
}