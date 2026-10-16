@echo off
setlocal
title ArthCz Arena - servidor local
cd /d "%~dp0"

rem ============================================================== verificacoes
if not exist "package.json" (
  echo.
  echo   Nao encontrei o package.json nesta pasta.
  echo   Coloque este arquivo na raiz do projeto ArthCz Arena.
  echo.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Node.js nao encontrado neste computador.
  echo   Instale a versao LTS em https://nodejs.org e abra este arquivo de novo.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo.
  echo   Primeira vez por aqui: instalando as dependencias...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo   O npm install falhou. Verifique a conexao e abra este arquivo de novo.
    echo.
    pause
    exit /b 1
  )
)

rem ======================================= encerra um servidor que tenha ficado aberto
call :encerrar 4321

echo.
echo   ArthCz Arena
echo   ------------------------------------------------------------
echo   Endereco : http://localhost:4321
echo   Para sair: feche esta janela
echo.

rem abre o navegador assim que o servidor responder
start "" /min powershell -NoProfile -Command "for($i=0;$i -lt 60;$i++){try{Invoke-WebRequest -Uri 'http://localhost:4321/' -UseBasicParsing -TimeoutSec 2 | Out-Null; Start-Process 'http://localhost:4321/'; exit}catch{Start-Sleep -Milliseconds 500}}"

rem ====================== servidor em primeiro plano: ao fechar a janela, ele morre junto
call npm run dev

rem se o servidor sair sozinho, garante que nao sobrou processo na porta
call :encerrar 4321
echo.
echo   Servidor encerrado.
echo.
pause
endlocal
exit /b 0

rem ---------------------------------------------------------------------------
rem :encerrar <porta> - mata o processo que estiver escutando na porta
rem ---------------------------------------------------------------------------
:encerrar
for /f "tokens=5" %%p in ('netstat -ano -p tcp ^| findstr /r /c:":%~1 .*LISTENING"') do (
  taskkill /f /pid %%p >nul 2>nul
)
exit /b 0
