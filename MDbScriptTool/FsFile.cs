namespace Tokafew420.MDbScriptTool
{
    public class FsFile
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
        /// Returns the path of the File.
        /// </summary>
        public string Path { get; set; }

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