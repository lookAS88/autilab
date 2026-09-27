@echo off
rem AutiLab - otvori aplikaciu v samostatnom okne prehliadaca (bez adresneho riadku a kariet).
rem Udaje sa ukladaju v prehliadaci, preto ho spustajte vzdy rovnakym sposobom.

set "APP=%~dp0index.html"
for /f "usebackq delims=" %%U in (`powershell -NoProfile -Command "([uri]$env:APP).AbsoluteUri"`) do set "URL=%%U"
if not defined URL set "URL=%APP%"

set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if exist "%EDGE%" (
  start "" "%EDGE%" --app="%URL%" --start-maximized
  exit /b 0
)

set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if exist "%CHROME%" (
  start "" "%CHROME%" --app="%URL%" --start-maximized
  exit /b 0
)

start "" "%APP%"
