# Android Real-Device Debugging (USB)

> **Don't use Expo Go**: Expo Go cannot run the latest Expo SDK (this project uses SDK 57), and it relies on Wi-Fi LAN, whose connection stability is far lower than the USB reverse tunnel. Real-device debugging always uses **USB + development build (debug)**.

Prereqs: enable "Developer options → USB debugging" on the phone, connect it via USB cable.

> **Do NOT use `pnpm run android`**: it does NOT build the app — it launches the Android Studio emulator and installs Expo Go (which cannot run this project's SDK 57). Build & install the debug APK manually:

```bash
adb devices                            # confirm the device is online (status = device)
cd android && ./gradlew assembleDebug  # build the debug APK (native shell only — data/assets are NOT bundled)
adb install -r app/build/outputs/apk/debug/app-debug.apk  # install to the USB device
```

> **Don't rebuild debug repeatedly**: the debug APK does NOT bundle JS or data (`assets/chunks`) — everything is served by Metro at runtime, so rebuilding does NOT pick up data changes. Rebuild only when native code changes; for data/JS changes just restart/refresh Metro.

Then start the dev server and expose it to the phone over USB. **`adb reverse` must be established MANUALLY** — it is not automatic; do it every time after (re)connecting the USB cable. **Port 8081 is fixed (hardcoded)**: Metro must run on 8081 and `adb reverse` must use 8081 — the app connects to `localhost:8081`; do NOT use any other port:

```bash
npx expo start --port 8081 --clear  # 1) start Metro on the fixed port 8081 (add --clear when the cache is corrupted / deserialize errors)
adb reverse tcp:8081 tcp:8081   # 2) REQUIRED manual step: phone reaches Metro on the PC over the USB reverse tunnel (debug JS/assets are served by Metro at runtime)
adb shell pm clear com.lightnooklabs.novly  # 3) clear the old DB before verifying new data (e.g. after chunk rebuild), otherwise the stale merged DB persists
```

Notes:

- The debug build does **NOT** bundle the JS bundle or `assets/chunks` into the APK — they are fetched from Metro at runtime. Real-device testing requires a manually-established `adb reverse` and a running dev server.
- **Port 8081 is the ONLY allowed port** for the dev server and `adb reverse` — other ports are forbidden.
- **Don't run two dev servers at once** (port 8081 conflict).
- App package name: `com.lightnooklabs.novly`.
