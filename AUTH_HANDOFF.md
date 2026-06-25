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

## ✅ P4 — Two-factor authentication (TOTP) for admins (DONE this session)

**Decision:** Google Authenticator / authenticator-app codes (TOTP), **required for admins only** (staff and customers are unaffected).

**How it works**
- An admin signs in with email + password as normal. Then a **second step** is required:
  - If they haven't set up 2FA yet → they're walked through **enrolment**: scan a QR code with Google Authenticator (or Authy), enter the 6-digit code to confirm, and are shown **10 one-time backup codes** (saved once).
  - If 2FA is already on → they enter the current 6-digit code (or a backup code) to finish signing in.
- Admins **cannot skip** setup — no admin session is granted until 2FA is enrolled.
- Staff/customers log in exactly as before (no 2FA).

**Where it lives**
- Helper: `server/twofa.ts` (otplib v12 `authenticator` API + bcrypt-hashed, single-use backup codes).
- Backend (`server/routes.ts`): `/api/auth/login` gates admins; `/api/auth/login/2fa` (verify code/backup), `/api/admin/2fa/setup` (QR), `/api/admin/2fa/enable` (confirm + issue backup codes), `/api/admin/2fa/disable`, `/api/admin/2fa/backup-codes` (regenerate). All code endpoints are rate-limited (10 / 15 min). A `publicUser()` helper now strips the password hash, TOTP secret, and backup codes from every user returned to a client.
- DB: `users.two_factor_secret`, `two_factor_enabled` (default false), `two_factor_backup_codes` (JSON of bcrypt hashes). Added idempotently in `server/db.ts` startup SQL + typed in `shared/schema.ts`.
- Frontend: `client/src/pages/login.tsx` (3-step flow: credentials → code → first-time QR enrolment + backup codes); `client/src/pages/admin/security.tsx` (`/admin/security`, sidebar "Security (2FA)") to regenerate backup codes or turn 2FA off.
- Libraries added: `otplib@^12`, `qrcode`, `@types/qrcode`.

**Verified:** 22-assertion end-to-end HTTP test passed (staff unaffected; admin forced to enrol; wrong code rejected; correct code + backup code log in; backup codes single-use; secret/backup codes never leaked via `/me`; disable requires password and re-prompts setup). Type-checks clean; `npm run build` succeeds.

### "Remember this device for 30 days" (trusted devices)
On the code-entry screen an admin can tick **"Remember this device for 30 days"**. After a valid code, the browser gets an http-only cookie (`po_td`); for 30 days that browser **skips the code step** (password is still required). Other browsers still need a code.
- Storage: `trusted_devices` table (`server/trusted-devices.ts`, table in `shared/schema.ts` + created in `server/db.ts`). The cookie holds a random token; only its **SHA-256 hash** is stored, with a 30-day expiry.
- Manage on the Security page: shows how many devices are remembered + **"Forget all trusted devices"** (also cleared automatically when 2FA is turned off).
- Endpoints: `GET /api/admin/2fa/trusted-devices` (count), `POST /api/admin/2fa/forget-devices`. The skip is applied in `/api/auth/login`; the cookie is set in `/api/auth/login/2fa` when `rememberDevice` is true.
- **Verified:** 14-assertion end-to-end test passed (remember sets cookie; trusted browser skips the code; token stored hashed; other browsers still prompted; forget + disable both revoke).

### 🔑 BREAK-GLASS — if an admin is locked out of 2FA
If someone loses both their authenticator app **and** their backup codes, clear 2FA directly on the Neon DB, then they can sign in with just their password and re-enrol:
```sql
UPDATE users
SET two_factor_enabled = false, two_factor_secret = NULL, two_factor_backup_codes = NULL
WHERE email = 'their@email.com';
```
(There's no separate prod DB — this is the one live Neon DB. Never delete user rows.)

## ⏳ What still needs doing (next session)

1. ✅ **Invite flow** — confirmed working by the owner (email arrives, link sets password, sign-in at `/staff`). *(Still good to set `SITE_URL` in production so invite links point at the live domain.)*

2. **Rotate the original live admin password.** Per P1's note, `admin@pharmaoasis.com` still has its **old password** until done operationally. Now that invites work: create a fresh owner admin via invite (or Forgot Password), verify it works, then change/retire the old credential. **Do this against the live Neon DB carefully — 22 real customer accounts live there; never delete users.** Note: with P4 live, the first time any admin signs in they'll be required to set up 2FA.

3. **Hands-on test of 2FA** (built + automated-tested, not yet click-tested by a human): sign in at `/staff` as an admin → you should be walked through the QR setup → confirm with Google Authenticator → save the backup codes → land in `/admin`. Next sign-in should ask for a code; tick **"Remember this device for 30 days"** to skip it next time. Check the **Security (2FA)** page (`/admin/security`) for regenerate/disable/forget-devices. Keep the break-glass SQL above handy the first time.

4. **⚠️ Set `SESSION_SECRET` in production.** `server/session-store.ts` falls back to a hardcoded dev default (`"pharma-oasis-dev-secret-change-in-production"`). If that default is used in production, login sessions can be forged. Set a strong random `SESSION_SECRET` env var on the deployed app. (Also set `SITE_URL` so invite/reset links point at the live domain.)

## Quick reference

- Staff page: `client/src/pages/admin/staff.tsx`
- Invite endpoint: `server/routes.ts` (search `/api/admin/team/invite`)
- Invite email: `server/email.ts` (search `sendInviteEmail`)
- Staff login page: `/staff` (route in `client/src/App.tsx`); customer login: `/login`
- 2FA helper: `server/twofa.ts`; 2FA endpoints in `server/routes.ts` (search `2fa`)
- 2FA login UI: `client/src/pages/login.tsx`; admin Security page: `client/src/pages/admin/security.tsx` (`/admin/security`)
- Seed/bootstrap: `server/seed.ts`, auto-seed gate in `server/app.ts`

## Owner context
- Owner (jeeratnam) is **non-technical** — keep explanations plain and practical. Priorities: avoid security mistakes and accidental data loss.
- Commit work promptly — this project has lost uncommitted work to workspace resets before.
