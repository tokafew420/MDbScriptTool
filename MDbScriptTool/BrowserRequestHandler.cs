using CefSharp;
using CefSharp.Handler;
using System.Diagnostics;

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
        /// <param name="isRedirect">Has the request been redirected</param>
        /// <returns>Return true to cancel the navigation or false to allow the navigation to proceed.</returns>
        public override bool OnBeforeBrowse(IWebBrowser browserControl, IBrowser browser, IFrame frame, IRequest request, bool isRedirect)
        {
            // If the url is Google open Default browser
            if (!request.Url.StartsWith("fs://"))
            {
                // Open Google in Default browser
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