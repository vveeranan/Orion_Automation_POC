using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text.RegularExpressions;

namespace TestDataGenerator
{
    /// <summary>
    /// Runs PowerShell scripts for test setups.
    /// </summary>
    public static class PowerShellRunner
    {
        // The folder the Get-Orion-Services-Versions.ps1 script reads. It only exists on the Orion web server.
        private const string LocalServicesFolder = @"C:\inetpub\wwwroot\Plexis Worker Portal - QC\bin";

        /// <summary>
        /// Runs Get-Orion-Services-Versions.ps1 and returns the QC service versions it reports, keyed by DLL name
        /// (for example "Plexis.API.Claims.Services.dll" -> "2.14.0.0").
        /// The script reads the Orion web server's install folder, so when that folder is not on this machine the
        /// script is run unchanged on the services server through PowerShell remoting (Invoke-Command -FilePath).
        /// Only the 'QC Services Info' section is read; the 'PCM Services Info' section is ignored.
        /// </summary>
        public static Dictionary<string, string> GetOrionServiceVersions(string scriptPath, string servicesServer)
        {
            var command = Directory.Exists(LocalServicesFolder)
                ? $"& '{scriptPath}'"
                : $"Invoke-Command -ComputerName '{servicesServer}' -FilePath '{scriptPath}'";

            var output = Run(command);
            var versions = new Dictionary<string, string>();
            var row = new Regex(@"^\s*(Plexis\.\S+\.dll)\s+(\d[\d.]*)\s*$", RegexOptions.IgnoreCase);

            foreach (var line in output.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None))
            {
                // Everything after this heading belongs to PCM, not QC
                if (line.TrimStart().StartsWith("PCM Services Info", StringComparison.OrdinalIgnoreCase))
                {
                    break;
                }

                var match = row.Match(line);
                if (match.Success)
                {
                    versions[match.Groups[1].Value] = match.Groups[2].Value;
                }
            }

            return versions;
        }

        private static string Run(string command)
        {
            var psi = new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = $"-NoProfile -ExecutionPolicy Unrestricted -Command \"{command}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using (var process = Process.Start(psi))
            {
                var output = process.StandardOutput.ReadToEnd();
                var error = process.StandardError.ReadToEnd();
                process.WaitForExit(120000);

                if (!string.IsNullOrWhiteSpace(error))
                {
                    LoggerContext.Log.Message($"PowerShell reported: {error.Trim()}");
                }

                return output;
            }
        }
    }
}
