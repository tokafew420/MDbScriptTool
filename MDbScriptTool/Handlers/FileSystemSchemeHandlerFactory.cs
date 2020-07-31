using System;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using CefSharp;

namespace Tokafew420.MDbScriptTool.Handlers
{
    internal class FileSystemSchemeHandlerFactory : ISchemeHandlerFactory
    {
        /// <summary>
        /// The default scheme.
        /// </summary>
        public const string SchemeName = "fs";

        private static readonly string[] _volumes = DriveInfo.GetDrives().Select(v => v.Name.ToLower(CultureInfo.InvariantCulture)).ToArray();

        /// <summary>
        /// Create an instance of FileSystemResourceHandler.
        /// </summary>
        /// <param name="browser">The browser window that originated the request or null if the request did not originate from a browser window (for example, if the request came from CefURLRequest).</param>
        /// <param name="frame">Frame that originated the request or null if the request did not originate from a browser window (for example, if the request came from CefURLRequest).</param>
        /// <param name="schemeName">The scheme name</param>
        /// <param name="request">The request. (will not contain cookie data)</param>
        /// <returns>Return a new FileSystemResourceHandler instance to handle the request or an empty reference to allow default handling of the request.</returns>
        public IResourceHandler Create(IBrowser browser, IFrame frame, string schemeName, IRequest request)
        {
            // Only handle fs scheme.
            if (string.Compare(schemeName, SchemeName, true, CultureInfo.InvariantCulture) != 0) return ResourceHandler.ForErrorMessage($"Invalid scheme [{schemeName}].", HttpStatusCode.BadRequest);

            var uri = new Uri(request.Url);
            var root = uri.Authority;

            // If the root of the path is a system volume then add the volume separator ":"
            // else it will be consider as just another directory.
            if (_volumes.Any(v => v.StartsWith(root, StringComparison.InvariantCultureIgnoreCase)))
            {
                root = root + Path.VolumeSeparatorChar;
            }
            var filepath = root + Uri.UnescapeDataString(uri.AbsolutePath);

            if (File.Exists(filepath))
            {
                // Read file and then copy to a separate memory stream so the file isn't locked.
                using (var stream = new FileStream(filepath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                {
#pragma warning disable CA2000 // Dispose objects before losing scope
                    // Don't dispose the stream here, ResourceHandler.FromStream autoDisposeStream is set to false by default.
                    // The comment indicates "you will only be able to serve one request" ¯\_(ツ)_/¯
                    var ms = new MemoryStream();
#pragma warning restore CA2000 // Dispose objects before losing scope

                    stream.CopyTo(ms);
                    ms.Seek(0, SeekOrigin.Begin);

                    return ResourceHandler.FromStream(ms, Cef.GetMimeType(Path.GetExtension(filepath)), false);
                }
            }

            return ResourceHandler.ForErrorMessage("File not found.", HttpStatusCode.NotFound);
        }
    }
}