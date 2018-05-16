using CefSharp;
using CefSharp.WinForms;
using Newtonsoft.Json;
using System;
using System.Linq;

namespace Tokafew420.MDScriptRunner
{
    /// <summary>
    /// A class that is emit events in the Javascript environment.
    /// </summary>
    public class SystemEvent
    {
        private ChromiumWebBrowser _browser = null;

        /// <summary>
        /// Initializes a new instance of SystemEvent.
        /// </summary>
        /// <param name="browser">The browser instance.</param>
        public SystemEvent(ChromiumWebBrowser browser)
        {
            _browser = browser ?? throw new ArgumentNullException("browser");
        }

        /// <summary>
        /// Emits an event in the Javascript environment.
        /// </summary>
        /// <param name="name">The name of the event.</param>
        /// <param name="data">The event arguments.</param>
        public void Emit(string name, params object[] args)
        {
            string serializedArgs = null;

            if (args != null)
            {
                for (var i = 0; i < args.Length; i++)
                {
                    try
                    {
                        args[i] = JsonConvert.SerializeObject(args[i]);
                    }
                    catch
                    {
                        // Do nothing
                    }
                }
                // Build args and escape single quote
                serializedArgs = string.Join(",", args.Select(a => "'" + (a as string).Replace("'", "\\'") + "'"));
                
            }

            _browser.ExecuteScriptAsync($"window.systemEvent.emit('{name}', {serializedArgs ?? "undefined"});");
        }
    }
}