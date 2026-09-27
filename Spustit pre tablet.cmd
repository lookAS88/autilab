@echo off
rem AutiLab pre tablet: spusti maly webovy server v tomto pocitaci.
rem Tablet musi byt pripojeny do tej istej Wi-Fi siete ako tento pocitac.
cd /d "%~dp0"

set "PY="
where py >nul 2>nul && set "PY=py -3"
if not defined PY where python >nul 2>nul && set "PY=python"
if not defined PY (
  echo.
  echo  Python nie je nainstalovany. Stiahnite ho z https://www.python.org/downloads/
  echo  a potom tento subor spustite znova.
  echo.
  pause
  exit /b 1
)

echo.
echo  ================================================================
echo   AutiLab bezi. Na tablete otvorte v prehliadaci adresu:
echo.
powershell -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | ForEach-Object { '     http://' + $_.IPAddress + ':8000      (' + $_.InterfaceAlias + ')' }"
echo.
echo   (pouzite adresu siete Wi-Fi / Ethernet, cez ktoru je pripojeny aj tablet)
echo  ================================================================
echo.
echo  - Toto okno nechajte otvorene, kym tablet aplikaciu pouziva.
echo  - Ak sa Windows opyta na povolenie siete, zvolte "Sukromne siete".
echo  - Ukoncenie: zatvorte toto okno.
echo.
%PY% -m http.server 8000 --bind 0.0.0.0
pause
