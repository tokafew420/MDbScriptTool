using Newtonsoft.Json;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;

namespace Tokafew420.MDbScriptTool
{
    internal static class AppSettings
    {
        private static string _filePath;

        static AppSettings()
        {
            _filePath = System.IO.Path.Combine(Program.DataDirectory, "settings");

            if (!Directory.Exists(Program.DataDirectory))
            {
                try
                {
                    Directory.CreateDirectory(Program.DataDirectory);
                    Debug.WriteLine("Created Data/ Directory");
                }
                catch (Exception e)
                {
                    Debug.WriteLine("Failed to create Data/ directory");
                    Debug.WriteLine(e.ToString());
                }
            }

            if (File.Exists(_filePath))
            {
                // Load app settings
                try
                {
                    var loadedSettings = JsonConvert.DeserializeObject<ConcurrentDictionary<string, object>>(File.ReadAllText(_filePath), new SettingsJsonConverter());
                    if (loadedSettings != null)
                    {
                        // Reinitialize a new dictionary to keep the string comparer
                        Settings = new ConcurrentDictionary<string, object>(loadedSettings, StringComparer.OrdinalIgnoreCase);
                    }

                    Debug.WriteLine("Loaded AppSettings");
                }
                catch (Exception e)
                {
                    Debug.WriteLine("Failed to load AppSettings");
                    Debug.WriteLine(e.ToString());
                }
            }
            else
            {
                try
                {
                    File.Create(_filePath);
                    Debug.WriteLine("Created AppSettings");
                }
                catch (Exception e)
                {
                    Debug.WriteLine("Failed to create AppSettings");
                    Debug.WriteLine(e.ToString());
                }
            }
        }

        /// <summary>
        /// Get the app setting specified by the key name.
        /// </summary>
        /// <typeparam name="T">The return type</typeparam>
        /// <param name="name"></param>
        /// <returns></returns>
        public static T Get<T>(string key)
        {
            if (string.IsNullOrWhiteSpace(key)) return default(T);

            if (Settings.ContainsKey(key))
            {
                return (T)Settings[key];
            }

            return default(T);
        }

        /// <summary>
        /// Set a value into the app settings.
        /// </summary>
        /// <param name="key">The setting key.</param>
        /// <param name="value">The setting value.</param>
        public static void Set(string key, object value)
        {
            if (string.IsNullOrWhiteSpace(key)) throw new ArgumentNullException("key");

            Settings[key] = value;
        }

        /// <summary>
        /// Saves the app settings to persistent storage.
        /// </summary>
        public static void Save()
        {
            try
            {
                if (!Directory.Exists(Program.DataDirectory))
                {
                    Directory.CreateDirectory(Program.DataDirectory);
                    Debug.WriteLine("Created Data/ Directory");
                }

                File.WriteAllText(_filePath, JsonConvert.SerializeObject(Settings, new SettingsJsonConverter()), Encoding.UTF8);
                Debug.WriteLine("Saved AppSettings");
            }
            catch (Exception e)
            {
                Debug.WriteLine("Failed to save AppSetting");
                Debug.WriteLine(e.ToString());
            }
        }

        /// <summary>
        /// Get the path to the settings file.
        /// </summary>
        public static string Path => _filePath;

        /// <summary>
        /// Get the app settings.
        /// </summary>
        public static IDictionary<string, object> Settings { get; } = new ConcurrentDictionary<string, object>(StringComparer.OrdinalIgnoreCase);
    }
}