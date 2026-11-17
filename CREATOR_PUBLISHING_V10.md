# LUSTSINO — Creator Publishing & Bunny Actions (November 17, 2026)

## Shipped

- Fixed Bunny Storage file actions: **Use file** and **Test CDN** are no longer silently disabled when a stored object's CDN URL is missing. Use file now tells the Master what is missing; CDN test can still report the backend cause.
- Supabase Edge Function normalizes `BUNNY_CDN_BASE_URL` from either `your-zone.b-cdn.net` or `https://your-zone.b-cdn.net`. Non-HTTPS, path-bearing and malformed values are rejected. No secrets enter the frontend.
- Removed intrusive verification popups in both Master and Community Studio. Every signed-in player can build private game drafts with no evidence code. Public adult-media creator verification remains a separate admin process requiring a real completed evidence reference; the form uses an inline field.
- Verified House Creators can publish *their own completed Bunny uploads* directly to the feed with no per-post administrator approval, provided the matching rights reference, verified age/identity state and current Terms are present.
- Verified House Creators can submit complete public games referencing approved media. The existing publication guard still verifies media/creator records; if incomplete, the game is saved privately instead.
- Player posts and games that are not eligible to publish are saved privately as **drafts**, not misrepresented as pending public content.
- Optional creator page link; authors can publish without a fan-page link.
- Add Report to each feed post (reason + details); Master Studio displays reports and can remove a reported post from public view.

## Live Supabase changes already installed
- `member_profiles.game_builder_enabled` default true.
- `community_posts` RLS policies for verified uploads and publishing drafts; draft review state.
- `experiences` RLS for verified author-created games, still constrained by the publishing trigger.
- `content_reports.post_id` and post reporting RLS.

**Do not run old setup SQL over the live database.** This file documents the already-applied changes.

## Manual smoke test

1. Sign in as Master. Go to Studio > Media > Browse Bunny files.
2. Pick one row: **Test CDN** should be clickable even if the file has no usable URL. A 200 status indicates CDN HEAD succeeded. If you get an error, check the Pull Zone hostname in Supabase secrets.
3. **Use file** should be clickable. If the URL is usable it fills the attribution editor, leaving publication off until the real creator/rights are assigned.
4. Sign up as an ordinary player: game editor can save a private draft without age-evidence prompts. A player cannot directly publish unverified adult media.
5. Complete real identity/age/rights verification of a House Creator. Upload a valid original file through the Bunny gateway. When the rights reference matches, a post can publish without a per-post queue.
6. Open Feed, report a post and verify it appears in Master Studio > Reports. Confirm the Master can unpublish it.

## Production limitations
These are not a substitute for an independent legal-age assurance provider for visitors, content/performer verification procedures, illegal-content detection, abuse reporting, secure takedown response, Bunny CDN token/age-restricted delivery, or approval from an adult-content-compatible application host. A publicly accessible Bunny Pull Zone bypasses an HTML age prompt; Vercel currently restricts obscene material under its acceptable-use policy. **Do not launch explicit public content until those requirements are addressed.**
