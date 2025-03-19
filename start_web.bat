@echo off
echo Starting Kimball Web Server...

:: Change directory to where the script is located
cd /d "%~dp0"

:: Start a simple Python HTTP server on port 8501
python -m http.server 8501

:: Keep the window open in case of errors
pause
