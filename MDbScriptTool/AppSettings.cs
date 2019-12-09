using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Text;
using Newtonsoft.Json;

namespace Tokafew420.MDbScriptTool
{
    internal static class AppSettings
    {
        static AppSettings()
        {
            Path = System.IO.Path.Combine(Application.DataDirectory, "settings");

            if (!Directory.Exists(Application.DataDirectory))
            {
                try
                {
                    Directory.CreateDirectory(Application.DataDirectory);
                    Logger.Debug("Created Data/ Directory");
                }
                catch (Exception e)
                {
                    Logger.Error("Failed to create Data/ directory");
                    Logger.Error(e.ToString());
                }
            }

            if (File.Exists(Path))
            {
                // Load app settings
                try
                {
                    var loadedSettings = JsonConvert.DeserializeObject<ConcurrentDictionary<string, object>>(File.ReadAllText(Path), new SettingsJsonConverter());
                    if (loadedSettings != null)
                    {
                        // Reinitialize a new dictionary to keep the string comparer
                        Settings = new ConcurrentDictionary<string, object>(loadedSettings, StringComparer.OrdinalIgnoreCase);
                    }

                    Logger.Debug("Loaded AppSettings");
                }
                catch (Exception e)
                {
                    Logger.Error("Failed to load AppSettings");
                    Logger.Error(e.ToString());
                }
            }
            else
            {
                try
                {
                    File.Create(Path);
                    Logger.Debug("Created AppSettings");
                }
                catch (Exception e)
                {
                    Logger.Error("Failed to create AppSettings");
                    Logger.Error(e.ToString());
                }
            }
        }

        /// <summary>
        /// Get a value indicating whether the app settings exist.
        /// </summary>
        /// <param name="name">The settings key.</param>
        /// <returns>true if a settings value was saved, otherwise false.</returns>
        public static bool Exists(string key)
        {
            if (string.IsNullOrWhiteSpace(key)) return false;

            return Settings.ContainsKey(key);
        }

        /// <summary>
        /// Get the app setting specified by the key name.
        /// </summary>
        /// <typeparam name="T">The return type</typeparam>
        /// <param name="name">The settings key.</param>
        /// <returns>The settings value.</returns>
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
        /// <param name="key">The settings key.</param>
        /// <param name="value">The settings value.</param>
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
                if (!Directory.Exists(Application.DataDirectory))
                {
                    Directory.CreateDirectory(Application.DataDirectory);
                    Logger.Debug("Created Data/ Directory");
                }

                File.WriteAllText(Path, JsonConvert.SerializeObject(Settings, new SettingsJsonConverter()), Encoding.UTF8);
                Logger.Debug("Saved AppSettings");
            }
            catch (Exception e)
            {
                Logger.Error("Failed to save AppSetting");
                Logger.Error(e.ToString());
            }
        }

        /// <summary>
        /// Get the path to the settings file.
        /// </summary>
        public static string Path { get; private set; }

        /// <summary>
        /// Get the app settings.
        /// </summary>
        public static IDictionary<string, object> Settings { get; } = new ConcurrentDictionary<string, object>(StringComparer.OrdinalIgnoreCase);
    }
}