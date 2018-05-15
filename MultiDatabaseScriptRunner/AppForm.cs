using CefSharp;
using CefSharp.WinForms;
using System;
using System.IO;
using System.Windows.Forms;

namespace Tokafew420.CefSharpWinFormTemplate
{
    public partial class AppForm : Form
    {
        private ChromiumWebBrowser _browser;
        private ScriptEvent _scriptEvent;
        private SystemEvent _systemEvent;

        public static string GetAppLocation()
        {
#if DEBUG
            // Use the project directory when in Debug mode
            // Output path is {project dir}/bin/{Configuration}/{Platform}/
            // ie: ./bin/x64/Debug
            return Directory.GetParent(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "../..")).FullName + "\\";
#else
            return AppDomain.CurrentDomain.BaseDirectory;
#endif
        }

        public AppForm()
        {
            InitializeComponent();
        }

        private void AppForm_Load(object sender, EventArgs e)
        {
            // The main entry point for the browser page is index.html
            var url = new Uri(string.Format("fs:///{0}Content/app.html", GetAppLocation()));

            _browser = new ChromiumWebBrowser(url.ToString());
            _systemEvent = new SystemEvent(_browser);
            _scriptEvent = new ScriptEvent(_browser);

            // Register keyboard event handler.
            _browser.KeyboardHandler = new KeyboardHandler();
            // Register the scriptEvent class with JS
            _browser.JavascriptObjectRepository.Register("scriptEvent", _scriptEvent, true, BindingOptions.DefaultBinder);

            MainPanel.Controls.Add(_browser);

            ChromeDevToolsSystemMenu.CreateSysMenu(this);

            // Initialize the app
            new App(this, _browser, _systemEvent, _scriptEvent);
        }

        protected override void WndProc(ref Message m)
        {
            base.WndProc(ref m);

            // Test if the About item was selected from the system menu
            if ((m.Msg == ChromeDevToolsSystemMenu.WM_SYSCOMMAND) && ((int)m.WParam == ChromeDevToolsSystemMenu.SYSMENU_CHROME_DEV_TOOLS))
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
        }
    }
}