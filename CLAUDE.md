# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Homey app (Athom smart-home hub) named **NFC tools**. It listens for NFC tag scans, persists each unique tag with user-editable `value`/`title` fields and a usage counter, and fires a Flow trigger that other Homey flows can react to.

Runtime is **Homey Apps SDK v3** (`"sdk": 3` in `app.json`), targeting **Homey Pro (Early 2023)** and newer (`"compatibility": ">=5.0.0"`, `"platforms": ["local"]`). The previous v1.x line of this app ran on SDK v2; the v2.0.0 release was a full migration. SDK v2 idioms (global `Homey.Manager*`, `new Homey.FlowCardTrigger(...).register()`, callback-style API handlers) do **not** work on this hardware — every manager is reached via `this.homey.*` from inside an `App`/`Driver`/`Device` instance.

## Common commands

The CLI is the npm package **`homey`** (older docs / forum posts may reference `athom-cli` — that's the obsolete name).

```bash
npm install --global homey       # one-time
homey login                      # one-time, OAuth in browser
npm install                      # local deps + types for editor IntelliSense

homey app run                    # install + run on the Homey on your LAN, with live logs
homey app install                # install without attaching logs
homey app validate                       # debug-level validate (lenient)
homey app validate --level publish       # strict pre-publish validate
homey app publish                        # publish a new version (bumps app.json + .homeychangelog.json)
```

There are no unit tests. Verification is manual: run on a real Homey, scan a tag, check the settings page and Flow trigger.

## Architecture

Three small pieces glued together by Homey's managers, plus an optional Athom-cloud webhook for phone scans:

1. **`app.js`** — backend. `async onInit()` looks up the singleton trigger card via `this.homey.flow.getTriggerCard('nfc_touched')` and stashes it on `this.nfcTouched` (look up once, reuse — don't re-fetch per scan). Two scan sources both funnel through `handleScan({ uid, value, title, viaWebhook })`:
   - **Hub antenna**: `this.homey.nfc.on('tag', ...)` — only meaningful on Homey Pro 2019 and earlier; Pro 2023 has no antenna so this listener never fires there.
   - **Phone webhook**: `this.homey.cloud.createWebhook(WEBHOOK_ID, WEBHOOK_SECRET)` registers a public URL at `webhooks.athom.com/webhook/<id>?homey=<homeyId>` and emits `'message'` events with `{ headers, query, body }`. `WEBHOOK_ID`/`WEBHOOK_SECRET` come from `env.json` and are registered once by the developer at `tools.developer.homey.app/webhooks`.

   The handler reads/writes `cards` via `this.homey.settings.get/set`, fires the trigger via `this.nfcTouched.trigger(tokens)`, and pushes the updated list to the settings page via `this.homey.api.realtime('cards', cards)` (Promise-returning — always `.catch` it). Tokens are `data` (= `card.value`), `title`, `id` (= uid), `count`. The list is re-sorted by `blips` desc each scan.

   **Hub vs webhook divergence:** hub-antenna's first scan of an unknown tag *registers but does not play* (so the user can fill in `value`/`title` in settings before flows fire). Webhook scans always carry metadata in the URL, so even a first scan plays immediately. This is intentional — don't unify the two paths.

2. **`settings/index.html` + `settings/js/vue.js`** — the in-app settings page. Vanilla Vue 2.5.22 (vendored as `settings/js/vue-2.5.22.js`, intentionally bundled — see "Bundle Vue" in changelog/PRs; do not switch to a CDN). The browser-side `Homey` global (`Homey.get`/`set`/`on`/`api`/`alert`/`ready`) is unchanged from SDK v2, so this layer needed no rewrite during the v3 migration. Top of the page shows the webhook URL (fetched from `Homey.api('GET', '/webhook')`) with a copy button and brief usage notes; this section auto-hides if `WEBHOOK_ID` isn't configured in `env.json`.

3. **`api.js` + `api` block in `app.json`** — Web API. SDK v3 splits routes into two places: `app.json`'s `"api"` object declares `method`/`path`, and `api.js` exports an object of named `async` handlers (`{ async play({ homey, body }) { ... } }`) keyed by the same name. The settings page's "Test" button calls `Homey.api('POST', '/play', card, cb)`; the webhook URL is fetched via `Homey.api('GET', '/webhook', cb)`. Neither endpoint is `public: true` — both are only called from the (already authenticated) settings iframe.

### Things that are easy to get wrong

- **UIDs starting with `08`** are ignored on purpose in `app.js` (random per-scan rather than stable per-tag — see the stackoverflow link in the source). Don't "fix" this filter. The exact UID string format on Homey Pro 2023 isn't pinned by the SDK docs; if behavior changes after a hardware/firmware update, log a raw `uid` once and re-check the prefix rule rather than guessing.
- The card schema lives only in `app.js` (`{ uid, value, title, blips, lastUsed }`) and is implicit in the Vue template. Phone-webhook scans without a real UID synthesize a `phone:<value-or-title>` placeholder so the schema stays consistent. Changing the schema means updating both sides plus migrating existing user data in `this.homey.settings`.
- The Flow trigger token names (`data`, `title`, `id`, `count`) are part of the public contract in `app.json` `flow.triggers[0].tokens`. Renaming them breaks every user's existing flows.
- `this.homey.flow.getTriggerCard('id')` returns the singleton declared in the manifest — call it once in `onInit`, not per event. Constructing trigger cards (the SDK v2 `new Homey.FlowCardTrigger(...).register()` pattern) is gone.
- All callback-style APIs from SDK v2 are now Promise-returning. `this.homey.api.realtime(...)` rejects if it can't deliver — always `.catch`.
- **`env.json` is gitignored.** It holds `WEBHOOK_ID` / `WEBHOOK_SECRET` registered at `tools.developer.homey.app/webhooks`. Without these the cloud webhook silently disables and the settings page falls back to a "not configured" notice. `env.example.json` is the tracked template. Don't ever commit real values.
- The `WEBHOOK_ID` is **shared across all installs** of the app — per-Homey routing happens via the `?homey=<homeyId>` query param. Don't confuse this for a per-user secret. Anyone with a user's `homeyId` + the published URL can fire their flow; treat the URL as a capability token.
- `app.json`'s `version`, `package.json`'s `version`, and `.homeychangelog.json` must be kept in sync when releasing.
- `settings/js/vue.js` is the app's Vue code; `settings/js/vue-2.5.22.js` is the Vue framework itself. Don't confuse them.
- `assets/images/xlarge.png` (1000×700) is required by `homey app validate --level publish`. The repo has `large.png` and `small.png`; if `xlarge.png` is missing, add it before publish.

## Repo conventions

- Issues/PRs are tracked at https://github.com/warting/nfc-tools. Commits in history follow short imperative messages, often `Fixes #N ...`.
- `README.md` and `README.txt` are kept identical (Homey App Store reads `README.txt`).
