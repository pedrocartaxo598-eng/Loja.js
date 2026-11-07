@echo off
cd /d "%~dp0"
cd /d "%~dp0..\.."
echo Iniciando o sistema da cantina...
echo Abra http://127.0.0.1:5152 no navegador.
echo Mantenha esta janela aberta enquanto usar o sistema.
python __init__.py
if errorlevel 1 (
    echo.
    echo O sistema nao iniciou. Verifique se o Python e as dependencias estao instalados.
    pause
)
