# Deploy Checklist — Pharma Oasis (Cloud Run via Replit)

_Prepared 2026-06-26. Verified: production build compiles clean (`dist/index.cjs`, 3.1 MB) and the Sales pipeline + 2FA flows passed 25/25 end-to-end tests against the live DB. Nothing known-broken._

> ⚠️ **One shared Neon DB for dev AND prod.** Deploying ships **code only** — no data migration, no data loss. The live DB holds **22 real customer accounts**. Do NOT run `npm run db:push` as part of deploy (it targets a different, unused DB). Schema changes are applied by the idempotent startup SQL in `server/db.ts` on boot.

---

## STEP 1 — Set deployment secrets (do this BEFORE clicking Deploy)

In the Replit **Deployment → Secrets** (the deployment's own secrets, not just the workspace):

| Secret | Value | Why |
|---|---|---|
| `SESSION_SECRET` | _(value in `DEPLOY_SECRETS.txt` — untracked, not committed; or generate fresh)_ | **Critical.** Without it, the app falls back to a hardcoded dev secret (`server/session-store.ts:15`) → sessions are forgeable in prod. Generate a fresh one: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `SITE_URL` | `https://pharmaoasis.co.uk` | So invite / password-reset / quotation-print links point at the live site. (Code defaults to this URL, but set it explicitly so it's unambiguous and survives a default change.) |
| `NEON_DATABASE_URL` | _(already set — confirm it's present)_ | The shared live DB. App reads this. |

Optional but recommended to confirm present (whatever the app already uses for email/2FA): SMTP / email-sender vars used by invites and quote emails. Login/2FA itself needs no extra secret.

## STEP 2 — Confirm build & run commands

These are already correct in `package.json` — just verify the deployment config matches:
- **Build:** `npm run build`  → produces `dist/index.cjs` (verified working today)
- **Run:** `npm run start`  → `NODE_ENV=production node dist/index.cjs`
  - `NODE_ENV=production` matters: it turns on the **secure session cookie** flag (`server/session-store.ts:19`).

## STEP 3 — Deploy

Click **Deploy / Publish** in Replit (Cloud Run). _(This is a UI action — I can't click it.)_

## STEP 4 — Immediately after deploy (smoke test on the live site)

> ⚠️ **2FA is enforced for admins in production.** Have your authenticator app + backup codes ready BEFORE you lock yourself out. Break-glass SQL is in `AUTH_HANDOFF.md`.

1. **Admin sign-in:** go to `/staff` → sign in → complete 2FA → land in `/admin`.
   - First-ever admin login on prod will force 2FA enrolment (QR + backup codes). Save the backup codes.
2. **Trusted device:** tick "remember this device" on the 2FA step → next login skips the code on that browser.
3. **Sales flow:** `/admin/sales` loads, KPIs render, Active/Archived tabs work.
4. **Customer flow (use a test/your own customer):** accept a "quoted" quote → a linked order appears (status `confirmed`, "from Q-x") → "Mark entered into inventory" → moves to Archived → CSV export downloads → open `/quotes/:id/print` → browser "Save as PDF" works.
5. **Links:** open an invite or quote email link → it should point at `https://pharmaoasis.co.uk/...`, not localhost.

## STEP 5 — Rollback plan (if something's wrong)

- Code rollback: redeploy the previous build (Replit keeps deployment history), or `git branch -f main <prev-sha> && git push gitsafe-backup main` then redeploy. Last known-good `main` = `d84ed05`.
- **No DB rollback needed** — deploy ships code only; the DB is untouched by deploying.
- Locked out of admin (2FA): use break-glass SQL in `AUTH_HANDOFF.md` to disable 2FA for your account, then re-enrol.

---

### Quick reference — what each secret protects
- **`SESSION_SECRET`** → integrity of every logged-in session (admin + customer). The single most important one.
- **`SITE_URL`** → correctness of outbound links in emails / printable quotes.
- **`NEON_DATABASE_URL`** → the live data. Already set; don't change.
