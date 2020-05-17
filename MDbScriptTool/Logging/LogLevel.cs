namespace Tokafew420.MDbScriptTool.Logging
{
    /// <summary>
    /// The log severity.
    /// </summary>
    public enum LogLevel
    {
        None = 0,
        Error = 1,
        Warn = 2,
        Info = 4,
        Debug = 8,
        All = Error | Warn | Info | Debug
    }
}