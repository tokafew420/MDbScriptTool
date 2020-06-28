using System;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using CefSharp;
using CefSharp.WinForms;
using Tokafew420.MDbScriptTool.Handlers;
using Tokafew420.MDbScriptTool.Logging;

namespace Tokafew420.MDbScriptTool
{
    public partial class App : Form
    {
        private readonly ChromiumWebBrowser _browser;
        private readonly AppHandlers _appHandler;
        private readonly CompositeLogger _compositeLogger;
        private readonly BrowserLogger _browserLogger;
        private bool _logToDevConsole;
        private string _lastFileDialogDirectory;

        public App(AppContext context)
        {
            Context = context ?? throw new ArgumentNullException(nameof(context));

            // The main entry point for the browser page is index.html
            var url = new Uri($"fs:///{AppContext.AppDirectory}app.html");

            _browser = new ChromiumWebBrowser(url.ToString());
            _browserLogger = new BrowserLogger(_browser);
            _compositeLogger = CompositeLogger.Create(AppContext.Logger);

            // Initialize the app
            _appHandler = new AppHandlers(this, _browser);

            InitializeComponent();
        }

        private void AppForm_Load(object sender, EventArgs e)
        {
            // Register custom handlers.
            _browser.RequestHandler = new BrowserRequestHandler(this, _browser);
            _browser.KeyboardHandler = new KeyboardHandler(this, _browser);
            _browser.DialogHandler = new FileDialogHandler(this, _browser);
            _browser.DownloadHandler = new DownloadHandler(this, _browser);
            _browser.DragHandler = new DragDropHandler(this, _browser);

            // Register the uiEvent class with JS
            _browser.JavascriptObjectRepository.Register("uiEvent", _appHandler.UiEvent, true, BindingOptions.DefaultBinder);

            MainPanel.Controls.Add(_browser);

            NativeMethods.CreateSysMenu(this);

            AppSettings.Saved += ResyncSettings;

            // Load saved state
            try
            {
                _logToDevConsole = AppSettings.Get<bool>(Constants.Settings.LogToDevConsole);
                Logger.Level = AppSettings.GetOrDefault(Constants.Settings.LogLevel, LogLevel.Warn);

                _lastFileDialogDirectory = AppSettings.Get<string>(Constants.Settings.LastFileDialogDirectory) ?? "";

                Location = AppSettings.Get<Point?>(Constants.Settings.WindowLocation) ?? Location;
                Size = AppSettings.Get<Size?>(Constants.Settings.WindowSize) ?? Size;
                WindowState = AppSettings.Get<bool>(Constants.Settings.WindowIsMaximized) ? FormWindowState.Maximized : WindowState;

                RestoreWindowLocation();
            }
            catch (Exception ex)
            {
                Logger.Warn($"Failed to apply AppSettings. Error: {ex}");
            }
        }

        /// <summary>
        /// Custom handling for windows messages
        /// </summary>
        /// <param name="m">The message received.</param>
        protected override void WndProc(ref Message m)
        {
            if (m.Msg == NativeMethods.WM_COPYDATA)
            {
                var cds = (NativeMethods.CopyDataStruct)Marshal.PtrToStructure(m.LParam, typeof(NativeMethods.CopyDataStruct));
                var data = Marshal.PtrToStringUni(cds.lpData);
                if (data == "Cmd:New Window")
                {
                    Context.CreateNewApplicationInstance();
                }
            }
            // Test if the Chrome Dev Tools item was selected from the system menu
            else if ((m.Msg == NativeMethods.WM_SYSCOMMAND) && (m.WParam == NativeMethods.SYSMENU_CHROME_DEV_TOOLS))
            {
                _browser.ShowDevTools();
            }
            else
            {
                base.WndProc(ref m);
            }
        }

