# LUSTSINO — Bunny media integration

## Implemented in this release
- Private Supabase `bunny_media_uploads` ledger (RLS: uploader and Master can read, no browser writes).
- Deployed `lustsino-bunny-media` Supabase Edge Function, version-controlled in `supabase/functions/lustsino-bunny-media/index.ts`.
- Studio upload flow: require verified creator/Master, permission reference, issue 120-second PUT presign, browser uploads directly to Bunny S3, server checks the expected object size and records the result.
- Master Studio media screen: browse/paginate the existing Bunny object list, choose an object, then manually assign creator, rights reference, age/consent verification and publish setting.
- Public feed continues to read **only approved/published** media.

## SECURITY: ROTATE BEFORE ACTIVATING
The original Bunny S3 read/access ID, S3 secret and account API key were pasted into a conversation. Revoke/rotate all of them using Bunny's dashboard first. Do NOT enter those old values into secrets. Do NOT commit keys or reveal them in chat or in browser JavaScript.

## Configure Bunny
- Storage Zone: `lustsino-media`
- S3 endpoint (New York): `https://ny-s3.storage.bunnycdn.com`
- A **CDN Pull Zone** must have its **Origin** set to Bunny Storage Zone `lustsino-media`.
- The pull hostname looks like `https://YOUR-ZONE.b-cdn.net`, but don't guess it. Open the actual Bunny Pull Zone in the dashboard to copy its exact hostname.
- Verify a harmless sample file is accessible at `https://YOUR-ZONE.b-cdn.net/path/to/sample.webp`.
- Configure Bunny's S3 CORS to allow browser `PUT` from the exact website origin `https://lustsino.vercel.app` (and allow `Content-Type`). If the zone does not support CORS on S3 preview, use a compatible dedicated upload service, not browser-bundled credentials.
- Consider Bunny CDN token authentication for restricted media; public object URLs are not genuine access control.

## Configure Supabase Edge Function Secrets (inside the dashboard UI ONLY)
In the Supabase project `ganongrsgqfnwxkfxzpu`, go to **Edge Functions > Secrets** and set these:
- `BUNNY_STORAGE_ZONE` = `lustsino-media`
- `BUNNY_S3_ENDPOINT` = `https://ny-s3.storage.bunnycdn.com`
- `BUNNY_S3_ACCESS_KEY_ID` = the **NEWLY ROTATED** S3 access key ID (secret)
- `BUNNY_S3_SECRET_ACCESS_KEY` = the **NEWLY ROTATED** S3 secret access key (secret)
- `BUNNY_CDN_BASE_URL` = your actual Bunny Pull Zone HTTPS hostname (not the S3 endpoint)
- `LUSTSINO_ALLOWED_ORIGIN` = `https://lustsino.vercel.app` (change when your custom domain launches)

Supabase supplies the project's `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` automatically to Edge Functions. Never set the latter from the exposed chat key. Do not enable browser access to server-only keys.

## Using the site
1. Sign in to LUSTSINO as a verified House Creator or Master, and accept the current Terms.
2. Community Studio > **Submit a post** > fill in the permission reference > choose a JPEG, PNG, WebP, GIF, MP4 or WebM.
3. Click **Upload to Bunny**. JPEG/PNG/WebP images may be optimized to WebP in the browser.
4. Once the Bunny Pull Zone exists, the approved public delivery URL is shown in the post form. Add title, credit, creator link and tags, then submit for review.
5. As Master, open Studio > **Media** > **Browse Bunny files** to list previously uploaded objects. Select **Use file** to fill the media URL/title/type in the attribution form. Attach the correct verified creator and written permission record.

## Current limits & launch blockers
- Direct uploads require newly rotated secrets and a connected Pull Zone.
- The server checks authentication, creator access, allowlisted MIME type, file size, quota and object existence. **It does not inspect or independently verify the actual media contents, performer ages, video durations, malware, or release documents.** Such files must stay in review until those controls exist.
- The upload grant expires in 120 seconds; per creator quota is 24 requests per day. Images max 20 MB, short video files max 50 MB. Exact video duration is not validated here.
- Bunny access is not automatically age-restricted; if the Pull Zone is public, direct URLs may be accessible. Age-declaration UI alone is insufficient.
- Vercel's acceptable-use policy restricts obscene content. Do not assume that hosting the app on Vercel while media resides on Bunny makes the intended public adult-content site compliant. Obtain provider approval or move to an adult-compatible app host before public launch.
- Ad placeholder spots are not live ads. Apply to approved adult-compatible publisher networks before adding any JavaScript tags.

## Documentation
- Bunny Storage: https://docs.bunny.net/storage/quickstart
- Bunny AUP: https://bunny.net/acceptable-use/
- Supabase function secrets: https://supabase.com/docs/guides/functions/secrets
- Supabase function auth: https://supabase.com/docs/guides/functions/auth
