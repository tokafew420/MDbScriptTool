using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Text;
using Newtonsoft.Json;
using Tokafew420.MDbScriptTool.Logging;

namespace Tokafew420.MDbScriptTool
{
    internal static class AppSettings
    {
        static AppSettings()
        {
            Path = System.IO.Path.Combine(AppContext.DataDirectory, "settings");

            if (!Directory.Exists(AppContext.DataDirectory))
            {
                try
                {
                    Directory.CreateDirectory(AppContext.DataDirectory);
                    AppContext.Logger.Debug("Created Data/ Directory");
                }
                catch (Exception e)
                {
                    AppContext.Logger.Error($"Failed to create Data/ directory. Error: {e}");
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

                    AppContext.Logger.Debug("Loaded AppSettings");
                }
                catch (Exception e)
                {
                    AppContext.Logger.Error($"Failed to load AppSettings. Error: {e}");
                }
            }
            else
            {
                try
                {
                    using (File.Create(Path)) { };
                    AppContext.Logger.Debug("Created AppSettings");
                }
                catch (Exception e)
                {
                    AppContext.Logger.Error($"Failed to create AppSettings. Error: {e}");
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
            if (string.IsNullOrWhiteSpace(key)) throw new ArgumentNullException(nameof(key));

            if (Settings.ContainsKey(key))
            {
                return (T)Settings[key];
            }

            return default;
        }

        /// <summary>
        /// Get the app setting specified by the key name.
        /// </summary>
        /// <typeparam name="T">The return type</typeparam>
        /// <param name="name">The settings key.</param>
        /// <returns>The settings value.</returns>
        public static T GetOrDefault<T>(string key, T defaultValue)
        {
            if (string.IsNullOrWhiteSpace(key)) throw new ArgumentNullException(nameof(key));

            if (Settings.ContainsKey(key))
            {
                return (T)Settings[key];
            }

            return defaultValue;
        }

        /// <summary>
        /// Set a value into the app settings.
        /// </summary>
        /// <param name="key">The settings key.</param>
        /// <param name="value">The settings value.</param>
        public static void Set(string key, object value)
        {
            if (string.IsNullOrWhiteSpace(key)) throw new ArgumentNullException(nameof(key));

            Settings[key] = value;
        }

        /// <summary>
        /// Saves the app settings to persistent storage.
        /// </summary>
        /// <param name="sender">The source object calling doing the save. Will be passed along as the event sender.</param>
        public static void Save(object sender = null)
        {
            try
            {
                if (!Directory.Exists(AppContext.DataDirectory))
                {
                    Directory.CreateDirectory(AppContext.DataDirectory);
                    AppContext.Logger.Debug("Created Data/ Directory");
                }

                File.WriteAllText(Path, JsonConvert.SerializeObject(Settings, new SettingsJsonConverter()), Encoding.UTF8);
                AppContext.Logger.Debug("Saved AppSettings");
                Saved(sender, EventArgs.Empty);
            }
            catch (Exception e)
            {
                AppContext.Logger.Error($"Failed to save AppSetting. Error: {e}");
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

        /// <summary>
        /// An event that fires when settings are saved.
        /// </summary>
        /// <remarks>Initialize with delegate so we don't have to do null checking.</remarks>
        public static event EventHandler Saved = delegate { };
    }
}