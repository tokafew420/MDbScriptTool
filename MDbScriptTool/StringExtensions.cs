using System;
using System.Globalization;
using System.Text;

namespace Tokafew420.MDbScriptTool
{
    /// <summary>
    /// String extensions.
    /// </summary>
    public static class StringExtensions
    {
        /// <summary>
        /// Return a default value if the string is null or contains only whitespace.
        /// </summary>
        /// <param name="value">The value to inspect.</param>
        /// <param name="defaultValue">The default value.</param>
        /// <returns>The string value.</returns>
        public static string DefaultIfNullOrWhiteSpace(this string value, string defaultValue = "")
        {
            if (string.IsNullOrWhiteSpace(value)) return defaultValue ?? "";
            return value;
        }

        /// <summary>
        /// Format a log message with the specified parameters.
        /// </summary>
        /// <param name="message">The format message.</param>
        /// <param name="args">The message parameters.</param>
        /// <returns>The formatted message.</returns>
        public static string Format(this string message, object[] args)
        {
            if (!string.IsNullOrWhiteSpace(message) && args?.Length > 0)
            {
                return string.Format(CultureInfo.CurrentCulture, message ?? "", args);
            }
            return message;
        }

        /// <summary>
        /// Encode a string to Base64.
        /// </summary>
        /// <param name="value">The string to encode.</param>
        /// <param name="encoding">The string encoding. Default to UTF8.</param>
        /// <returns>The base64 encoded string.</returns>
        public static string ToBase64(this string value, Encoding encoding = null) => Convert.ToBase64String((encoding ?? Encoding.UTF8).GetBytes(value ?? ""));

        /// <summary>
        /// Decode a base64 string.
        /// </summary>
        /// <param name="base64">The string to decode.</param>
        /// <param name="encoding">The string encoding. Default to UTF8.</param>
        /// <returns>The decoded string.</returns>
        public static string FromBase64(this string base64, Encoding encoding = null) => (encoding ?? Encoding.UTF8).GetString(Convert.FromBase64String(base64 ?? ""));

#pragma warning disable CA1055 // Uri return values should not be strings
#pragma warning disable CA1054 // Uri parameters should not be strings

        /// <summary>
        /// Make a base64 string safe for URL usage.
        /// </summary>
        /// <param name="base64">The base64 encoded string.</param>
        /// <returns>The URL safe base64 string.</returns>
        public static string MakeBase64UrlSafe(this string base64) => (base64 ?? "").TrimEnd('=').Replace('+', '-').Replace('/', '_');

        /// <summary>
        /// Make a base64 string safe for URL usage.
        /// </summary>
        /// <param name="base64Url">The base64 encoded string.</param>
        /// <returns>The URL safe base64 string.</returns>
        public static string MakeBase64UrlUnsafe(this string base64Url)
        {
            base64Url = (base64Url ?? "")
               .Replace('_', '/')
               .Replace('-', '+');

            switch (base64Url.Length % 4)
            {
                case 2:
                    base64Url += "==";
                    break;

                case 3:
                    base64Url += "=";
                    break;
            }

            return base64Url;
        }

        /// <summary>
        /// Encode a string to a URL safe Base64 string.
        /// </summary>
        /// <param name="value">The string to encode.</param>
        /// <param name="encoding">The string encoding. Default to UTF8.</param>
        /// <returns>The base64 URL safe encoded string.</returns>
        public static string ToUrlSafeBase64(this string value, Encoding encoding = null) => value.ToBase64(encoding).MakeBase64UrlSafe();

        /// <summary>
        /// Decode a URL safe base64 string.
        /// </summary>
        /// <param name="base64Url">The string to decode.</param>
        /// <param name="encoding">The string encoding. Default to UTF8.</param>
        /// <returns>The decoded string.</returns>
        public static string FromUrlSafeBase64(this string base64Url, Encoding encoding = null) => base64Url.MakeBase64UrlUnsafe().FromBase64(encoding);

#pragma warning restore CA1054 // Uri parameters should not be strings
#pragma warning restore CA1055 // Uri return values should not be strings
    }
}