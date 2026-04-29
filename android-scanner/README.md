# NFC tools — phone scanner (Android)

Native Android companion to the [NFC tools Homey app](../). Reads a tag's UID
with the Android `NfcAdapter` foreground dispatch and forwards it to the app's
cloud webhook. Use this on devices that don't support Web NFC (Firefox /
non-Chrome browsers) or when you want a focused single-purpose app.

## Build

This is a normal Kotlin / Jetpack Compose Android project. After cloning:

```bash
cd android-scanner
gradle wrapper          # one-time, generates the missing gradle/wrapper/gradle-wrapper.jar
./gradlew :app:assembleDebug
```

The APK lands at `app/build/outputs/apk/debug/app-debug.apk`. Or just open the
`android-scanner/` folder in Android Studio (Hedgehog or newer) and hit Run.

Requires JDK 17+, Android SDK 35, an Android device with NFC, and `gradle`
(Gradle 8.10.2 will be downloaded automatically on first wrapper invocation).

## Usage

1. Install on a phone that has NFC (most Android phones from the last 10 years).
2. Open the app — there's no scan button. The app uses *foreground dispatch*,
   so any tag tapped while the app is in the foreground is forwarded.
3. Paste the webhook URL from the Homey app's settings page.
4. Optionally set a title — appended as `?title=…` so the Homey-side card shows
   a friendly name instead of just a UID.
5. Tap a tag against the back of the phone.

UIDs are formatted as colon-separated lowercase hex (e.g. `04:1a:2b:3c:4d:5e:6f`)
to match what the Homey hub's antenna emits, so the same physical tag scanned
by the hub and by the phone resolves to the same card.

## What's intentionally missing

- **No launcher icon.** The placeholder is the system info-dialog icon. Drop a
  proper `mipmap-*/ic_launcher.*` set in if you publish.
- **No release signing config.** Add a `signingConfigs.release {…}` block in
  `app/build.gradle.kts` if you want to ship a signed APK to the Play Store
  or sideload it.
- **No background reading.** Foreground dispatch only — open the app first,
  then tap. This is a deliberate scope cut: background NDEF dispatch needs an
  intent filter on a specific MIME / URI on the tag, which would tie the app
  to one tag-content format. The Homey-side flow is what should react to scans;
  this app is just the input device.
- **No min-app-version backwards compat.** `minSdk = 24` (Android 7.0). Bump
  down if you really need older devices.
