# LUSTSINO — Five fictional feed test creators

This is a **test content set**. No real person is pictured or impersonated.

## What was seeded in live Supabase
- **5 unpublished, unverified** `public.creators` records: DEMO Ruby, DEMO Velvet, DEMO Noir, DEMO Aura and DEMO Sable. Each has a matching draft `public.media_assets` record pointing to LUSTSINO-owned game artwork.
- **5 published, approved** test `public.community_posts` with visibly fictional creator names and the following existing, site-owned images:
  - `assets/covers/wheel.webp`
  - `assets/covers/cards.webp`
  - `assets/covers/hotspots.webp`
  - `assets/covers/duel.webp`
  - `assets/covers/doors.webp`
- One pre-existing user submission was left unchanged.

The sample creator profiles appear on the public Creators page from the site's **live feed post data** when there are no published real creators. Their cards are explicitly labeled *fictional test profile*. The fictional `creators` records themselves stay unpublished and unverified; do not change those flags as if they were real performers.

## Where to test
- Public feed: https://lustsino.vercel.app/#feed
- Sample creator directory: https://lustsino.vercel.app/#creators
- Master Studio: sign in to an allowlisted account, then open https://lustsino.vercel.app/#studio
- Master Studio > Media > **Test Bunny connection** checks whether both the replacement S3 credentials and CDN hostname are present and whether Bunny listing succeeds.
- Master Studio > Media > **Browse Bunny files** lists actual existing objects in Bunny Storage (auth required). **Use file** fills a draft attribution form. Attach the real verified creator and written permission reference before publishing any real photo/video.

## How to remove test data
Use **Master Studio > Overview > Remove five test profiles & posts**. It deletes only the five seeded test posts and their associated site-art draft records and fictional profiles. Other submissions are untouched.

## Important remaining issues
The Bunny upload gateway is deployed, but no signed-in file transfer or CDN download has been verified by these changes. The gateway requires newly rotated credentials in Supabase Edge Function Secrets and a real Pull Zone hostname; don't paste credentials into chat. The creator-upload workflow is still restricted to verified creators/admins, and publishing still requires age and rights safeguards. Uploaded files must not be assigned to fictional test identities.

This test feed does not demonstrate independent age verification, upload media scanning, storage access controls or host approval for sexually explicit content.
