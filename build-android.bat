@echo off
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "ANDROID_HOME=C:\Users\SCHOOL\AppData\Local\Android\Sdk"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%"

cd android
call gradlew.bat assembleDebug
cd ..

echo.
echo Build complete! APK location:
echo android\app\build\outputs\apk\debug\app-debug.apk
pause
