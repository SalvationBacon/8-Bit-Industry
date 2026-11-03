# Publishing 8-Bit Industry on Google Play

The Android app is the same `index.html`, bundled into a native app with [Capacitor](https://capacitorjs.com).
GitHub Actions builds it, so you don't need Android Studio.

| | |
|---|---|
| App ID (package name) | `com.salvationbacon.eightbitindustry` (permanent once uploaded) |
| Version | `package.json` `version`, which must equal `VER` in `index.html`. versionCode = 2.0.38 → 20038 |
| In-app product | `supporter_pack` (one-time) |
| Min Android | 7.0 (API 24), target API 36 |

## What is different in the app
`tools/build-app.js` copies the game into `www/` with `STORE_BUILD` switched on:
- No dev menu or BIGBANG unlock (a sandbox keeps its dev panel, since a sandbox is already free building). A save carried in from the web with dev mode on loads with it off
- No service worker, PWA manifest or INSTALL button. Every file is inside the app, and the font is bundled, so it works offline from the first launch
- The Android back button steps back like Esc (modal, selection, paste, build, tool, panel, drawer), then opens the ☰ menu; on the title screen it leaves the app
- In the background the app saves and stops the factory clock (it is not an idle game)
- SUPPORTER PACK on the title screen and in ☰

The web game at GitHub Pages is unchanged.

## One-time setup

### 1. Google Play developer account
1. Go to https://play.google.com/console/signup and pay the one-off $25
2. Choose **Personal** (or Organisation if you have a registered business), verify your ID and phone
3. To sell the Supporter Pack: Play Console → Setup → **Payments profile**, create one (bank details, tax info)

### 2. Make an upload key (once, keep it forever)
On any computer with Java (or Android Studio) installed:
```
keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```
It asks for a password and your name. **Back up `upload.jks` and the password somewhere safe.** Google Play App Signing holds the real app key, so a lost upload key can be reset through Play support, but it is slow.

Then turn it into text for GitHub:
- macOS / Linux: `base64 -i upload.jks | tr -d '\n' > upload.txt` (Linux: `base64 -w0 upload.jks > upload.txt`)
- Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("upload.jks")) > upload.txt`

### 3. GitHub secrets
Repo → Settings → Secrets and variables → Actions → New repository secret:
| Name | Value |
|---|---|
| `EBI_KEYSTORE_BASE64` | the contents of `upload.txt` |
| `EBI_KEYSTORE_PASSWORD` | the keystore password |
| `EBI_KEY_ALIAS` | optional: only if your alias is not `upload` |
| `EBI_KEY_PASSWORD` | optional: only if the key password differs from the keystore password |

Never commit `upload.jks`.

## Building
Every push that touches the game runs **Android build** (repo → Actions):
- **8-bit-industry-debug-apk**: install it on your own phone to try the app (allow "install unknown apps" for your browser or Files). Billing does not work in a debug build that wasn't installed from Play, so the Supporter Pack shows an error there; that is expected
- **8-bit-industry-release-aab** (only once the secrets exist): the signed file you upload to Play Console

You can also run it by hand: Actions → Android build → Run workflow.

## First release
1. Play Console → **Create app**: name 8-Bit Industry, Game, Free, accept the declarations
2. Fill in **App content** and the **Main store listing** from `store/LISTING.md`
3. Testing → **Closed testing** → create a track, upload the `.aab`, add testers by email (a Google Group works well)
4. Monetize → Products → **In-app products** → Create product `supporter_pack` (needs the payments profile, and an uploaded build that includes billing, which this one does). Activate it
5. Add yourself as a **license tester** (Setup → License testing) so you can buy the Supporter Pack in testing without being charged
6. **New personal accounts:** Google requires at least 12 testers opted in to the closed test for 14 days in a row before you can apply for production. Friends and family with Android phones count; ask them to keep it installed and open it now and then
7. After the 14 days: Dashboard → **Apply for production**, answer the questions, then promote the build to Production

## Every update after that
1. Make the change and follow the delivery checklist in `CLAUDE.md` (the version in `package.json` must match `VER`)
2. Push; Actions builds a new signed `.aab`
3. Play Console → Production (or a testing track) → Create new release → upload → Roll out

Google reviews most updates within a day. The web version still updates on its own as before.

## Supporter Pack details
- Bought with Google Play Billing through `cordova-plugin-purchase` (Play Billing Library 9). The purchase is acknowledged straight away (`finish()`), as Google requires within 3 days
- Ownership lives in `PREFS.supporter` on the device and is confirmed from Google on every launch, so a reinstall or a new phone gets it back (RESTORE PURCHASE does the same by hand)
- Unlocks the Golden Hour theme (gold and coral, in the Stardust theme list too) and Gilded Machines (every machine chassis blended toward gold, toggle in the Supporter Pack window). Cosmetic only
- The game has no server, so purchases are not verified by a server. For a cosmetic one-time pack that is a reasonable trade-off

## Local builds (optional)
With Node 22, JDK 21 and the Android SDK (Android Studio installs it):
```
npm ci
npm run sync          # build-app.js + npx cap sync android
cd android && ./gradlew assembleDebug
```
Open the `android/` folder in Android Studio to run it on an emulator or a phone over USB.
