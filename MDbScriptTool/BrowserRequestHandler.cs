using System.Diagnostics;
using CefSharp;
using CefSharp.Handler;

namespace Tokafew420.MDbScriptTool
{
    internal class BrowserRequestHandler : DefaultRequestHandler
    {
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
        public override bool OnBeforeBrowse(IWebBrowser browserControl, IBrowser browser, IFrame frame, IRequest request, bool userGesture, bool isRedirect)
        {
            if (request.Url.StartsWith("http://") || request.Url.StartsWith("https://"))
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