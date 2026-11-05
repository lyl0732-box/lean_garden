@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy\Push-Linux.ps1"
if errorlevel 1 (
 echo 推送没有完成，请查看上方提示。
) else (
 echo 推送检查完成。服务器上的账号与存档会继续保留。
)
pause
