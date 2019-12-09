namespace Tokafew420.MDbScriptTool
{
    /// <summary>
    /// String extensions.
    /// </summary>
    internal static class StringExtensions
    {
        public static string DefaultIfNullOrWhiteSpace(this string value, string defaultValue)
        {
            if (string.IsNullOrWhiteSpace(value)) return defaultValue;
            return value;
        }
    }
}