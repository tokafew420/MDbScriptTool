using System;

namespace Tokafew420.MDbScriptTool
{
    /// <summary>
    /// A class that is used handle javascript events (mimics EventEmitter in JS).
    /// </summary>
    public interface IEvent
    {
        /// <summary>
        /// Emits an event.
        /// </summary>
        /// <param name="name">The name of the event.</param>
        /// <param name="data">Data provided by the invoker pertaining to the event.</param>
        void Emit(string name, params object[] args);

        /// <summary>
        /// Add a listener to the event of interest.
        /// </summary>
        /// <param name="name">The event name.</param>
        /// <param name="handler">The event handler.</param>
#pragma warning disable CA1716 // Identifiers should not match keywords
        void On(string name, Action<object[]> handler);
#pragma warning restore CA1716 // Identifiers should not match keywords

        /// <summary>
        /// Add a listener to the script event of interest that only executes once.
        /// </summary>
        /// <param name="name">The event name.</param>
        /// <param name="handler">The event handler.</param>
        void Once(string name, Action<object[]> handler);

        /// <summary>
        /// Remove as event listener.
        /// </summary>
        /// <param name="name">The event name.</param>
        /// <param name="handler">The handler instance.</param>
        void RemoveListener(string name, Action<object[]> handler);
    }
}