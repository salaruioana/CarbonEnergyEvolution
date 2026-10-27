@echo off
rem Run on Windows from the project folder. Result: dist\ElectricityDashboard.exe
python -m pip install -r requirements.txt || goto :error
python scripts\preprocess.py || goto :error
python -m PyInstaller --noconfirm --onefile --windowed --name ElectricityDashboard --add-data "web;web" app.py || goto :error
echo.
echo Built dist\ElectricityDashboard.exe
goto :eof
:error
echo Build failed.
exit /b 1
