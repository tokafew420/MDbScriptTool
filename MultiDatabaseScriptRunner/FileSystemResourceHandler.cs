using CefSharp;
using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Threading.Tasks;

namespace CefWinForm
{
    internal class FileSystemResourceHandler : ResourceHandler
    {
        private string[] _systemVolumes;

        /// <summary>
        /// Create a new instance of FileSystemResourceHandler specifying the available system volumes.
        /// </summary>
        /// <param name="systemVolumes">A list of the available system volumes.</param>
        public FileSystemResourceHandler(string[] systemVolumes)
        {
            _systemVolumes = systemVolumes ?? throw new ArgumentNullException("systemVolumnes");
        }


        //
        // Parameters:
        //   request:
        //     The request object.
        //
        //   callback:
        //     
        //
        // Returns:
        //     To handle the request return true and call CefSharp.ICallback.Continue once the
        //     response header information is available CefSharp.ICallback.Continue can also
        //     be called from inside this method if header information is available immediately).
        //     To cancel the request return false.

        /// <summary>
        /// Begin processing the request by mapping it to a file on the file system.
        /// </summary>
        /// <param name="request">The request object.</param>
        /// <param name="callback">The callback used to Continue or Cancel the request (async).</param>
        /// <returns></returns>
        public override bool ProcessRequestAsync(IRequest request, ICallback callback)
        {
            var uri = new Uri(request.Url);

            // Only handle fs scheme.
            if (uri.Scheme != "fs") return false;

            var root = uri.Authority;

            // If the root of the path is a system volume then add the volume separator ":"
            // else it will be consider as just another directory.
            if(_systemVolumes.Any(v => v.StartsWith(root)))
            {
                root = root + Path.VolumeSeparatorChar;
            }
            var filepath = root + uri.AbsolutePath;

            Task.Run(() =>
            {
                var mimeType = "";

                using (callback)
                {
                    if (File.Exists(filepath))
                    {
                        switch (Path.GetExtension(filepath).ToLower())
                        {
                            case ".css":
                                mimeType = "text/css";
                                break;
                            case ".html":
                            case ".htm":
                                mimeType = "text/html";
                                break;

                            case ".json":
                                mimeType = "application/json";
                                break;

                            case ".js":
                                mimeType = "text/javascript";
                                break;

                            case ".png":
                                mimeType = "image/png";
                                break;

                            case ".appcache":
                            case ".manifest":
                                mimeType = "text/cache-manifest";
                                break;

                            default:
                                mimeType = "application/octet-stream";
                                break;
                        }

                        var stream = new MemoryStream(File.ReadAllBytes(filepath));

                        //Reset the stream position to 0 so the stream can be copied into the underlying unmanaged buffer
                        stream.Position = 0;
                        //Populate the response values - No longer need to implement GetResponseHeaders (unless you need to perform a redirect)
                        ResponseLength = stream.Length;
                        MimeType = mimeType;
                        StatusCode = (int)HttpStatusCode.OK;
                        Stream = stream;

                        callback.Continue();
                    }
                    else
                    {
                        ForErrorMessage("File not found.", HttpStatusCode.NotFound);
                        StatusCode = 404;
                        callback.Cancel();
                    }
                }
            });

            return true;
        }
    }
}