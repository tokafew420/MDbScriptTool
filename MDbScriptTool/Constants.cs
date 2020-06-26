namespace Tokafew420.MDbScriptTool
{
    /// <summary>
    /// Class for all constants (ie: String keys, Identifiers, etc...)
    /// </summary>
    internal class Constants
    {
        /// <summary>
        /// Setting keys.
        /// </summary>
        internal class Settings
        {
            public const string AddOnJs = "AddOnJs";
            public const string AddOnCss = "AddOnCss";
            public const string LastFileDialogDirectory = "LastFileDialogDirectory";
            public const string LogLevel = "LogLevel";
            public const string LogToDevConsole = "LogToDevConsole";
            public const string ScriptLibraryDirectory = "ScriptLibraryDirectory";
            public const string SingleInstance = "SingleInstance";
            public const string SqlLoggingEnabled = "SqlLoggingEnabled";
            public const string SqlLoggingDirectory = "SqlLoggingDirectory";
            public const string SqlLoggingRetention = "SqlLoggingRetention";
            public const string WindowIsMaximized = "WindowIsMaximized";
            public const string WindowLocation = "WindowLocation";
            public const string WindowSize = "WindowSize";
        }

        /// <summary>
        /// Default values.
        /// </summary>
        internal class Defaults
        {
            public const string SqlLoggingDirectory = "Logs";
            public const string ScriptLibraryDirectory = "Scripts";
        }
    }
}