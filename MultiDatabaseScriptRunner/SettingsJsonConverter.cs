using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Text;

namespace Tokafew420.MDScriptRunner
{
    public class SettingsJsonConverter : JsonConverter
    {
        /// <summary>
        /// Returns true if type is of IDictionary&lt;string, object&gt;
        /// </summary>
        public override bool CanConvert(Type objectType)
        {
            return typeof(IDictionary<string, object>).IsAssignableFrom(objectType);
        }

        /// <summary>
        /// Reads the settings json.
        /// </summary>
        public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
        {
            var settings = JArray.Load(reader);

            var dic = Activator.CreateInstance(objectType) as IDictionary<string, object>;

            if (settings.Type == JTokenType.Array)
            {
                foreach (var setting in settings.Children())
                {
                    if (setting.Type == JTokenType.Object)
                    {
                        var key = setting.Value<string>("key");

                        if (!string.IsNullOrWhiteSpace(key))
                        {
                            var typename = setting.Value<string>("$type");

                            if (string.IsNullOrWhiteSpace(typename))
                            {
                                dic[key] = serializer.Deserialize(setting["value"].CreateReader());
                            }
                            else
                            {
                                var type = Type.GetType(typename, false, false);
                                dic[key] = serializer.Deserialize(setting["value"].CreateReader(), type);
                            }
                        }
                    }
                }
            }

            return dic;
        }

        /// <summary>
        /// Writes the JSON with type information when needed.
        /// </summary>
        public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer)
        {
            var dic = value as IDictionary<string, object>;

            if (dic == null) return;

            var stringType = typeof(string);
            //var typeType = typeof(Type);

            writer.WriteStartArray();
            foreach (var kv in dic)
            {
                if (!string.IsNullOrWhiteSpace(kv.Key) && kv.Value != null)
                {
                    var type = kv.Value.GetType();

                    writer.WriteStartObject();
                    writer.WritePropertyName("key");
                    serializer.Serialize(writer, kv.Key, stringType);
                    if (!type.IsPrimitive)
                    {
                        writer.WritePropertyName("$type");
                        serializer.Serialize(writer, type.AssemblyQualifiedName, stringType);
                    }
                    writer.WritePropertyName("value");
                    serializer.Serialize(writer, kv.Value, type);
                    writer.WriteEndObject();
                }
            }
            writer.WriteEndArray();
        }

        /// <summary>
        /// Remove type assembly info.
        /// Taken from: https://github.com/JamesNK/Newtonsoft.Json
        /// </summary>
        /// <param name="fullyQualifiedTypeName">The fully qualified type name.</param>
        /// <returns>The simplified type name.</returns>
        private static string RemoveAssemblyDetails(string fullyQualifiedTypeName)
        {
            var builder = new StringBuilder();

            // loop through the type name and filter out qualified assembly details from nested type names
            var writingAssemblyName = false;
            var skippingAssemblyDetails = false;
            for (int i = 0; i < fullyQualifiedTypeName.Length; i++)
            {
                char current = fullyQualifiedTypeName[i];
                switch (current)
                {
                    case '[':
                        writingAssemblyName = false;
                        skippingAssemblyDetails = false;
                        builder.Append(current);
                        break;

                    case ']':
                        writingAssemblyName = false;
                        skippingAssemblyDetails = false;
                        builder.Append(current);
                        break;

                    case ',':
                        if (!writingAssemblyName)
                        {
                            writingAssemblyName = true;
                            builder.Append(current);
                        }
                        else
                        {
                            skippingAssemblyDetails = true;
                        }
                        break;

                    default:
                        if (!skippingAssemblyDetails)
                        {
                            builder.Append(current);
                        }
                        break;
                }
            }

            return builder.ToString();
        }
    }
}