# LUSTSINO V12 — Media Uploads and Creator Game Preview

## Changes

- Removed the user-facing **“Enter the documented rights/permission reference”** error. Creators and Masters no longer need to type a permission-code string for each upload.
- The Supabase Bunny Edge Function now generates a unique `upload:<uuid>` tracking reference when none is supplied. This ID tracks a file and **is not proof of ownership, consent, performer age, or clearance**.
- Bunny `finalize` returns the stored tracking reference and upload ID to the website.
- A verified creator can upload an image into a game outcome or Circle Paths round. Each outcome/round stores its Bunny `mediaUrl` and `uploadId`; the server-side publishing guard checks that they identify a completed upload **belonging to the game author**. Existing approved media remains supported.
- Creator posting no longer asks for a manually typed reference. The single Publish action uploads the file, receives the reference automatically, then saves the feed post. The existing rights/consent assertion and verified-creator checks still apply.
- Circle Paths immediately previews the selected local image while upload is running. The displayed image itself determines the canvas dimensions, so circles align with the picture instead of its letterboxed container.
- Circle placement, drag, size, shape, round connections and timers remain available in the builder.
- All other image/video outcome editors immediately preview selected media before upload completes.
- The **Back to Game Studio** button appears when previewing a private game; it returns to Community Studio or Master Studio, whichever initiated the preview, without rebuilding the form.
- Published games using creator-owned Bunny uploads display that media correctly; the engine no longer shows a placeholder just because the media has no legacy `media_assets` row.
- Prevents trying to save an image preview while its network upload is unfinished.

## Tested

- JavaScript syntax checks for `app.js`, `community.js`, `uploads.js`, and `site-editor.js`.
- Live Supabase verified-creator game and feed post publishing, using a temporary completed Bunny ledger record. **All audit rows rolled back**.
- SQL game publishing guard remains active.
- Bunny Edge Function version 7 deployed.

## Still required before public explicit uploads

- Actual end-to-end browser test on mobile and desktop for upload, Circle Paths canvas, and preview-return behavior.
- Independent age assurance and appropriate restricted-media access. **A public Bunny CDN URL remains accessible outside the site's HTML age prompt.**
- Appropriate application hosting, genuine documentation of performers' age and consent, rights/takedown processes, and content screening.
- Accounts that are not verified House Creators may still create private game layouts, but Bunny uploads remain restricted by the existing backend authorizations until those safeguards are implemented.

## Hands-on test

1. Sign in as a verified House Creator.
2. Open Community Studio → Build a game → Circle Paths.
3. Select the Round 1 image. It should appear immediately in the canvas.
4. Tap to place circles and drag them over the actual image. Adjust sizes.
5. Upload different pictures on several rounds and wait for “uploaded” feedback.
6. Press **Preview game** and then **Back to Game Studio**. Inputs should still be present.
7. Supply an image for every required round, then save. Valid uploaded media can publish directly if the game passes the existing server verification.
8. Test other modes and create a feed post with one Publish button and no typed rights code.

Changes to the Supabase database are already applied; do not re-run older SQL files.
