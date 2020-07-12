using System;
using System.Runtime.InteropServices;

namespace Tokafew420.MDbScriptTool.Native
{
    internal static class NativeMethods
    {
        #region P/Invoke constants

        public const int ATTACH_PARENT_PROCESS = -1;
        public const int WM_SYSCOMMAND = 0x112;
        public const int WM_COPYDATA = 0x004A;

        // ID for the Chrome dev tools item on the system menu
        public static readonly IntPtr SYSMENU_CHROME_DEV_TOOLS = new IntPtr(0x1);

        #endregion P/Invoke constants

        #region P/Invoke declarations

        #region kernel32.dll

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool AttachConsole(int dwProcessId);

        [DllImport("kernel32.dll", SetLastError = true, ExactSpelling = true)]
        public static extern bool FreeConsole();

        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern IntPtr LoadLibrary(string libname);

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern IntPtr LocalAlloc(LocalMemoryFlags flag, UIntPtr size);

        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern IntPtr LocalFree(IntPtr p);

        #endregion kernel32.dll

        #region shell32.dll

        [DllImport("shell32.dll")]
        public static extern void SHChangeNotify(HChangeNotifyEventID wEventId, SHChangeNotifyFlags uFlags, IntPtr dwItem1, IntPtr dwItem2);

        #endregion shell32.dll

        #region user32.dll

        [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern bool AppendMenu(IntPtr hMenu, MenuFlags uFlags, IntPtr uIDNewItem, string lpNewItem);

        /// <summary>
        /// Retrieves a handle to the foreground window (the window with which the user is currently working). The system
        /// assigns a slightly higher priority to the thread that creates the foreground window than it does to other threads.
        /// <para>See https://msdn.microsoft.com/en-us/library/windows/desktop/ms633505%28v=vs.85%29.aspx for more information.</para>
        /// </summary>
        /// <returns>
        /// The return value is a handle to the foreground window. The foreground window
        /// can be NULL in certain circumstances, such as when a window is losing activation.
        /// </returns>
        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr GetSystemMenu(IntPtr hWnd, bool bRevert);

        /// <summary>
        /// Retrieves the show state and the restored, minimized, and maximized positions of the specified window.
        /// </summary>
        /// <param name="hWnd">
        /// A handle to the window.
        /// </param>
        /// <param name="lpwndpl">
        /// A pointer to the WINDOWPLACEMENT structure that receives the show state and position information.
        /// <para>
        /// Before calling GetWindowPlacement, set the length member to sizeof(WINDOWPLACEMENT). GetWindowPlacement fails if lpwndpl-> length is not set correctly.
        /// </para>
        /// </param>
        /// <returns>
        /// If the function succeeds, the return value is nonzero.
        /// <para>
        /// If the function fails, the return value is zero. To get extended error information, call GetLastError.
        /// </para>
        /// </returns>
        [DllImport("user32.dll", SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool GetWindowPlacement(IntPtr hWnd, ref WindowPlacement lpwndpl);

        [DllImport("user32.dll")]
        public static extern IntPtr SendMessage(IntPtr hWnd, int Msg, IntPtr wParam, ref CopyDataStruct lParam);

        [DllImport("user32.dll")]
        public static extern int SetForegroundWindow(IntPtr hwnd);

        [DllImport("user32.dll")]
        public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, SetWindowPosFlags uFlags);

        [DllImport("user32.dll")]
        public static extern bool ShowWindow(IntPtr handle, CmdShow nCmdShow);

        #endregion user32.dll

        #endregion P/Invoke declarations

        public static void CreateSysMenu(System.Windows.Forms.Form frm)
        {
            // in your form override the OnHandleCreated function and call this method e.g:
            // protected override void OnHandleCreated(EventArgs e)
            // {
            //     ChromeDevToolsSystemMenu.CreateSysMenu(frm,e);
            // }

            // Get a handle to a copy of this form's system (window) menu
            var hSysMenu = GetSystemMenu(frm.Handle, false);

            // Add a separator
            AppendMenu(hSysMenu, MenuFlags.MF_SEPARATOR, new IntPtr(0), string.Empty);

            // Add the About menu item
            AppendMenu(hSysMenu, MenuFlags.MF_STRING, SYSMENU_CHROME_DEV_TOOLS, "&Chrome Dev Tools\tF12");
        }

        public static WindowPlacement GetPlacement(IntPtr handle)
        {
            var placement = new WindowPlacement();
            placement.length = Marshal.SizeOf(placement);
            GetWindowPlacement(handle, ref placement);

            return placement;
        }
    }
}