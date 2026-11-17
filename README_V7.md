# LUSTSINO V7 — live connected source

## Verified outcomes (17 Nov 2026)

- Live Supabase project: `ganongrsgqfnwxkfxzpu` (`https://ganongrsgqfnwxkfxzpu.supabase.co`).
- Production database permissions repaired by migration `lustsino_fix_creator_ready_public_read_permissions`; anonymous and authenticated SELECT queries for public games, media and creators no longer raise `permission denied for function lustsino_creator_ready`.
- Existing DB counts at verification: 7 unpublished game templates, 0 published media records, 0 verified creator rows. This project does NOT pretend published games or creator images exist.
- User-facing account creation form calls real Supabase Auth `signUp({email,password,options:{data:{nickname}}})`; sign-in uses `signInWithPassword` and password recovery is wired to the Auth endpoint. The public Supabase project URL and publishable key are configured in `config.js`, not a secret key.
- The Supabase SDK loads from a pinned browser CDN with a fallback. Browser verification of the actual Auth endpoint must be performed after deployment. A network block of both CDNs prevents account actions; check DevTools Network. To eliminate this dependency long-term, build a bundled npm app.
- Homepage uses a looping 3D coverflow with seven original, non-explicit covers, visible active-card motion, keyboard-accessible arrows and dots, and `prefers-reduced-motion` support. The soundtrack is bundled and starts on the age-entry interaction where browsers allow.
- Client-side local demo/seed games are disabled in public state and Studio editing is disabled until a live, authenticated Supabase connection exists. Only database-published games are playable. Non-playable **mode preview** cards show what type of game can be published next.

## Account registration — complete one dashboard setting

Supabase > Authentication > Providers > Email: if you want signup without a confirmation link, turn **Confirm Email OFF**. This is a project Auth setting, not a SQL migration, and was not modified via the available tool. A sign-up must return a valid session immediately. Password reset requires configured SMTP and Auth > URL Configuration (Site URL + redirect allowlist).

Do not disable password strength checks or rate limits. Email ownership is not verified when confirmation is disabled, which makes abuse and account recovery harder. Enable CAPTCHA and leaked-password protection when available. Require independently verified adulthood before delivering restricted media in jurisdictions where this is necessary; the current check box is only a self-declaration.

Existing Master account is in `admin_users`. Use the correct Supabase Auth email/password through **Studio > Admin sign-in**. The prior account was found unconfirmed; use Supabase Auth Users to confirm/reset as appropriate. No Master password is embedded in source. If creating a new Master account, add its verified Auth UUID to `admin_users` using a securely authenticated dashboard operation. Avoid reusing exposed passwords.

## Bunny.net CDN setup

Suggested architecture (verify Bunny's current AUP for your content):

1. Bunny Storage Zone (e.g. `lustsino-media`) holds authorized creator WebP/JPEG images and posters. Region near your main audience (US East if most viewers are in the US/Caribbean).
2. Create a **Pull Zone** whose Origin is the Bunny Storage Zone; use its `*.b-cdn.net` address (or your `media.` custom subdomain) for fast public assets. Bunny Optimizer may help resize public images.
3. Use **Bunny Stream** video library for video transcoding and adaptive video playback. Do not serve large videos from GitHub or Google Drive.
4. Put storage/API keys only in an authenticated backend, never into `config.js`, browser scripts, the repository, or an email. For uploads, provision a protected server-side endpoint; `uploadsEnabled` stays false until one exists.
5. Do not expose explicit media on unrestricted public URLs: a local age dialog alone cannot secure direct CDN links. Configure a proper age-assurance policy, Bunny token authentication or access-controlled delivery as appropriate, documented creator rights, reports, and takedowns. Disable hotlinking where possible.

## Content and publication

- `creators`, `media_assets`, and `experiences` are live Supabase data. Enter creator identity, official page URL, age/consent review reference, rights reference, and media link through the authenticated Master Studio.
- Published games require **approved media and verified creators**, enforced by database triggers and RLS; the seven existing database templates remain drafts until the requirements are met.
- Player Studio drafts and creator applications are live-backed; moderation is intentional.
- Live score functions use server-side award checks and cooldowns but are **not fully cheat-proof**; do not use the ranking for financial prizes without stronger event verification.

## Hosting and GitHub

**Important:** Vercel's 21 April 2026 Acceptable Use Policy restricts obscene content. Publishing this adult-content service to Vercel as-is could violate that policy. Get written approval from the host or choose a host that explicitly permits the full planned content. Do not treat a separate adult CDN as circumventing a website host's policy.

The GitHub connector in this session cannot create a new repository. This directory can be initialized and committed as a local git repo, then pushed to a new empty repository created at `https://github.com/new`. Use a PRIVATE code repository, with no explicit media or secret keys.

Typical push from a terminal *after* creating an empty GitHub repository `MionXe/lustsino`:

```bash
git remote add origin https://github.com/MionXe/lustsino.git
git push -u origin main
```

If you extract the source ZIP without `.git`, instead run `git init -b main && git add . && git commit -m "Initial LUSTSINO source"` before adding the remote. Use your own authenticated GitHub credential manager. Do **not** paste a GitHub access token into source or a public conversation.

Use HTTPS locally (`python -m http.server` for layout testing, but localhost can be blocked in restricted preview tools). Deploy to a host that explicitly approves the use case, configure Supabase Auth allowed URLs, then create a REAL test user from the account form and check Supabase > Authentication > Users + `member_profiles`.

## What is **not** claimed complete

- No GitHub remote repository has been created by this package.
- No Vercel production deployment has been made; current published content would not meet its AUP without approval.
- No Bunny account/pull zone has been provisioned or connected; uploads are disabled intentionally.
- No end-to-end real Auth signup has been run (browser networking blocked in this execution environment).
- The V7 asset pack contains only original non-explicit game-mode illustrations, not the old local adult-media collection.
- Legal pages still need your business name, contact, privacy details, report-and-takedown implementation, legal review, and appropriate age assurance.
