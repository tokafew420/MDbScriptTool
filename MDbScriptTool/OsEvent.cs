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
    public class OsEvent : IEvent
    {
        private readonly ChromiumWebBrowser _browser = null;
        private readonly JsonSerializerSettings _jsonSettings = new JsonSerializerSettings
        {
            DateTimeZoneHandling = DateTimeZoneHandling.Unspecified
        };

        /// <summary>
        /// Initializes a new instance of OsEvent.
        /// </summary>
        /// <param name="browser">The browser instance.</param>
        public OsEvent(ChromiumWebBrowser browser)
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
            _browser.ExecuteScriptAsync($"window.os._emit.apply(window.os, {JsonConvert.SerializeObject(args, Formatting.None, _jsonSettings)})");
        }

        public void On(string name, Action<object[]> handler)
        {
            throw new NotImplementedException();
        }

        public void Once(string name, Action<object[]> handler)
        {
            throw new NotImplementedException();
        }

        public void RemoveListener(string name, Action<object[]> handler)
        {
            throw new NotImplementedException();
        }
    }
}