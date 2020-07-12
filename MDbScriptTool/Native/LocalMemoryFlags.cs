using System;

namespace Tokafew420.MDbScriptTool.Native
{
    /// <summary>
    /// These flags may be used with the LocalAlloc function.
    /// </summary>
    [Flags]
    internal enum LocalMemoryFlags : uint
    {
        LMEM_FIXED = 0x0000,
        LMEM_MOVEABLE = 0x0002,
        LMEM_NOCOMPACT = 0x0010,
        LMEM_NODISCARD = 0x0020,
        LMEM_ZEROINIT = 0x0040,
        LMEM_MODIFY = 0x0080,
        LMEM_DISCARDABLE = 0x0F00,
        LMEM_VALID_FLAGS = 0x0F72,
        LMEM_INVALID_HANDLE = 0x8000,
        LHND = LMEM_MOVEABLE | LMEM_ZEROINIT,
#pragma warning disable CA1069 // Enums values should not be duplicated
        LPTR = LMEM_FIXED | LMEM_ZEROINIT,
#pragma warning restore CA1069 // Enums values should not be duplicated
        NONZEROLHND = LMEM_MOVEABLE,
        NONZEROLPTR = LMEM_FIXED
    }
}