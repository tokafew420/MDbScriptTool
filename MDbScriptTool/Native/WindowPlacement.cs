using System;
using System.Drawing;
using System.Runtime.InteropServices;

namespace Tokafew420.MDbScriptTool.Native
{
    [Serializable]
    [StructLayout(LayoutKind.Sequential)]
    internal struct WindowPlacement
    {
#pragma warning disable IDE1006 // Naming rule violation
        public int length;
        public int flags;
        public int showCmd;
        public Point ptMinPosition;
        public Point ptMaxPosition;
        public Rectangle rcNormalPosition;
#pragma warning restore IDE1006 // Naming rule violation
    }
}