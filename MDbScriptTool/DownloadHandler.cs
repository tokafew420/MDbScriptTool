using System;
using System.IO;
using System.Windows.Forms;
using CefSharp;
using CefSharp.WinForms;

namespace Tokafew420.MDbScriptTool
{
    internal class DownloadHandler : IDownloadHandler
    {
        private readonly Form _form;
        private readonly ChromiumWebBrowser _browser;
        private readonly string replyMsgName = "download-completed";

        public OsEvent OsEvent { get; set; }

        /// <summary>
        /// Initializes a new instance of DownloadHandler
        /// </summary>
        internal DownloadHandler(Form form, ChromiumWebBrowser browser)
        {
            _form = form ?? throw new ArgumentNullException(nameof(form));
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
                        var saveFileDialog = new SaveFileDialog
                        {
                            InitialDirectory = string.IsNullOrWhiteSpace(path) ? "" : Path.GetDirectoryName(path),
                            FileName = filename,
                            Filter = $"{downloadItem.MimeType} | *.{Utils.GetFileExtenstion(filename)}|All Files | *.*",
                            Title = saveas ? "Save As" : "Save"
                        };

                        if (saveFileDialog.ShowDialog() == DialogResult.OK && saveFileDialog.FileName != "")
                        {
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