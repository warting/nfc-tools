# NFC Tools

With this app you can register NFC cards in settings and add additional values to each card that can be used in flows as tags. It also have a counter so that you know how many times a card has been used.

![Flow example](https://github.com/warting/nfc-tools/raw/main/assets/images/flow.png)

![Settings example](https://github.com/warting/nfc-tools/raw/main/assets/images/settings.png)

## Changelog:

V2.1.0
* Added phone-based NFC scanning via an Athom cloud webhook URL. Write the URL onto a tag with the NFC Tools Android app, or hit it from an iOS Shortcut, and the existing "NFC touched" flow trigger fires. Required for use on Homey Pro (Early 2023), which has no built-in NFC antenna. The URL is shown on the app's settings page.

V2.0.0
* Updated to Homey Apps SDK v3, the new runtime required by Homey Pro (Early 2023). NFC tag scanning continues to work on Homey hardware that has an NFC antenna (e.g. Homey Pro 2019). Phone-based scanning support is planned for a future release.

V1.0.2
* Bundle Vue 3.2.31

V1.0.0
* Initial Release
