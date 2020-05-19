using System;
using System.Windows.Forms;
using CefSharp;
using CefSharp.WinForms;

namespace Tokafew420.MDbScriptTool.Handlers
{
    internal class KeyboardHandler : IKeyboardHandler
    {
#pragma warning disable IDE0052 // Remove unread private members
        private readonly App _app;
        private readonly ChromiumWebBrowser _browser;
#pragma warning restore IDE0052 // Remove unread private members

        /// <summary>
        /// Initalizes a new instance of KeyboardHandler.
        /// </summary>
        /// <param name="app">The current application instance.</param>
        /// <param name="browser">The current Browser instance.</param>
        public KeyboardHandler(App app, ChromiumWebBrowser browser)
        {
            _app = app ?? throw new ArgumentNullException(nameof(app));
            _browser = browser ?? throw new ArgumentNullException(nameof(browser));
        }

        /// <summary>
        /// Called before a keyboard event is sent to the renderer. Return true if the event
        ///  was handled or false otherwise. If the event will be handled in CefSharp.IKeyboardHandler.OnKeyEvent(CefSharp.IWebBrowser,CefSharp.IBrowser,CefSharp.KeyType,System.Int32,System.Int32,CefSharp.CefEventFlags,System.Boolean)
        ///  as a keyboard shortcut set isKeyboardShortcut to true and return false.
        /// </summary>
        /// <param name="browserControl">The CefSharp.IWebBrowser control this request is for.</param>
        /// <param name="browser">The browser instance.</param>
        /// <param name="type">Whether this was a key up/down/raw/etc...</param>
        /// <param name="windowsKeyCode">The Windows key code for the key event. This value is used by the DOM specification.
        ///  Sometimes it comes directly from the event (i.e. on Windows) and sometimes it's
        ///  determined using a mapping function. See WebCore/platform/chromium/KeyboardCodes.h
        ///  for the list of values.</param>
        /// <param name="nativeKeyCode">The native key code. On Windows this appears to be in the format of WM_KEYDOWN/WM_KEYUP/etc... lParam data.</param>
        /// <param name="modifiers">What other modifier keys are currently down: Shift/Control/Alt/OS X Command/etc...</param>
        /// <param name="isSystemKey">Indicates whether the event is considered a "system key" event (see http://msdn.microsoft.com/en-us/library/ms646286(VS.85).aspx for details).</param>
        /// <param name="isKeyboardShortcut">See the summary for an explanation of when to set this to true.</param>
        /// <returns>v</returns>
        public bool OnPreKeyEvent(IWebBrowser browserControl, IBrowser browser, KeyType type, int windowsKeyCode, int nativeKeyCode, CefEventFlags modifiers, bool isSystemKey, ref bool isKeyboardShortcut)
        {
            isKeyboardShortcut = false;

            //Logger.Debug("OnPreKeyEvent: KeyType: {0} 0x{1:X} Modifiers: {2}", type, windowsKeyCode, modifiers);
            // Debug.WriteLine("OnPreKeyEvent PreProcessControlState: {0}", state);
            if (type == KeyType.RawKeyDown)
            {
                switch ((Keys)windowsKeyCode)
                {
                    // F12 to open browser dev console.
                    case Keys.F12:
                        browser.ShowDevTools();
                        return true;
                    // F5 to reload (refresh); Shift + F5 to reload without cache
                    case Keys.F5:
                        browser.Reload(modifiers == CefEventFlags.ShiftDown);
                        return true;

                    default:
                        break;
                }
            }

            return false;
        }

        /// <summary>
        /// Called after the renderer and JavaScript in the page has had a chance to handle the event. Return true if the keyboard event was handled or false otherwise.
        /// </summary>
        /// <param name="browserControl">The CefSharp.IWebBrowser control this request is for.</param>
        /// <param name="browser">The browser instance.</param>
        /// <param name="type">Whether this was a key up/down/raw/etc...</param>
        /// <param name="windowsKeyCode">The Windows key code for the key event. This value is used by the DOM specification.
        /// Sometimes it comes directly from the event (i.e. on Windows) and sometimes it's
        /// determined using a mapping function. See WebCore/platform/chromium/KeyboardCodes.h
        /// for the list of values.</param>
        /// <param name="nativeKeyCode">The native key code. On Windows this appears to be in the format of WM_KEYDOWN/WM_KEYUP/etc... lParam data.</param>
        /// <param name="modifiers">What other modifier keys are currently down: Shift/Control/Alt/OS X Command/etc...</param>
        /// <param name="isSystemKey">Indicates whether the event is considered a "system key" event (see http://msdn.microsoft.com/en-us/library/ms646286(VS.85).aspx
        /// for details).</param>
        /// <returns>Return true if the keyboard event was handled or false otherwise.</returns>
        public bool OnKeyEvent(IWebBrowser browserControl, IBrowser browser, KeyType type, int windowsKeyCode, int nativeKeyCode, CefEventFlags modifiers, bool isSystemKey)
        {
            var result = false;
            //Logger.Debug("OnKeyEvent: KeyType: {0} 0x{1:X} Modifiers: {2}", type, windowsKeyCode, modifiers);
            // TODO: Handle MessageNeeded cases here somehow.

            return result;
        }
    }
}