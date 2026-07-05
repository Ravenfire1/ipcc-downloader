# Bike Register

Register a bike, print its QR code onto a sticker, and stick it on the frame. Anyone who
scans the sticker opens a plain web page (no app required) that tells them the bike is
registered and — with their permission — shares their approximate location so you get a
push notification with where your bike (or whoever's holding it) currently is.

```
bike-register/
  backend/   Cloudflare Worker (Hono) + D1 database — the API and the public scan page
  app/       Expo/React Native app — register bikes, view QR codes, receive push notifications
```

## How it works

1. You register a bike in the app (name, make/model/color/serial number, your contact info).
   The API generates a random bike ID and an **owner secret** — the app stores the secret
   locally and uses it as a bearer token for every request about that bike. The bike ID
   itself is not a secret; it's embedded in the public QR code.
2. The API returns a scan URL like `https://<worker>.workers.dev/scan/<bikeId>` and a
   printable SVG QR code encoding that URL. Print it and stick it on the bike.
3. When someone scans the sticker, their phone opens the scan page. The page tells them the
   bike is registered and asks for location permission (openly — browsers show their own
   permission prompt for this regardless, so there's no way to do this silently). If they
   allow it, precise GPS coordinates are sent to the API; if they decline or have no GPS,
   the API falls back to a coarse, IP-based location.
4. The API records the scan and sends a push notification to the bike owner's phone with
   the scanner's approximate location and a map link.
5. Only the owner secret can read a bike's private details (contact info, scan history) or
   change which device gets notified — a scanner only ever sees the bike's name.

## 1. Deploy the backend (Cloudflare Workers + D1)

Requires a free [Cloudflare account](https://dash.cloudflare.com/sign-up).

```bash
cd backend
npm install
npx wrangler login          # opens a browser to authorize the CLI — your account, your call
npx wrangler d1 create bike_register
```

Copy the `database_id` it prints into `wrangler.toml` (replace `REPLACE_WITH_YOUR_D1_DATABASE_ID`).

```bash
npm run db:init:remote      # creates the tables on the real D1 database
npm run deploy              # publishes the Worker; prints its https://*.workers.dev URL
```

Open `wrangler.toml` and set `APP_BASE_URL` to that printed URL, then run `npm run deploy`
again so the Worker builds scan URLs and QR codes against its own real address.

## 2. Configure and run the app (Expo)

```bash
cd app
npm install
npx eas init                # links this app to an Expo/EAS project — required for push tokens
```

Edit `app.json`:
- Set `expo.extra.apiBaseUrl` to your deployed Worker URL from step 1.
- `eas init` will have added `expo.extra.eas.projectId` automatically.

```bash
npx expo start
```

Scan the terminal QR with the **Expo Go** app (iOS/Android) on your phone — push
notifications work in Expo Go for development. Approve the notification permission prompt
when asked; that registers this phone as the one that gets notified.

### Using it

- Tap **+ Register a bike**, fill in the bike's details and your contact info, submit.
- On the bike's detail screen, the QR code is fetched live from the Worker — share it,
  screenshot it, or open the `qrCodeUrl` printed in the API response in a browser and print
  the SVG directly for the crispest sticker.
- Have a second phone scan the sticker (or just open the scan URL in a browser) — the
  registered phone should get a push notification within a few seconds, and the scan shows
  up in the bike's scan history.

## Building for each platform

Expo Go is fine for trying this out, but a real install on each platform needs its own build.
All `eas build` commands below run on Expo's servers — no Android SDK or Xcode required
locally — and print a download link when done (typically 10-15 min).

### Android (.apk, side-loadable, no store needed)

```bash
npx eas login
npx eas build --platform android --profile preview
```

Open the printed link on the Android phone and it'll offer to install directly (allow
"install unknown apps" for your browser if asked).

### iOS Simulator (Mac only, no Apple account needed)

```bash
npx eas build --platform ios --profile ios-simulator
```

Download the `.tar.gz` it produces and drag the `.app` inside onto a running iOS Simulator.
Good for checking the UI on Apple's screen sizes, but a Simulator build can't go on a real
iPhone.

### Real iPhone

This is the one step that fundamentally requires paying Apple, not just this project's
setup: installing on a physical iPhone outside TestFlight/App Store requires an enrolled
[Apple Developer Program](https://developer.apple.com/programs/) account ($99/year) so the
build can be code-signed for your device. Once you have one:

```bash
npx eas build --platform ios --profile ios-device
```

`eas build` walks you through registering your device UDID and generating signing
credentials — it can manage all of this for you interactively.

### Web

```bash
npx expo export --platform web    # static build in ./dist — deploy it to any static host
# or, for local dev with hot reload:
npx expo start --web
```

The web build lets you register bikes and browse scan history from a browser, but it can't
receive push notifications the way the Android/iOS app can (web push needs separate
infrastructure Expo's push service doesn't cover) — treat it as a companion dashboard, not
the thing that alerts you.

## Privacy notes

- The scan page always discloses that it's requesting location and why, before doing so —
  intentionally. Browsers show their own native location-permission prompt no matter what
  the page says, so hiding this disclosure wouldn't make scanning covert; it would just make
  the page dishonest while the browser still tips the scanner off.
- A bike's owner contact info and scan/location history are only ever returned to requests
  carrying that bike's owner secret. The bike ID in the QR/scan URL is not treated as a
  credential.
- Consider this appropriate for recovering your own bike, not for tracking a specific person
  without their knowledge — using it that way may violate privacy law in your jurisdiction.
