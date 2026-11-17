# LUSTSINO V8 — GitHub-integrated update

This update is applied directly to the source repository.

## Included
- 3D looping featured-game carousel based on the user-supplied Game Lobby reference, with swipe, arrows, and selection dots.
- Improved mobile CSS layout for the cards, profile forms, and Studio.
- Hide Master Studio entry points unless the user is verified through the existing Supabase admin allowlist. Non-admin `#studio` navigation opens the player account instead. Database permissions (RLS) remain the security boundary.
- Remove publicly visible database and SMTP instructions.
- Master Studio creator-application table with approve/decline actions backed by the existing `lustsino_decide_creator` RPC.
- Creator portfolio URL is optional in the frontend and was made nullable in the connected Supabase schema.
- Media type inferred from an uploaded file or from a video URL extension; GIFs remain image-type media.
- Member-facing pending-creator message links to the private draft Studio.

## Not implemented by this update
- Actual server-side Bunny upload and image/video delivery (provider account and server-only credentials still required).
- Production-level age verification, automatic identity review, and instant unrestricted adult-media publishing.
- Member ban/deletion controls, new game modes, or complete end-to-end production testing.

## Security
Never commit Supabase secret/service-role keys, Bunny write keys, or administrator passwords. Public browsing and creator verification need age/consent safeguards appropriate to the deployed content. The user-provided 20-minute waiting period is only an estimate and not a proof of verification.
