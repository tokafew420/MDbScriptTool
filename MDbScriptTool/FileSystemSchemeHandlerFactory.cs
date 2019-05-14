using CefSharp;
using System;
using System.IO;
using System.Linq;
using System.Net;

namespace Tokafew420.MDbScriptTool
{
    internal class FileSystemSchemeHandlerFactory : ISchemeHandlerFactory
    {
        /// <summary>
        /// The default scheme.
        /// </summary>
        public const string SchemeName = "fs";

        private static string[] _volumes;

        /// <summary>
        /// Initialize the static FileSystemSchemeHandlerFactory instance.
        /// </summary>
        static FileSystemSchemeHandlerFactory()
        {
            // Get all the available system drives.
            _volumes = DriveInfo.GetDrives().Select(v => v.Name.ToLower()).ToArray();
        }

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
            if (string.Compare(schemeName, SchemeName, true) != 0) return ResourceHandler.ForErrorMessage($"Invalid scheme [{schemeName}].", HttpStatusCode.BadRequest);

            var uri = new Uri(request.Url);
            var root = uri.Authority;

            // If the root of the path is a system volume then add the volume separator ":"
            // else it will be consider as just another directory.
            if (_volumes.Any(v => v.StartsWith(root)))
            {
                root = root + Path.VolumeSeparatorChar;
            }
            var filepath = root + Uri.UnescapeDataString(uri.AbsolutePath);

            if (File.Exists(filepath))
            {
                return ResourceHandler.FromFilePath(filepath, ResourceHandler.GetMimeType(Path.GetExtension(filepath)), true);
            }

            return ResourceHandler.ForErrorMessage("File not found.", HttpStatusCode.NotFound);
        }
    }
}