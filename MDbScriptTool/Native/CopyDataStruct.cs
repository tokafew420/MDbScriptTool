using System;

namespace Tokafew420.MDbScriptTool.Native
{
    internal struct CopyDataStruct : IDisposable
    {
#pragma warning disable IDE1006 // Naming rule violation

        /// <summary>
        /// Any value the sender chooses.
        /// </summary>
        public IntPtr dwData;

        /// <summary>
        /// The count of bytes in the message.
        /// </summary>
        public UIntPtr cbData;

        /// <summary>
        /// The address of the message.
        /// </summary>
        public IntPtr lpData;

        public void Dispose()
        {
            if (lpData != IntPtr.Zero)
            {
                NativeMethods.LocalFree(lpData);
                lpData = IntPtr.Zero;
            }
        }

#pragma warning restore IDE1006 // Naming rule violation
    }
}