# Auth Hardening — Session Handoff

_Last updated: 2026-06-25. Plain-English notes so any future session (or the owner) can resume without losing context._

This document tracks the **login / admin-password / team-access** work. (The separate `PRICE_BUILDER_HANDOFF.md` tracks the pricing tool — unrelated.)

## Goal (why this work exists)

Before launch, make admin/staff access safe:
- No hardcoded/shared admin password living in the code.
- The staff login is not advertised on the public website.
- New admins/staff are added **by email invite** — they set their own password; the owner never types or knows it.
- (Later) rotate the original live admin password, and optionally add 2-factor authentication.

The work was done in phases (P1 → P2 → P3).

## ✅ P1 — Remove the hardcoded admin password (DONE, committed `fb33dea`)

- `server/seed.ts` no longer creates `admin@pharmaoasis.com / Admin!234` and no longer prints a password.
- An initial admin is bootstrapped only from env vars: `ADMIN_EMAIL` (+ optional `ADMIN_PASSWORD`). With no `ADMIN_PASSWORD`, a random one is set and the owner uses **Forgot Password** to choose one.
- Auto-seed (`server/app.ts`) now only runs on a **genuinely empty DB** (no users) — it can never re-seed the live DB.
- `POST /api/admin/seed` now always requires an authenticated admin (the old open first-time bypass is gone).

## ✅ P2 — Hide the staff login from the public site (DONE, committed `771e453`)

- Removed the public **"Login"** link from the site header (desktop + mobile). Customers still sign in via the **"Customer Portal"** button (→ `/login`); **"Register"** stays.
- Added a **private, unlinked `/staff`** route that shows the login form in admin mode (admin-branded copy, redirects to `/admin`, hides the customer-register link). Staff just need to know the `/staff` URL.
- `/login` was switched to a render-prop form to support the optional admin-mode prop.

## ✅ P3 — Team invites by email (DONE this session — committed)

**Backend** (was written but uncommitted at the start of this session; now committed):
- `server/email.ts` → new `sendInviteEmail()` — the "Welcome to the team / Set My Password" email (7-day validity, Pharma Oasis branding).
- `server/routes.ts` → new **`POST /api/admin/team/invite`** (`requireAdmin`). Body: `{ email, primaryContactName, role: "admin" | "staff" }`. It:
  - rejects if an account with that email already exists;
  - creates the user with a random placeholder password (never used) + a `passwordResetToken` valid 7 days, `status: "active"`;
  - emails an invite link `<SITE_URL>/reset-password?token=...` (reuses the existing reset-password page/flow);
  - returns the safe user (no hash) + `inviteSent` boolean.

**Frontend** (built this session):
- `client/src/pages/admin/staff.tsx` → new **"Invite by Email"** button (primary action) + dialog (Full Name, Email, Role = Staff/Admin). Calls the endpoint, shows a toast, refreshes the staff list. The old password-typing flow is kept as a secondary **"Add with Password"** button.
- Type-checks clean; full `npm run build` succeeds.

## ⏳ What still needs doing (next session)

1. **Hands-on test of the invite flow** (not yet click-tested live):
   - As admin, open **Staff Management** (`/admin/staff`) → **Invite by Email** → send to a real inbox you control.
   - Confirm the email arrives, the **Set My Password** link opens `/reset-password`, you can set a password, and then sign in at **`/staff`**.
   - ⚠️ **Dev server**: P3 changes touch server files. If the running dev server predates these changes, **restart it** (`npm run dev`, port 5000) before testing — front-end hot-reloads, server code does not.
   - ⚠️ **`SITE_URL`**: the invite link uses `process.env.SITE_URL` (falls back to `https://pharmaoasis.co.uk`). Make sure that env var points to the real site in production, or invite links will be wrong.
   - ⚠️ **Email sending**: confirm the email provider is configured (check how `sendPasswordResetEmail` is set up in `server/email.ts`). If `inviteSent` comes back false, the account is still created — the person can use **Forgot Password** instead.

2. **Rotate the original live admin password.** Per P1's note, `admin@pharmaoasis.com` still has its **old password** until done operationally. Now that invites work: create a fresh owner admin via invite (or Forgot Password), verify it works, then change/retire the old credential. **Do this against the live Neon DB carefully — 22 real customer accounts live there; never delete users.**

3. **(Optional — NOT started) 2-factor authentication (2FA).** The owner asked about this; nothing has been built. There is only an unused `client/src/components/ui/input-otp.tsx` (a generic UI widget). If wanted, this is a fresh piece of work (e.g. TOTP/authenticator-app or email-code 2FA for admin logins). Decide scope with the owner first.

## Quick reference

- Staff page: `client/src/pages/admin/staff.tsx`
- Invite endpoint: `server/routes.ts` (search `/api/admin/team/invite`)
- Invite email: `server/email.ts` (search `sendInviteEmail`)
- Staff login page: `/staff` (route in `client/src/App.tsx`); customer login: `/login`
- Seed/bootstrap: `server/seed.ts`, auto-seed gate in `server/app.ts`

## Owner context
- Owner (jeeratnam) is **non-technical** — keep explanations plain and practical. Priorities: avoid security mistakes and accidental data loss.
- Commit work promptly — this project has lost uncommitted work to workspace resets before.
