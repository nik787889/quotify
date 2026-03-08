# App Development and Build Commands

## 1. Fast Development Mode (Instant Updates)
Use this mode when actively coding to see changes instantly on your phone without building a full APK.

**Start Metro Bundler and Scan the QR with Expo Go App to check changes in Phone:**
```powershell
npm start
```

---

## 2. Build and Install Standalone APK
Use this mode when you want to permanently install the app on your phone so it works completely offline.

**Commands To connect Phone with Laptop via TCP IP, create build, and install the .apk:**

*Note: Initially connect your phone via USB to start the daemon.*

```powershell
adb devices
adb tcpip 5555
adb connect 192.168.1.4:5555

cd android

.\gradlew.bat assembleRelease
adb -s 192.168.1.4:5555 install -r ".\app\build\outputs\apk\release\app-release.apk"
```
