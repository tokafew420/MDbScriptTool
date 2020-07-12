using System;

namespace Tokafew420.MDbScriptTool.Native
{
    [Flags]
    internal enum SHChangeNotifyFlags : uint
    {
        SHCNF_IDLIST = 0x0000,
        SHCNF_PATHA = 0x0001,
        SHCNF_PRINTERA = 0x0002,
        SHCNF_DWORD = 0x0003,
        SHCNF_PATHW = 0x0005,
        SHCNF_PRINTERW = 0x0006,
        SHCNF_TYPE = 0x00FF,
        SHCNF_FLUSH = 0x1000,
        SHCNF_FLUSHNOWAIT = 0x2000,
        SHCNF_PATH = SHCNF_PATHW,
        SHCNF_PRINTER = SHCNF_PRINTERW
    }
}