        /// <summary>
        /// Restore the window location. If the window's title bar is off screen then reset to the primary screen.
        /// </summary>
        private void RestoreWindowLocation()
        {
            var screens = Screen.AllScreens;
            var isOnScreen = false;
            var border = (Width - ClientSize.Width) / 2;    // Account for border which is off screen
            var topLeft = new Point(Left + border, Top + border);
            var topRight = new Point(Right - border, Top + border);

            foreach (var screen in screens)
            {
                // As long as the titlebar is on screen so that it can be moved, we'll leave it alone
                if (screen.WorkingArea.Contains(topLeft) || screen.WorkingArea.Contains(topRight))
                {
                    isOnScreen = true;
                    break;
                }
            }

            if (!isOnScreen)
            {
                Location = new Point(Screen.PrimaryScreen.WorkingArea.Left - border, Screen.PrimaryScreen.WorkingArea.Top - border);
                WindowState = FormWindowState.Normal;
            }

            // Don't hide other opened forms. 
            while (Context.IsHidingAnotherForm(this))
            {
                // Stagger the new form.
                Location = new Point(Location.X + 20, Location.Y + 20);
            }
        }

        /// <summary>
        /// Handle the settings saved event. In cases when there's multiple instances
        /// we want to notify other instances of changes.
        /// </summary>
        private void ResyncSettings(object sender, EventArgs e)
        {
            if (sender != this &&
                _browser != null &&
                _appHandler != null)
            {

                // Trigger the UI to reload its settings.
                _appHandler.GetSettings(null);
            }
        }

        private void AppForm_Closing(object sender, FormClosingEventArgs e)
        {
            AppSettings.Saved -= ResyncSettings;

            //Comment out Cef.Shutdown() call - it will be automatically called when exiting the application.
            //Due to a timing issue and the way the WCF service closes it's self in newer versions, it can be best to leave CefSharp to clean it's self up.
            //Alternative solution is to set the WCF timeout to Zero (or a smaller number) using CefSharp.CefSharpSettings.WcfTimeout = TimeSpan.Zero;
            // This must be done before creating any ChromiumWebBrowser instance
            //Cef.Shutdown();

            // These are configurations per app instance.
            // Save window state
            AppSettings.Set(Constants.Settings.WindowLocation, new Point?(Location));

            // Copy window size to app settings
            if (WindowState == FormWindowState.Normal)
            {
                AppSettings.Set(Constants.Settings.WindowSize, new Size?(Size));
            }
            else
            {
                AppSettings.Set(Constants.Settings.WindowSize, new Size?(RestoreBounds.Size));
            }
            AppSettings.Set(Constants.Settings.WindowIsMaximized, WindowState == FormWindowState.Maximized);

            AppSettings.Set(Constants.Settings.LogLevel, Logger.Level);

            AppSettings.Save(this);
        }

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                if (components != null) components.Dispose();
                if (_browser != null) _browser.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Properties

        public AppContext Context { get; }

        /// <summary>
        /// Get whether this application instance is the main form.
        /// </summary>
        public bool IsMainForm => Context.MainForm == this;

        /// <summary>
        /// Get or set the last directory path used from a file dialog.
        /// </summary>
        public string LastFileDialogDirectory
        {
            get => _lastFileDialogDirectory;
            set
            {
                _lastFileDialogDirectory = value;
                AppSettings.Set(Constants.Settings.LastFileDialogDirectory, _lastFileDialogDirectory);
            }
        }

        /// <summary>
        /// Get the application's logger.
        /// </summary>
        public ILogger Logger => _compositeLogger;

        /// <summary>
        /// Get or set whether log message should be written to the browser console.
        /// </summary>
        public bool LogToDevConsole
        {
            get => _logToDevConsole;
            set
            {
                _logToDevConsole = value;
                AppSettings.Set(Constants.Settings.LogToDevConsole, _logToDevConsole);

                _compositeLogger.RemoveTypeOf<BrowserLogger>();
                if (_logToDevConsole)
                {
                    _compositeLogger.Add(_browserLogger);
                }
            }
        }

        #endregion Properties
    }
}