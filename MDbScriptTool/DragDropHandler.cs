using System;
using System.Collections.Generic;
using System.IO;
using CefSharp;
using CefSharp.Enums;
using CefSharp.WinForms;

namespace Tokafew420.MDbScriptTool
{
    internal class DragDropHandler : IDragHandler
    {
        private readonly App _app;
        private readonly ChromiumWebBrowser _browser;
        private readonly string replyMsgName = "drag-items-enter";

        public OsEvent OsEvent { get; set; }

        /// <summary>
        /// Initializes a new instance of DragDropHandler.
        /// </summary>
        /// <param name="app">The application instance.</param>
        /// <param name="browser">The browser instance.</param>
        internal DragDropHandler(App app, ChromiumWebBrowser browser)
        {
            _app = app ?? throw new ArgumentNullException(nameof(app));
            _browser = browser ?? throw new ArgumentNullException(nameof(browser));
            OsEvent = new OsEvent(browser);
        }

        /// <summary>
        /// Called when an external drag event enters the browser window.
        /// </summary>
        /// <param name="browserControl">The ChromiumWebBrowser control</param>
        /// <param name="browser">The browser object</param>
        /// <param name="dragData">Contains the drag event data</param>
        /// <param name="mask">Represents the type of drag operation</param>
        /// <returns>Return false for default drag handling behavior or true to cancel the drag event.</returns>
        public bool OnDragEnter(IWebBrowser browserControl, IBrowser browser, IDragData dragData, DragOperationsMask mask)
        {
            var items = new List<FsFile>();

            try
            {
                if (dragData.IsFile)
                {
                    foreach (var path in dragData.FileNames)
                    {
                        if (File.Exists(path))
                        {
                            var file = new FileInfo(path);

                            items.Add(new FsFile()
                            {
                                Name = file.Name,
                                Path = file.FullName,
                                Size = file.Length,
                                Type = Utils.GetMimeType(file.Extension),
                                LastModified = (long)Utils.ConvertToUnixTimestamp(file.LastWriteTime)
                            });
                        }
                        else if (Directory.Exists(path))
                        {
                            var dir = new DirectoryInfo(path);

                            items.Add(new FsFile()
                            {
                                Name = dir.Name,
                                Path = dir.FullName,
                                Type = "directory",
                                LastModified = (long)Utils.ConvertToUnixTimestamp(dir.LastWriteTime)
                            });
                        }
                    }
                }

                OsEvent.Emit(replyMsgName, null, items);
            }
            catch (Exception e)
            {
                OsEvent.Emit(replyMsgName, e);
            }
            return false;
        }

        /// <summary>
        /// Called whenever draggable regions for the browser window change. These can be
        /// specified using the '-webkit-app-region: drag/no-drag' CSS-property. If draggable
        /// regions are never defined in a document this method will also never be called.
        /// If the last draggable region is removed from a document this method will be called
        /// with an empty IList.
        /// </summary>
        /// <param name="chromiumWebBrowser">The ChromiumWebBrowser control</param>
        /// <param name="browser">The browser object</param>
        /// <param name="frame">The frame</param>
        /// <param name="regions">List of CefSharp.DraggableRegion objects or null if last region was removed.</param>
        public void OnDraggableRegionsChanged(IWebBrowser chromiumWebBrowser, IBrowser browser, IFrame frame, IList<DraggableRegion> regions) => throw new NotImplementedException();
    }
}