using System;
using System.Diagnostics;
using CefSharp;
using CefSharp.Handler;
using CefSharp.WinForms;

namespace Tokafew420.MDbScriptTool.Handlers
{
    internal class BrowserRequestHandler : RequestHandler
    {
#pragma warning disable IDE0052 // Remove unread private members
        private readonly App _app;
        private readonly ChromiumWebBrowser _browser;
#pragma warning restore IDE0052 // Remove unread private members

        /// <summary>
        /// Initalizes a new instance of BrowserRequestHandler.
        /// </summary>
        /// <param name="app">The current application instance.</param>
        /// <param name="browser">The current Browser instance.</param>
        public BrowserRequestHandler(App app, ChromiumWebBrowser browser)
        {
            _app = app ?? throw new ArgumentNullException(nameof(app));
            _browser = browser ?? throw new ArgumentNullException(nameof(browser));
        }

        /// <summary>
        /// Called before browser navigation. If the navigation is allowed CefSharp.IWebBrowser.FrameLoadStart
        /// and CefSharp.IWebBrowser.FrameLoadEnd will be called. If the navigation is canceled
        /// CefSharp.IWebBrowser.LoadError will be called with an ErrorCode value of CefSharp.CefErrorCode.Aborted.
        /// </summary>
        /// <param name="browserControl">The ChromiumWebBrowser control</param>
        /// <param name="browser">The browser object</param>
        /// <param name="frame">The frame the request is coming from</param>
        /// <param name="request">The request object - cannot be modified in this callback</param>
        /// <param name="userGesture">The value will be true if the browser navigated via explicit user gesture (e.g. clicking a link) or false if it navigated automatically (e.g. via the DomContentLoaded event).
        /// </param>
        /// <param name="isRedirect">Has the request been redirected</param>
        /// <returns>Return true to cancel the navigation or false to allow the navigation to proceed.</returns>
        protected override bool OnBeforeBrowse(IWebBrowser browserControl, IBrowser browser, IFrame frame, IRequest request, bool userGesture, bool isRedirect)
        {
            if (request.Url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || request.Url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                // Open in Default browser
                Process.Start(request.Url);
                return true;
            }
            else
            {
                return false;
            }
        }
    }
}