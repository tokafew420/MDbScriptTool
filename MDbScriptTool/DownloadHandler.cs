using System;
using System.IO;
using System.Windows.Forms;
using CefSharp;
using CefSharp.WinForms;

namespace Tokafew420.MDbScriptTool
{
    internal class DownloadHandler : IDownloadHandler
    {
        private readonly Application _app;
        private readonly ChromiumWebBrowser _browser;
        private readonly string replyMsgName = "download-completed";

        public OsEvent OsEvent { get; set; }

        /// <summary>
        /// Initializes a new instance of DownloadHandler
        /// </summary>
        internal DownloadHandler(Application application, ChromiumWebBrowser browser)
        {
            _app = application ?? throw new ArgumentNullException(nameof(application));
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

                    saveas = suggestedFileName.StartsWith("saveas:");
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
                            Title = saveas ? "Save As" : "Save"
                        })
                        {
                            if (saveFileDialog.ShowDialog() == DialogResult.OK && saveFileDialog.FileName != "")
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