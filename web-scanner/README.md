# NFC tools — phone scanner (web)

Single-page PWA that reads an NFC tag's UID with the Web NFC API and forwards
it to the Homey app's cloud webhook. Pair this with the v2.1.0+ release of the
[NFC tools Homey app](../).

## Constraints

- **Chrome on Android only.** Web NFC is not implemented in iOS Safari (Apple
  has refused to ship it for years), Firefox, or any desktop browser.
  iOS users should use the [companion Android app](../android-scanner/) — or
  build a native iOS app.
- **HTTPS required** by the browser. Use GitHub Pages, Netlify, Vercel, or
  serve over `localhost` for development.

## Hosting

Static, no build step. Drop `index.html` on any HTTPS host. The simplest
approach is GitHub Pages from this repo's `main` branch — point it at
`/web-scanner` as the source folder.

## Usage

1. Open the page in Chrome on Android.
2. Paste the webhook URL from the Homey app's settings page (looks like
   `https://webhooks.athom.com/webhook/<id>?homey=<homeyId>`).
3. Optionally set a title — appended as `?title=…` so you can pre-label the tag.
4. Tap **Scan NFC tag** and hold a tag against the back of the phone.

The page POSTs `<webhook>?uid=<hex>&title=<title>` and the Homey app fires
the existing `nfc_touched` flow trigger. The webhook URL and the title are
saved to `localStorage` so they survive reloads.
