using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Windows.Forms;
using CefSharp;
using CefSharp.WinForms;

namespace Tokafew420.MDbScriptTool
{
    internal class FileDialogHandler : IDialogHandler
    {
        private readonly Application _app;
        private readonly ChromiumWebBrowser _browser;
        private readonly string replyMsgName = "file-dialog-closed";

        public OsEvent OsEvent { get; set; }

        /// <summary>
        /// Initalizes a new instance of App
        /// </summary>
        /// <param name="application"></param>
        /// <param name="browser"></param>
        internal FileDialogHandler(Application application, ChromiumWebBrowser browser)
        {
            _app = application ?? throw new ArgumentNullException(nameof(application));
            _browser = browser ?? throw new ArgumentNullException(nameof(browser));
            OsEvent = new OsEvent(browser);
        }

        public bool OnFileDialog(IWebBrowser chromiumWebBrowser, IBrowser browser, CefFileDialogMode mode, CefFileDialogFlags flags, string title, string defaultFilePath, List<string> acceptFilters, int selectedAcceptFilter, IFileDialogCallback callback)
        {
            try
            {
                var files = new List<FsFile>();
                if (CefFileDialogMode.OpenFolder == (mode & CefFileDialogMode.OpenFolder))
                {
                    using (var dialog = new FolderBrowserDialog()
                    {
                        SelectedPath = defaultFilePath.DefaultIfNullOrWhiteSpace(_app.LastFileDialogDirectory)
                    })
                    {
                        if (!string.IsNullOrWhiteSpace(title))
                        {
                            dialog.Description = title;
                        }

                        if (dialog.ShowDialog() == DialogResult.OK)
                        {
                            var dir = new DirectoryInfo(dialog.SelectedPath);

                            _app.LastFileDialogDirectory = dir.FullName;

                            files.Add(new FsFile()
                            {
                                Name = dir.Name,
                                WebkitRelativePath = dir.Parent.FullName,
                                Type = "directory",
                                LastModified = (long)Utils.ConvertToUnixTimestamp(dir.LastWriteTime)
                            });
                            OsEvent.Emit(replyMsgName, null, false, files);
                            callback.Continue(selectedAcceptFilter, new List<string> { dialog.SelectedPath });
                        }
                        else
                        {
                            OsEvent.Emit(replyMsgName, null, true, files);
                            callback.Cancel();
                        }
                    }
                }
                else
                {
                    var filter = string.Join("|", acceptFilters.Select(ext =>
                    {
                        if (string.IsNullOrWhiteSpace(ext)) return "";

                        var fileType = Utils.GetFileType(ext);

                        if (string.IsNullOrWhiteSpace(fileType))
                        {
                            // Maybe the accept type is already a mime type
                            fileType = ext;
                            ext = Utils.GetFileTypeExtension(fileType);

                            if (string.IsNullOrWhiteSpace(ext)) return "";
                        }

                        return $"{fileType}|*{ext}";
                    }));

                    if (string.IsNullOrWhiteSpace(filter))
                    {
                        filter = "All Files|*.*";
                    }

                    using (var dialog = new OpenFileDialog
                    {
                        Multiselect = CefFileDialogMode.OpenMultiple == (mode & CefFileDialogMode.OpenMultiple),
                        Title = title,
                        Filter = filter,
                        InitialDirectory = defaultFilePath.DefaultIfNullOrWhiteSpace(_app.LastFileDialogDirectory),
                        FilterIndex = selectedAcceptFilter
                    })
                    {
                        if (dialog.ShowDialog() == DialogResult.OK)
                        {
                            if (dialog.FileNames != null)
                            {
                                files = dialog.FileNames.Select(f =>
                                {
                                    var file = new FileInfo(f);

                                    return new FsFile()
                                    {
                                        Name = file.Name,
                                        WebkitRelativePath = file.DirectoryName,
                                        Size = file.Length,
                                        Type = Utils.GetMimeType(file.Extension),
                                        LastModified = (long)Utils.ConvertToUnixTimestamp(file.LastWriteTime)
                                    };
                                }).ToList();
                                _app.LastFileDialogDirectory = files.Last()?.WebkitRelativePath;
                            }
                            OsEvent.Emit(replyMsgName, null, false, files);
                            callback.Continue(selectedAcceptFilter, dialog.FileNames.ToList());
                        }
                        else
                        {
                            OsEvent.Emit(replyMsgName, null, true, files);
                            callback.Cancel();
                        }
                    }
                }
            }
            catch (Exception e)
            {
                OsEvent.Emit(replyMsgName, e);
            }

            return true;
        }
    }

    internal class FsFile
    {
        /// <summary>
        /// Returns the last modified time of the file, in millisecond since the UNIX epoch(January 1st, 1970 at Midnight).
        /// </summary>
        public long LastModified { get; set; }

        /// <summary>
        /// Returns the name of the file referenced by the File object.
        /// </summary>
        public string Name { get; set; }

        /// <summary>
        /// Returns the path the URL of the File is relative to.
        /// </summary>
        public string WebkitRelativePath { get; set; }

        /// <summary>
        /// Returns the size of the file in bytes.
        /// </summary>
        public long Size { get; set; }

        /// <summary>
        /// Returns the MIME type of the file.
        /// </summary>
        public string Type { get; set; }
    }
}