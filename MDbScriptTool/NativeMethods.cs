using System;
using System.Runtime.InteropServices;

namespace Tokafew420.MDbScriptTool
{
    internal static class NativeMethods
    {
        // P/Invoke constants
        public static readonly int WM_SYSCOMMAND = 0x112;

        [Flags]
        public enum MenuFlags : uint
        {
            MF_STRING = 0,
            MF_BYPOSITION = 0x400,
            MF_SEPARATOR = 0x800,
            MF_REMOVE = 0x1000,
        }

        // ID for the Chrome dev tools item on the system menu
        public static readonly IntPtr SYSMENU_CHROME_DEV_TOOLS = new IntPtr(0x1);

        // P/Invoke declarations
        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr GetSystemMenu(IntPtr hWnd, bool bRevert);

        [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern bool AppendMenu(IntPtr hMenu, MenuFlags uFlags, IntPtr uIDNewItem, string lpNewItem);

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
            AppendMenu(hSysMenu, MenuFlags.MF_STRING, SYSMENU_CHROME_DEV_TOOLS, "&Chrome Dev Tools");
        }
    }
}