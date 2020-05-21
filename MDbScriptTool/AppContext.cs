using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using CefSharp;
using CefSharp.WinForms;
using Mono.Options;
using Newtonsoft.Json;
using Tokafew420.MDbScriptTool.Handlers;
using Tokafew420.MDbScriptTool.Locale;
using Tokafew420.MDbScriptTool.Logging;

namespace Tokafew420.MDbScriptTool
{
    public class AppContext : ApplicationContext
    {
        #region Privates

        private static bool _runningInVs = false;
        private static string _appDir;
        private static string _dataDir;

        private readonly static Lazy<string> _appDirectory = new Lazy<string>(() =>
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
                // This is so when developing, we can easily edit files and refresh.
                // Output path is {project dir}/bin/{Configuration}/{Platform}/
                // ie: ./bin/x64/Debug
                return Directory.GetParent(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "../..")).FullName + "\\";
            }

            return AppDomain.CurrentDomain.BaseDirectory;
        });

        private readonly static Lazy<string> _cacheDirectory = new Lazy<string>(() => Path.Combine(DataDirectory, "Cache"));

        private readonly static Lazy<string> _dataDirectory = new Lazy<string>(() =>
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

        private readonly static Lazy<string> _appGuid = new Lazy<string>(() =>
        {
            var assembly = Assembly.GetExecutingAssembly();
            var attribute = (GuidAttribute)assembly.GetCustomAttributes(typeof(GuidAttribute), true)[0];

            return attribute.Value;
        });

        private readonly static Mutex _mutex = new Mutex(false, AppGuid);
        private readonly List<App> _apps = new List<App>();

        #endregion Privates

        #region Main

        /// <summary>
        /// The main entry point for the application.
        /// </summary>
        [STAThread]
        private static void Main(string[] args)
        {
            try
            {
                var showHelp = false;

                // First order of business is to parse commandline args
                // Do this before loading configurations because the data directory
                // may be passed as an argument.
                var options = new OptionSet() {
                    { "a|app=", "The application's source directory.", v => _appDir = v },
                    { "d|data=", "The application's data storage directory.", v => _dataDir = v },
                    { "vs", "Whether this instance is run from Visual Studio.", v => _runningInVs = v != null },
                    { "h|help", v => showHelp = v != null }
                };
                options.Parse(args);

                if (showHelp)
                {
                    NativeMethods.AttachConsole(NativeMethods.ATTACH_PARENT_PROCESS);
                    Console.Write(Strings.CmdLineHelpMessage);
                    NativeMethods.FreeConsole();
                    return;
                }
            }
            catch (Exception e)
            {
                NativeMethods.AttachConsole(NativeMethods.ATTACH_PARENT_PROCESS);
                Console.Write(Strings.CmdLineParseError, e.Message);
                NativeMethods.FreeConsole();
                return;
            }

            // Load global configurations
            LoadConfiguration();

            // Allow only a single process in this section at a time.
            if (_mutex.WaitOne(-1, true))
            {
                var instances = GetApplicationInstances();

                if (instances.Any())
                {
                    var firstInstance = instances.First();
                    if (SingleInstance)
                    {
                        // Bring existing instance to foreground
                        NativeMethods.SetForegroundWindow(firstInstance.MainWindowHandle);

                        // If the window is minimized then restore it
                        var windowPlacement = NativeMethods.GetPlacement(firstInstance.MainWindowHandle);
                        if (windowPlacement.showCmd == (int)NativeMethods.CmdShow.SW_SHOWMINIMIZED)
                        {
                            NativeMethods.ShowWindow(firstInstance.MainWindowHandle, NativeMethods.CmdShow.SW_SHOWNORMAL);
                        }
                    }
                    else
                    {
                        // Since cef doesn't not allow multiple processes to load the same Data/Cache directory, we must use
                        // the same existing process to open a new window. We do this by sending a message to the existing process.
                        var cds = new NativeMethods.CopyDataStruct();
                        try
                        {
                            var data = "Cmd:New Window";
                            cds.cbData = (UIntPtr)((data.Length + 1) * 2); // Number of bytes
                            cds.lpData = NativeMethods.LocalAlloc(NativeMethods.LocalMemoryFlags.LMEM_ZEROINIT, cds.cbData); // Known local-pointer in RAM.

                            if (cds.lpData == IntPtr.Zero) throw new OutOfMemoryException();

                            Marshal.Copy(data.ToCharArray(), 0, cds.lpData, data.Length); // Copy data to preserved local-pointer
                            cds.dwData = (IntPtr)1;
                            NativeMethods.SendMessage(firstInstance.MainWindowHandle, NativeMethods.WM_COPYDATA, IntPtr.Zero, ref cds);
                        }
                        finally
                        {
                            cds.Dispose();
                        }
                    }

                    _mutex.ReleaseMutex();
                    return;
                }

                // For Windows 7 and above, best to include relevant app.manifest entries as well
                Cef.EnableHighDPISupport();

                using (var settings = new CefSettings()
                {
                    // By default CefSharp will use an in-memory cache, you need to specify a Cache Folder to persist data
                    CachePath = CacheDirectory
                })
                {
                    settings.RegisterScheme(new CefCustomScheme()
                    {
                        SchemeName = FileSystemSchemeHandlerFactory.SchemeName,
                        SchemeHandlerFactory = new FileSystemSchemeHandlerFactory()
                    });

                    // Perform dependency check to make sure all relevant resources are in our output directory.
                    Cef.Initialize(settings, performDependencyCheck: true, browserProcessHandler: null);
                }

                // Setup default json serialization settings.
                JsonConvert.DefaultSettings = () =>
                    new JsonSerializerSettings
                    {
                        DateTimeZoneHandling = DateTimeZoneHandling.Utc,
                        Formatting = Formatting.Indented,
                        NullValueHandling = NullValueHandling.Ignore,
                        TypeNameAssemblyFormatHandling = TypeNameAssemblyFormatHandling.Simple
                    };

                // Load SqlServer types
                SqlServerTypes.Utilities.LoadNativeAssemblies(AppDomain.CurrentDomain.BaseDirectory);

                using (var appContext = new AppContext())
                {
                    // Release mutex because WinForms.Application.Run will block
                    _mutex.ReleaseMutex();
                    Application.Run(appContext);
                }
            }
        }

        #endregion Main

        public AppContext() => CreateNewApplicationInstance();

        /// <summary>
        /// Create a new application instance (form).
        /// </summary>
        public void CreateNewApplicationInstance()
        {
            var app = new App(this);

            _apps.Add(app);
            if (MainForm == null)
            {
                // Setting MainForm will also assign the OnMainFormClosed handler
                MainForm = app;
            }
            else
            {
                // Manually assign OnMainFormClosed handler
                app.FormClosed += OnMainFormClosed;
            }
            app.Show();
        }

        /// <summary>
        /// BroadCast an event to all application instances.
        /// </summary>
        /// <param name="name">The name of the event.</param>
        /// <param name="args">The event data.</param>
        [System.Diagnostics.CodeAnalysis.SuppressMessage("Design", "CA1062:Validate arguments of public methods", Justification = "Ok if null")]
        public void BroadCast(string name, App app, params object[] args)
        {
            if (string.IsNullOrWhiteSpace(name)) throw new ArgumentNullException(nameof(name));

            foreach (var a in _apps)
            {
                if (a != app)
                {
                    a.Emit(name, args);
                }
            }
        }

        /// <summary>
        /// Load global configurations.
        /// </summary>
        private static void LoadConfiguration()
        {
            // Load saved state
            try
            {
                SingleInstance = AppSettings.Get<bool>(Constants.Settings.SingleInstance);

                SqlLogger.Enabled = AppSettings.Get<bool>(Constants.Settings.SqlLoggingEnabled);
                SqlLogger.Retention = AppSettings.Get<int?>(Constants.Settings.SqlLoggingRetention);
                // Set the directory last as that will initialize the directory
                SqlLogger.Directory = AppSettings.GetOrDefault(Constants.Settings.SqlLoggingDirectory, Path.GetFullPath(Path.Combine(DataDirectory, Constants.Defaults.SqlLoggingDirectory)));

                ScriptLibraryDirectory = AppSettings.GetOrDefault(Constants.Settings.ScriptLibraryDirectory, Path.GetFullPath(Path.Combine(DataDirectory, Constants.Defaults.ScriptLibraryDirectory)));
            }
            catch (Exception e)
            {
                Logger.Warn($"Failed to apply AppSettings. Error: {e}");
            }
        }

        /// <summary>
        /// Save global configurations.
        /// </summary>
        private static void SaveConfiguration()
        {
            // These are global configurations
            AppSettings.Set(Constants.Settings.SqlLoggingEnabled, SqlLogger.Enabled);
            AppSettings.Set(Constants.Settings.SqlLoggingDirectory, SqlLogger.Directory);
            AppSettings.Set(Constants.Settings.SqlLoggingRetention, SqlLogger.Retention);
            AppSettings.Set(Constants.Settings.ScriptLibraryDirectory, ScriptLibraryDirectory);
            AppSettings.Set(Constants.Settings.SingleInstance, SingleInstance);

            AppSettings.Save();
        }

        /// <summary>
        /// Handles the form closed event
        /// </summary>
        protected override void OnMainFormClosed(object sender, EventArgs e)
        {
            if (sender is App app)
            {
                _apps.Remove(app);

                // If all application forms are closed then save settings an exit process
                if (_apps.Count == 0)
                {
                    SaveConfiguration();

                    base.OnMainFormClosed(sender, e);
                }
                else if (app == MainForm)
                {
                    // If the MainForm was closed then set the new main form
                    // Setting MainForm will also assign the OnMainFormClosed handler
                    // Remove the current handler so we don't have dup handlers
                    _apps[0].FormClosed -= OnMainFormClosed;
                    MainForm = _apps[0];
                }
            }
        }

        /// <summary>
        /// Get all current instances on the application. Ignore self.
        /// </summary>
        /// <returns>A list of other instance of this application.</returns>
        private static IEnumerable<Process> GetApplicationInstances()
        {
            var current = Process.GetCurrentProcess();
            var currentPath = current.MainModule.FileName;
            var processes = Process.GetProcessesByName(current.ProcessName);

            return processes.Where(p =>
                // Ignore the current process
                p.Id != current.Id &&
                // Match the exe path to allow for different versions
                p.MainModule.FileName == currentPath);
        }

        #region Properties

        /// <summary>
        /// Gets the directory path where the application is running.
        /// </summary>
        public static string AppDirectory => _appDirectory.Value;

        /// <summary>
        /// Gets the cache directory path.
        /// </summary>
        public static string CacheDirectory => _cacheDirectory.Value;

        /// <summary>
        /// Gets the Data directory path.
        /// </summary>
        public static string DataDirectory => _dataDirectory.Value;

        /// <summary>
        /// Get the application (assembly) GUID.
        /// </summary>
        public static string AppGuid => _appGuid.Value;

        /// <summary>
        /// Globally available logger.
        /// </summary>
        public static ILogger Logger { get; } = new Logger(LogLevel.All);

        /// <summary>
        /// Get or set whether only a single instance of this application is allowed.
        /// </summary>
        public static bool SingleInstance { get; set; }

        /// <summary>
        /// Get or set the path to the script library directory.
        /// </summary>
        public static string ScriptLibraryDirectory { get; set; }

        #endregion Properties
    }
}