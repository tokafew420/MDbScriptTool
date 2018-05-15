using CefSharp;
using System;
using System.IO;
using System.Windows.Forms;

namespace Tokafew420.CefSharpWinFormTemplate
{
    internal static class Program
    {
        /// <summary>
        /// The main entry point for the application.
        /// </summary>
        [STAThread]
        private static void Main()
        {
            // For Windows 7 and above, best to include relevant app.manifest entries as well
            Cef.EnableHighDPISupport();

            var settings = new CefSettings()
            {
                //By default CefSharp will use an in-memory cache, you need to specify a Cache Folder to persist data
                CachePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CefSharp\\Cache")
            };
            settings.RegisterScheme(new CefCustomScheme()
            {
                SchemeName = FileSystemSchemeHandlerFactory.SchemeName,
                SchemeHandlerFactory = new FileSystemSchemeHandlerFactory()
            });

            // Perform dependency check to make sure all relevant resources are in our output directory.
            Cef.Initialize(settings, performDependencyCheck: true, browserProcessHandler: null);

            Application.Run(new AppForm());
        }
    }
}