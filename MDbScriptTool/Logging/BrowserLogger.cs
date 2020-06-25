using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;
using CefSharp;
using Newtonsoft.Json;

namespace Tokafew420.MDbScriptTool.Logging
{
    /// <summary>
    /// A logging class that write logs to the browser's dev console.
    /// </summary>
    public class BrowserLogger : ILogger
    {
        /// <summary>
        /// Initialize a new instance of logger.
        /// </summary>
        /// <param name="browser">The browser instance to log to.</param>
        /// <param name="logLevel">The initial log level.</param>
        public BrowserLogger(IWebBrowser browser, LogLevel logLevel = LogLevel.Info)
        {
            Browser = browser ?? throw new ArgumentNullException(nameof(browser));
            Level = logLevel;
        }

        /// <summary>
        /// Writes a log event to the browser console.
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
                    strBuilder.Append($"[{DateTime.UtcNow.ToString("G", CultureInfo.InvariantCulture)}] {message.Format(args)}");
                }
                if (properties != null)
                {
                    foreach (var prop in properties)
                    {
                        strBuilder.Append($"{Environment.NewLine}\t[{prop.Key}]: {prop.Value}");
                    }
                }

                if (strBuilder.Length > 0 && Browser?.IsBrowserInitialized == true)
                {
                    switch (logLevel)
                    {
                        case LogLevel.Error:
                            Browser.ExecuteScriptAsync($"console.error({JsonConvert.SerializeObject("%c Error: %c " + strBuilder.ToString())}, 'background-color: rgba(0, 0, 0, .8); font-weight: bold; color: #ff7474;', 'background-color: rgba(0, 0, 0, 0); color: #7d0000;');");
                            break;

                        case LogLevel.Warn:
                            Browser.ExecuteScriptAsync($"console.warn({JsonConvert.SerializeObject("%c Warn:  %c " + strBuilder.ToString())}, 'background-color: rgba(0, 0, 0, .8); font-weight: bold; color: #ffe200;', 'background-color: rgba(0, 0, 0, 0); color: #373c00;');");
                            break;

                        case LogLevel.Info:
                            Browser.ExecuteScriptAsync($"console.info({JsonConvert.SerializeObject("%c Info:  %c " + strBuilder.ToString())}, 'background-color: rgba(0, 0, 0, .8); font-weight: bold; color: #7296ff;', 'background-color: rgba(0, 0, 0, 0); color: #0500ca;');");
                            break;

                        case LogLevel.Debug:
                            Browser.ExecuteScriptAsync($"console.log({JsonConvert.SerializeObject("%c Debug: %c " + strBuilder.ToString())}, 'background-color: rgba(0, 0, 0, .8); font-weight: bold; color: #ffffff;', 'background-color: rgba(0, 0, 0, 0); color: #545454;');");
                            break;

                        default:
                            break;
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
        public IWebBrowser Browser { get; set; }
    }
}