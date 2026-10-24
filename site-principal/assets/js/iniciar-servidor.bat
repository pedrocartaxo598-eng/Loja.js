@echo off
cd /d "%~dp0"
echo Iniciando o servidor da cantina...
echo Abra http://127.0.0.1:3000 no navegador.
echo Mantenha esta janela aberta enquanto usar o sistema.
node server.js
if errorlevel 1 (
    echo.
    echo O servidor nao iniciou. Verifique se o Node.js esta instalado.
    pause
)
