using System;
using System.Security.Cryptography;
using System.Text;

namespace Tokafew420.MDbScriptTool
{
    /// <summary>
    /// A class that handles cryptography.
    /// </summary>
    internal static class Crypto
    {
        private static readonly Random _rnd = new Random();

        /// <summary>
        /// Encrypts the clearText.
        /// </summary>
        /// <param name="clearText">The clear text to encrypt.</param>
        /// <returns>The cipher text.</returns>
        public static string Encrypt(string clearText)
        {
            byte[] bytes;
            var salt = new byte[32];

            if (clearText == null)
            {
                bytes = Array.Empty<byte>();
            }
            else
            {
                bytes = Encoding.UTF8.GetBytes(clearText);
            }

            _rnd.NextBytes(salt);

            var cipher = ProtectedData.Protect(bytes, salt, DataProtectionScope.CurrentUser);
            var final = new byte[cipher.Length + 32];

            Buffer.BlockCopy(salt, 0, final, 0, 32);
            Buffer.BlockCopy(cipher, 0, final, 32, cipher.Length);

            return Convert.ToBase64String(final).MakeBase64UrlSafe();
        }

        /// <summary>
        /// Decrypts the cipher text.
        /// </summary>
        /// <param name="cipher">The cipher text to decrypt.</param>
        /// <returns>The decrypted clear text.</returns>
        public static string Decrypt(string cipher)
        {
            var bytes = Convert.FromBase64String(cipher.MakeBase64UrlUnsafe());
            var salt = new byte[32];
            var tmpCipher = new byte[bytes.Length - 32];

            Buffer.BlockCopy(bytes, 0, salt, 0, 32);
            Buffer.BlockCopy(bytes, 32, tmpCipher, 0, tmpCipher.Length);

            return Encoding.UTF8.GetString(ProtectedData.Unprotect(tmpCipher, salt, DataProtectionScope.CurrentUser));
        }

        /// <summary>
        /// Tries to decrypt the cipher text. If the decryption fails, then return the original cipher.
        /// </summary>
        /// <param name="cipher">The cipher to decrypt.</param>
        /// <returns>The decrypted cipher if decryption is successful, otherwise the original cipher.</returns>
        public static bool TryDecrypt(string cipher, out string clearText)
        {
            clearText = "";
            if (string.IsNullOrWhiteSpace(cipher)) return false;

            try
            {
                clearText = Decrypt(cipher);
                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}