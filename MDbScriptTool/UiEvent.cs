using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using CefSharp;
using CefSharp.WinForms;
using Newtonsoft.Json;

namespace Tokafew420.MDbScriptTool
{
    /// <summary>
    /// A class that is used handle javascript events. This class is registered as a javascript object.
    /// </summary>
    public class UiEvent : IEvent
    {
        private readonly ChromiumWebBrowser _browser = null;
        private readonly IDictionary<string, List<Action<object[]>>> _listeners = null;

        /// <summary>
        /// Initializes a new instance of UiEvent.
        /// </summary>
        /// <param name="browser">The browser instance.</param>
        public UiEvent(ChromiumWebBrowser browser)
        {
            _browser = browser ?? throw new ArgumentNullException("browser");
            _listeners = new Dictionary<string, List<Action<object[]>>>();
        }

        /// <summary>
        /// This method will be exposed to the Javascript environment. It is
        /// invoked in the Javascript environment when some event of interest
        /// happens.
        /// </summary>
        /// <param name="name">The name of the event.</param>
        /// <param name="data">Data provided by the invoker pertaining to the event.</param>
        /// <remarks>
        /// By default Emit will be translated to emit as a javascript function.
        /// This is configurable when calling JavascriptObjectRepository.Register by setting BindingOptions.
        /// </remarks>
        public void Emit(string name, params object[] args)
        {
            if (name == null) throw new ArgumentNullException("name");

            Logger.Debug($"Event: {name}");

            var actionList = _listeners.FirstOrDefault(l => l.Key == name).Value;

            if (actionList != null)
            {
                if (args != null)
                {
                    for (var i = 0; i < args.Length; i++)
                    {
                        try
                        {
                            // Try to deserialize each argument
                            args[i] = JsonConvert.DeserializeObject(args[i] as string);
                        }
                        catch
                        {
                            // Do nothing
                        }
                    }
                }

                foreach (var action in actionList)
                    Task.Factory.StartNew(() => action(args));
            }
        }

        /// <summary>
        /// Add a listener to the script event of interest.
        /// </summary>
        /// <param name="name">The event name.</param>
        /// <param name="handler">The event handler.</param>
        [JavascriptIgnore]
        public void On(string name, Action<object[]> handler)
        {
            if (name == null) throw new ArgumentNullException("name");
            if (handler == null) throw new ArgumentNullException("handler");

            var actionList = _listeners.FirstOrDefault(l => l.Key == name).Value;

            if (actionList == null)
            {
                actionList = new List<Action<object[]>>();
                _listeners[name] = actionList;
            }

            actionList.Add(handler);
        }

        /// <summary>
        /// Add a listener to the script event of interest that only executes once.
        /// </summary>
        /// <param name="name">The event name.</param>
        /// <param name="handler">The event handler.</param>
        [JavascriptIgnore]
        public void Once(string name, Action<object[]> handler)
        {
            if (name == null) throw new ArgumentNullException("name");
            if (handler == null) throw new ArgumentNullException("handler");

            var actionList = _listeners.FirstOrDefault(l => l.Key == name).Value;

            if (actionList == null)
            {
                actionList = new List<Action<object[]>>();
                _listeners[name] = actionList;
            }

            actionList.Add((args) =>
            {
                handler(args);
                actionList.Remove(handler);
            });
        }

        /// <summary>
        /// Remove as event listener.
        /// </summary>
        /// <param name="name">The event name.</param>
        /// <param name="handler">The handler instance.</param>
        [JavascriptIgnore]
        public void RemoveListener(string name, Action<object[]> handler)
        {
            if (name == null) throw new ArgumentNullException("name");
            if (handler == null) throw new ArgumentNullException("handler");

            var actionList = _listeners.FirstOrDefault(l => l.Key == name).Value;

            if (actionList != null)
            {
                actionList.Remove(handler);
            }
        }

        /// <summary>
        /// Determines whether the specified object is equal to the current object.
        /// </summary>
        /// <param name="obj">The object to compare with the current object.</param>
        /// <returns>true if the specified object is equal to the current object; otherwise, false.</returns>
        /// <remarks>Override to hide from the browser Javascript.</remarks>
        [JavascriptIgnore]
        public override bool Equals(object obj) => base.Equals(obj);

        /// <summary>
        /// Serves as the default hash function.
        /// </summary>
        /// <returns>A hash code for the current object.</returns>
        /// <remarks>Override to hide from the browser Javascript.</remarks>
        [JavascriptIgnore]
        public override int GetHashCode() => base.GetHashCode();

        /// <summary>
        /// Returns a string that represents the current object.
        /// </summary>
        /// <returns>A string that represents the current object.</returns>
        /// <remarks>Override to hide from the browser Javascript.</remarks>
        [JavascriptIgnore]
        public override string ToString() => base.ToString();
    }
}