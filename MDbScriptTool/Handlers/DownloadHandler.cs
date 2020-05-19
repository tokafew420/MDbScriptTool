using System;
using System.IO;
using System.Windows.Forms;
using CefSharp;
using CefSharp.WinForms;
using Tokafew420.MDbScriptTool.Locale;

namespace Tokafew420.MDbScriptTool.Handlers
{
    internal class DownloadHandler : IDownloadHandler
    {
        private readonly App _app;
#pragma warning disable IDE0052 // Remove unread private members
        private readonly ChromiumWebBrowser _browser;
#pragma warning restore IDE0052 // Remove unread private members
        private readonly string replyMsgName = "download-completed";

        public OsEvent OsEvent { get; set; }

        /// <summary>
        /// Initializes a new instance of DownloadHandler
        /// </summary>
        /// <param name="app">The current application instance.</param>
        /// <param name="browser">The current Browser instance.</param>
        public DownloadHandler(App app, ChromiumWebBrowser browser)
        {
            _app = app ?? throw new ArgumentNullException(nameof(app));
            _browser = browser ?? throw new ArgumentNullException(nameof(browser));
            OsEvent = new OsEvent(browser);
        }

        public event EventHandler<DownloadItem> OnBeforeDownloadFired;

        public event EventHandler<DownloadItem> OnDownloadUpdatedFired;

        public void OnBeforeDownload(IWebBrowser chromiumWebBrowser, IBrowser browser, DownloadItem downloadItem, IBeforeDownloadCallback callback)
        {
            IsCancelled = false;
            OnBeforeDownloadFired?.Invoke(this, downloadItem);

            if (!callback.IsDisposed)
            {
                using (callback)
                {
                    var saveas = false;
                    var path = "";
                    var filename = "";

                    var suggestedFileName = Uri.UnescapeDataString(downloadItem.SuggestedFileName);

                    saveas = suggestedFileName.StartsWith("saveas:", StringComparison.OrdinalIgnoreCase);
                    suggestedFileName = suggestedFileName.Substring(suggestedFileName.IndexOf(':') + 1);

                    if (!Path.IsPathRooted(suggestedFileName))
                    {
                        suggestedFileName = Path.Combine(_app.LastFileDialogDirectory ?? "", suggestedFileName);
                    }

                    if (!string.IsNullOrWhiteSpace(suggestedFileName))
                    {
                        path = Path.GetFullPath(suggestedFileName);
                        filename = Path.GetFileName(path);
                    }

                    if (!saveas && File.Exists(path))
                    {
                        callback.Continue(path, showDialog: false);
                    }
                    else
                    {
                        var filter = "All Files | *.*";
                        var ext = Path.GetExtension(filename);
                        var fileType = Utils.GetFileType(ext);

                        if (!string.IsNullOrWhiteSpace(fileType))
                        {
                            filter = $"{fileType} | *{ext}|" + filter;
                        }

                        using (var saveFileDialog = new SaveFileDialog
                        {
                            InitialDirectory = string.IsNullOrWhiteSpace(path) ? "" : Path.GetDirectoryName(path),
                            FileName = filename,
                            Filter = filter,
                            Title = saveas ? Strings.Save_As : Strings.Save
                        })
                        {
                            if (saveFileDialog.ShowDialog() == DialogResult.OK && !string.IsNullOrWhiteSpace(saveFileDialog.FileName))
                            {
                                _app.LastFileDialogDirectory = Path.GetDirectoryName(saveFileDialog.FileName);
                                callback.Continue(saveFileDialog.FileName, showDialog: false);
                            }
                            else
                            {
                                IsCancelled = true;
                            }
                        }
                    }
                }
            }
        }

        public void OnDownloadUpdated(IWebBrowser chromiumWebBrowser, IBrowser browser, DownloadItem downloadItem, IDownloadItemCallback callback)
        {
            OnDownloadUpdatedFired?.Invoke(this, downloadItem);

            if (downloadItem.IsComplete)
            {
                OsEvent.Emit(replyMsgName, true, downloadItem);
            }
            else if (IsCancelled)
            {
                callback.Cancel();
                IsCancelled = false;
                OsEvent.Emit(replyMsgName, false, downloadItem);
            }
        }

        private bool IsCancelled { get; set; }
    }
}