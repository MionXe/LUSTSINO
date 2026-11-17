# LUSTSINO Bunny Storage/CDN setup

Use Bunny **Storage** for uploaded images/WebP/GIFs and short approved media; a linked **CDN Pull Zone** delivers the files. No Bunny account or credentials are connected to the site by this documentation.

## 1. Create a Storage Zone

1. Sign in at https://panel.bunny.net/
2. Choose **Storage** > **Add Storage Zone**.
3. Suggested name: `lustsino-media` (use any unique available name).
4. Choose **Standard (HDD)** to start.
5. Pick a primary storage region near your users/origin (NY/US East is a reasonable candidate if available). CDN caches global traffic regardless of the primary location.
6. Extra replication is optional and increases storage use.
7. If you want S3-compatible uploads later, enable **S3 compatibility at creation** if the preview option is available. Bunny currently cannot enable it retroactively on an existing zone. The site does not currently implement the S3 upload protocol.
8. Create the zone.

Do not upload any restricted media until age assurance, uploader verification, content permissions, takedowns, and media delivery controls are operating.

## 2. Add a Pull Zone

1. Go to **CDN** > **Add Pull Zone**.
2. Set **Origin Type: Bunny Storage Zone** and select the zone from Step 1 (you can also configure this under Pull Zone > Origin).
3. Suggested Pull Zone name: `lustsino-assets`, if available.
4. Start with **Standard Network** and adjust after measuring actual bandwidth.
5. Save and copy the public **Pull Zone hostname** only. It usually looks like `https://your-pull-zone.b-cdn.net`.
6. Upload a non-sensitive test file in Storage > Browse Files > Upload, then test it using `https://your-pull-zone.b-cdn.net/path/to/filename.webp`.

The browser consumes the Pull Zone URL only; the **Storage AccessKey is secret** and must never go in GitHub or frontend JS.

## 3. What to report back

Only send the **Storage Zone name**, **Pull Zone hostname** and **primary region**. These are configuration identifiers, not credentials. **Do not share passwords, storage access keys, CDN token-signing keys, or Supabase secret keys in chat.**

## 4. Next engineering step

Implement an authenticated upload gateway (e.g. a dedicated server/Edge Function) that checks creator privileges, content rights, media MIME and size, validates video duration, writes to Bunny Storage with a secret kept in provider environment settings, and stores the returned CDN object path in Supabase. Protect unpublished media at the CDN level; a visual age-check popup does not protect a public static URL.

Recommended server-only environment variables, to be configured privately in the provider UI:
- `BUNNY_STORAGE_ZONE`
- `BUNNY_STORAGE_ENDPOINT` (regional)
- `BUNNY_STORAGE_ACCESS_KEY` (secret)
- `BUNNY_CDN_BASE_URL` (non-secret)
- Optional `BUNNY_TOKEN_AUTH_KEY` (secret, for protected delivery)

For larger video uploads avoid funneling complete files through a constrained serverless request body; use a dedicated upload service or an approved direct-upload flow.

## Reference
Official Bunny storage quickstart: https://docs.bunny.net/storage/quickstart
Bunny acceptable-use policy: https://bunny.net/acceptable-use/
