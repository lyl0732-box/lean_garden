// Native launchers let the unchanged vendor scripts invoke python3 and gradlew
// on Windows. They run the real Python interpreter and official Gradle Wrapper.
using System;
using System.Diagnostics;
using System.IO;
using System.Text;

class AndroidToolLauncher {
    static string Quote(string value) {
        var b = new StringBuilder("\""); int slashes = 0;
        foreach (char c in value) {
            if (c == '\\') { slashes++; continue; }
            if (c == '"') { b.Append('\\', slashes * 2 + 1); b.Append('"'); }
            else { b.Append('\\', slashes); b.Append(c); }
            slashes = 0;
        }
        b.Append('\\', slashes * 2); return b.Append('"').ToString();
    }
    static int Main(string[] args) {
        try {
            Console.OutputEncoding = new UTF8Encoding(false); Console.InputEncoding = Encoding.UTF8;
            string executable = Process.GetCurrentProcess().MainModule.FileName;
            string name = Path.GetFileNameWithoutExtension(executable).ToLowerInvariant();
            var command = new StringBuilder(); string target;
            if (name == "python3") {
                target = Environment.GetEnvironmentVariable("GARDEN_PYTHON_EXE");
                if (String.IsNullOrEmpty(target)) throw new Exception("GARDEN_PYTHON_EXE is required.");
            } else {
                string javaHome = Environment.GetEnvironmentVariable("JAVA_HOME");
                target = String.IsNullOrEmpty(javaHome) ? "java.exe" : Path.Combine(javaHome, "bin", "java.exe");
                string jar = Path.Combine(Path.GetDirectoryName(executable), "gradle", "wrapper", "gradle-wrapper.jar");
                command.Append("-Dorg.gradle.appname=gradlew -classpath ").Append(Quote(jar)).Append(" org.gradle.wrapper.GradleWrapperMain ");
            }
            foreach (string arg in args) command.Append(Quote(arg)).Append(' ');
            var info = new ProcessStartInfo(target, command.ToString());
            info.UseShellExecute = false; info.CreateNoWindow = true;
            info.RedirectStandardOutput = true; info.RedirectStandardError = true;
            info.StandardOutputEncoding = Encoding.UTF8; info.StandardErrorEncoding = Encoding.UTF8;
            info.RedirectStandardInput = true;
            using (var child = Process.Start(info)) {
                child.OutputDataReceived += (sender, e) => { if (e.Data != null) Console.Out.WriteLine(e.Data); };
                child.ErrorDataReceived += (sender, e) => { if (e.Data != null) Console.Error.WriteLine(e.Data); };
                child.BeginOutputReadLine(); child.BeginErrorReadLine(); child.StandardInput.Close();
                child.WaitForExit(); return child.ExitCode;
            }
        } catch (Exception e) { Console.Error.WriteLine(e.Message); return 1; }
    }
}
