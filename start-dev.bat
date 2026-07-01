@echo off

REM 文字コードを UTF-8 に変更
chcp 65001 > nul


powershell.exe -NoExit -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-dev.ps1"