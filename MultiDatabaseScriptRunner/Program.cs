using CefSharp;
using Newtonsoft.Json;
using System;
using System.Windows.Forms;

namespace Tokafew420.MDScriptRunner
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
                CachePath = AppForm.CacheDirectory
            };
            settings.RegisterScheme(new CefCustomScheme()
            {
                SchemeName = FileSystemSchemeHandlerFactory.SchemeName,
                SchemeHandlerFactory = new FileSystemSchemeHandlerFactory()
            });

            // Perform dependency check to make sure all relevant resources are in our output directory.
            Cef.Initialize(settings, performDependencyCheck: true, browserProcessHandler: null);

            // Setup default json serialization settings.
            JsonConvert.DefaultSettings = () =>
                new JsonSerializerSettings
                {
                    DateTimeZoneHandling = DateTimeZoneHandling.Utc,
                    Formatting = Formatting.Indented,
                    NullValueHandling = NullValueHandling.Ignore,
                    TypeNameAssemblyFormatHandling = TypeNameAssemblyFormatHandling.Simple
                };

            Application.Run(new AppForm());
        }
    }
}