@echo off
echo Adding Firebase CLI to Windows Defender exclusions...
echo.

powershell -Command "Add-MpPreference -ExclusionPath 'C:\Users\mwene\AppData\Roaming\npm\' -Force"
if %ERRORLEVEL% EQU 0 (
    echo ✓ Successfully added folder exclusion
) else (
    echo ✗ Failed to add folder exclusion
)

powershell -Command "Add-MpPreference -ExclusionPath 'C:\Users\mwene\AppData\Roaming\npm\firebase.ps1' -Force"
if %ERRORLEVEL% EQU 0 (
    echo ✓ Successfully added Firebase CLI exclusion
) else (
    echo ✗ Failed to add Firebase CLI exclusion
)

echo.
echo Exclusions added. You can now run 'firebase deploy --only hosting'
pause
