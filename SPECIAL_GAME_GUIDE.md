# LUSTSINO Special — first playable release

## What works

An eighth game mode, **The LUSTSINO Special**, is now playable from the published games list.

1. **Enter** — start with one tap.
2. **Preference** — Men, Women, or Any. Published posts tagged `men` or `women` are preferred if available; otherwise the game uses eligible posts under the chosen theme.
3. **Choose two theme cards** — each card pairs a visible name and an underlying feed hashtag.
4. **Shuffle** — chosen cards remain visible briefly; then every card turns face-down and moves between positions through several animated shuffles.
5. **Remember** — choose two face-down cards. A correct memory result uses the original two; an incorrect result follows the two cards you actually selected.
6. **Fast reel** — only public, approved Supabase `community_posts` bearing the selected hashtag are loaded. Tap or press Space to stop, with a 15-second automatic maximum and a visible Pause button.
7. **Gallery** — up to three unique items from that tagged result. Swipe, tap arrow buttons, use left/right keyboard arrows, and optionally open playable short videos.
8. **Finish / Replay** — exit or begin again.

There are **no masturbation coaching prompts or climax-tracking mechanisms** in this game implementation.

## Content and categories

The initial game uses these published feed hashtags:

| Card name | Feed hashtag |
|---|---|
| Roulette | `roulette` |
| Shuffle | `shuffle` |
| Choices | `choices` |
| Mystery | `mystery` |
| Arcade | `arcade` |
| Highlights | `test` |

Currently those are **site-owned illustrated test posts**, not real creator media. Some tags have only one post, so the gallery shows the available unique items, up to three, rather than falsely claiming three distinct images exist.

Future verified creators can add these same hashtags to permitted media posts; published content will become available without editing the game. The game never lists unpublished posts, unreviewed submissions, or arbitrary Bunny Storage files.

## Configure in Master Studio

Studio → Games → edit **The LUSTSINO Special** → visual builder.
- Enter **4 to 10** category cards as `Title:hashtag`, one per line.
- Choose the fast-reel interval.
- Paste optional HTTPS MP3 narration links for **Welcome**, **Shuffle**, **Reel**, **Gallery** and **Finish**.
- Click **Apply settings to game**, then **Save changes**.
- **Preview unsaved config** lets Masters test the card and shuffle stages before saving.

## Configure in Community Studio

Players can choose **The LUSTSINO Special** in the game-mode selector, enter their own category hashtags, reel speed and stage audio URLs, and save a private game draft. Verified creators may publish a game if all existing publication safeguards are satisfied.

For ElevenLabs: create your own authorized narration, upload the MP3 to the approved media host, and copy its HTTPS delivery URL into the matching stage field. Browser autoplay restrictions mean sound may require the visitor to click Enter or otherwise interact first.

## Database

Supabase project `ganongrsgqfnwxkfxzpu` has already received:
- `experiences_type_check` supporting `special`.
- An added `special` validation branch in `public.lustsino_game_ready`, ensuring the configuration has valid category cards and at least one approved published post matches the configured tags.
- A published experience `slug=lustsino-special` with six initial tags.

Do **not** re-run old project SQL files.

## Testing and safety

Check a complete memory shuffle on desktop and mobile, verify that a category with a single result shows only one media item, and confirm the `test` hashtag can populate a three-item gallery. Reduced-motion visitors receive a slower reel.

Remember: public CDN URLs do not enforce age restrictions. Creator consent, independent age assurance, media protection, removal/reporting procedures and suitable application hosting remain production requirements for public explicit content.
