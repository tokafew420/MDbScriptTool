using System;
using System.IO;
using System.Windows.Forms;
using CefSharp;
using CefSharp.WinForms;
using Mono.Options;
using Newtonsoft.Json;

namespace Tokafew420.MDbScriptTool
{
    public partial class Program : Form
    {
        private ChromiumWebBrowser _browser;
        private static bool _runningInVs = false;
        private static string _appDir;
        private static string _dataDir;

        /// <summary>
        /// The main entry point for the application.
        /// </summary>
        [STAThread]
        private static void Main(string[] args)
        {
            // Parse commandline args
            var options = new OptionSet() {
                { "a|app", v => _appDir = v },
                { "d|data", v => _dataDir = v },
                { "vs", v => _runningInVs = v != null }
            };
            options.Parse(args);

            // For Windows 7 and above, best to include relevant app.manifest entries as well
            Cef.EnableHighDPISupport();

            var settings = new CefSettings()
            {
                //By default CefSharp will use an in-memory cache, you need to specify a Cache Folder to persist data
                CachePath = CacheDirectory
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

            Application.Run(new Program());
        }

        public Program() => InitializeComponent();

        private void AppForm_Load(object sender, EventArgs e)
        {
            // The main entry point for the browser page is index.html
            var url = new Uri(string.Format("fs:///{0}app.html", AppDirectory));

            _browser = new ChromiumWebBrowser(url.ToString());
            Logger.Browser = _browser;
            Logger.Level = Logger.LogLevel.All;

            // Initialize the app
            var app = new App(this, _browser);

            // Register handlers.
            _browser.RequestHandler = new BrowserRequestHandler();
            _browser.KeyboardHandler = new KeyboardHandler();
            // Register the uiEvent class with JS
            _browser.JavascriptObjectRepository.Register("uiEvent", app.UiEvent, true, BindingOptions.DefaultBinder);

            _browser.DialogHandler = new FileDialogHandler(this, _browser);
            _browser.DownloadHandler = new DownloadHandler(this, _browser);

            MainPanel.Controls.Add(_browser);

            NativeMethods.CreateSysMenu(this);

            // Load saved state
            try
            {
                var windowLocation = AppSettings.Get<System.Drawing.Point?>("WindowLocation");
                if (windowLocation != null)
                {
                    Location = windowLocation.Value;
                }

                var windowSize = AppSettings.Get<System.Drawing.Size?>("WindowSize");
                if (windowSize != null)
                {
                    Size = windowSize.Value;
                }

                var windowIsMaximized = AppSettings.Get<bool>("WindowIsMaximized");
                if (windowIsMaximized)
                {
                    WindowState = FormWindowState.Maximized;
                }

                if (AppSettings.Exists("LogToBrowser") && !AppSettings.Get<bool>("LogToBrowser"))
                {
                    Logger.Browser = null;
                }
                if (AppSettings.Exists("LogLevel"))
                {
                    Logger.Level = AppSettings.Get<Logger.LogLevel>("LogLevel");
                }
                if (AppSettings.Exists("SqlLoggingEnabled"))
                {
                    SqlLogger.Enabled = AppSettings.Get<bool>("SqlLoggingEnabled");
                }
                if (AppSettings.Exists("SqlLoggingDir"))
                {
                    SqlLogger.Directory = AppSettings.Get<string>("SqlLoggingDir");
                }
                else
                {
                    SqlLogger.Directory = Path.GetFullPath(Path.Combine(DataDirectory, "../Logs"));
                }
                if (AppSettings.Exists("SqlLoggingRetention"))
                {
                    SqlLogger.Retention = AppSettings.Get<int?>("SqlLoggingRetention");
                }

                SqlLogger.InitialilzeAsync();
            }
            catch (Exception err)
            {
                Logger.Warn("Failed to apply AppSettings");
                Logger.Warn(err.ToString());
            }
        }

        protected override void WndProc(ref Message m)
        {
            base.WndProc(ref m);

            // Test if the About item was selected from the system menu
            if ((m.Msg == NativeMethods.WM_SYSCOMMAND) && (m.WParam == NativeMethods.SYSMENU_CHROME_DEV_TOOLS))
            {
                _browser.ShowDevTools();
            }
        }

        private void AppForm_Closing(object sender, FormClosingEventArgs e)
        {
            //Comment out Cef.Shutdown() call - it will be automatically called when exiting the application.
            //Due to a timing issue and the way the WCF service closes it's self in newer versions, it can be best to leave CefSharp to clean it's self up.
            //Alternative solution is to set the WCF timeout to Zero (or a smaller number) using CefSharp.CefSharpSettings.WcfTimeout = TimeSpan.Zero;
            // This must be done before creating any ChromiumWebBrowser instance
            //Cef.Shutdown();

            // Save window state
            AppSettings.Set("WindowLocation", new System.Drawing.Point?(Location));

            // Copy window size to app settings
            if (WindowState == FormWindowState.Normal)
            {
                AppSettings.Set("WindowSize", new System.Drawing.Size?(Size));
            }
            else
            {
                AppSettings.Set("WindowSize", new System.Drawing.Size?(RestoreBounds.Size));
            }
            AppSettings.Set("WindowIsMaximized", WindowState == FormWindowState.Maximized);
            AppSettings.Set("LogToBrowser", Logger.Browser != null);
            AppSettings.Set("LogLevel", Logger.Level);
            AppSettings.Set("SqlLoggingEnabled", SqlLogger.Enabled);
            AppSettings.Set("SqlLoggingDir", SqlLogger.Directory);
            AppSettings.Set("SqlLoggingRetention", SqlLogger.Retention);

            AppSettings.Save();
        }

        #region Properties

        private static Lazy<string> _AppDirectory = new Lazy<string>(() =>
        {
            if (!string.IsNullOrWhiteSpace(_appDir))
            {
                if (Directory.Exists(_appDir))
                {
                    return _appDir;
                }
            }

            if (_runningInVs)
            {
                // Use the project directory when in Debug mode
                // Output path is {project dir}/bin/{Configuration}/{Platform}/
                // ie: ./bin/x64/Debug
                return Directory.GetParent(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "../..")).FullName + "\\";
            }

            return AppDomain.CurrentDomain.BaseDirectory;
        });

        /// <summary>
        /// Gets the directory path where the application is running.
        /// </summary>
        public static string AppDirectory => _AppDirectory.Value;

        private static Lazy<string> _DataDirectory = new Lazy<string>(() =>
        {
            if (!string.IsNullOrWhiteSpace(_dataDir))
            {
                if (Directory.Exists(_dataDir))
                {
                    return _dataDir;
                }
            }

            if (_runningInVs)
            {
                // Use the running application directory instead of the remapped AppDirectory.
                return Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Data");
            }

            return Path.Combine(AppDirectory, "Data");
        });

        /// <summary>
        /// Gets the Data directory path.
        /// </summary>
        public static string DataDirectory => _DataDirectory.Value;

        private static Lazy<string> _CacheDirectory = new Lazy<string>(() => Path.Combine(DataDirectory, "Cache"));

        /// <summary>
        /// Gets the cache directory path.
        /// </summary>
        public static string CacheDirectory => _CacheDirectory.Value;

        #endregion Properties
    }
}