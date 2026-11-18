# LUSTSINO V11 — Feed & Creator Studio Upgrade

All SQL changes in this release were applied to Supabase project `ganongrsgqfnwxkfxzpu` with the connected admin tool; **do not paste historical SQL files into the SQL editor**.

## Feed
- Responsive Instagram-inspired centered post cards with full-aspect images using `object-fit: contain`, so media isn't arbitrarily cropped.
- Muted `playsinline` autoplay for videos visible at least 60% in the viewport; playback pauses offscreen or when the page is hidden. Each video includes native controls.
- Chronological newest-first ordering, batches of 24, automatic loading near the bottom, manual Load more fallback, Refresh button, and detection of newly published posts every 60 seconds.
- **Create post** button opens Community Studio directly on the composer, even if another Studio tab was previously selected.
- Existing sharing, reactions, tags and safety report flows remain available.

## Posting
- Rebuilt post composer with preview, title, description, creator credit, optional creator link, tags and documented rights reference.
- One **Publish post** click performs secure Bunny presign → upload → server confirmation → Supabase record insert. No separate Upload to Bunny button.
- Verified creators can publish their own completed Bunny uploads immediately if the rights reference matches the server upload record. Other accounts cannot bypass identity/rights restrictions.
- Supports JPEG, PNG, WebP, GIF, short MP4/WebM per Bunny server limits. Uploaded media is subject to provider terms.

## Game building
- Modern creator game workspace with clear form labels, visual outcome cards, GIF/photo game cover picker, preview button and persistent form state between tab changes.
- Circle Paths: round navigation, up to 30 round templates, per-round file input, draggable numbered ovals, width/height sliders, reveal timing slider and next-round connections.
- Other modes: outcome media upload inputs, choice labels, duration sliders, existing cleared-media selection. Special keeps a tag/voice configuration editor.
- Players can save private drafts; draft games and posts can be deleted by their owners. Verified creators can publish complete games immediately **when all existing media/creator publication checks pass**.
- Newly uploaded media URLs can be used in private game previews. They are **not automatically approved for public game publication**, and their underlying Bunny CDN URL is not protected by the UI age-declaration gate. Real access controls must still be implemented before storing/publishing restricted media.

## Master Site designer
Go to **Master Studio → Site designer**:
- Edit selected homepage hero and community text, CTA button labels, feed and featured headings.
- Change site logo, hero image and community GIF/image via HTTPS URLs or upload a new file to Bunny.
- Add licensed MP3 audio via HTTPS URL or file upload with a rights reference.
- Choose **Repeat one** or **Rotate active queue**, activate/deactivate/remove tracks and enter proper audio credits.
- Changes are saved in RLS-protected `site_content` and `site_playlist` tables. Visitors have read-only access; only Masters can write.

## Leaderboard
`arcade_scores` and `arcade_presence` use a server-side filter that excludes user IDs in `admin_users`. Masters' scores are not exposed to visitors. Tested with live admin and normal-user IDs.

## Verification performed
- JavaScript parse checks passed for `app.js`, `community.js`, `uploads.js`, `site-editor.js` and the existing game engine.
- No exposed Bunny access keys, secrets or privileged Supabase keys added to GitHub.
- Anonymous role can select public site settings, active playlist records and non-Master scores.
- Bunny Edge Function version 6 was deployed to add licensed MP3 support.

## Important launch limits
- A full browser end-to-end test of signup, uploads, feed scrolling, a 30-round game and Master editor is still required. Code checks alone are not a complete launch audit.
- Authenticated Bunny uploads currently require an existing verified House Creator or Master, per the server-side authorization policy.
- Adult-content age assurance, direct-media access restrictions, verification of subject ages/consent, content scanning and a compatible application host remain required before opening explicit UGC to the public.
- Existing Vercel terms restrict obscene content. Confirm hosting permission before exposing explicit media on Vercel.
