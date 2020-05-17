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
        private readonly App _app;
        private readonly ChromiumWebBrowser _browser;
        private readonly string replyMsgName = "file-dialog-closed";

        public OsEvent OsEvent { get; set; }

        /// <summary>
        /// Initalizes a new instance of App
        /// </summary>
        /// <param name="app"></param>
        /// <param name="browser"></param>
        internal FileDialogHandler(App app, ChromiumWebBrowser browser)
        {
            _app = app ?? throw new ArgumentNullException(nameof(app));
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
                                Path = dir.FullName,
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
                                        Path = file.FullName,
                                        Size = file.Length,
                                        Type = Utils.GetMimeType(file.Extension),
                                        LastModified = (long)Utils.ConvertToUnixTimestamp(file.LastWriteTime)
                                    };
                                }).ToList();

                                if (files.Count > 0)
                                {
                                    _app.LastFileDialogDirectory = Path.GetDirectoryName(files.Last().Path);
                                }
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
}