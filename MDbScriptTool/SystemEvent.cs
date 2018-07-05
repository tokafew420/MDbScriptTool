using CefSharp;
using CefSharp.WinForms;
using Newtonsoft.Json;
using System;
using System.Linq;

namespace Tokafew420.MDbScriptTool
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
            if (args == null) args = new object[] { };

            args = (new object[] { name }).Concat(args).ToArray();

            // This will get eval in chrome
            _browser.ExecuteScriptAsync($"window.systemEvent.emit.apply(window.systemEvent, {JsonConvert.SerializeObject(args)})");
        }
    }
}