# Quote EAN and sales notification review — 30 September 2026

## Findings

A read-only check of the website database found 14 quotes with 49 lines. Of those lines, 39 had a blank stored EAN; all 39 could be resolved from their linked product or price-list item. No historical quote, quantity, price or transaction was changed.

Quote version creation dropped EAN, description and price-list references. Customer screens omitted EANs. Sales emails contained a summary without product lines, and sending depended on the inventory handoff finishing. A production log on 22 September recorded an inventory payload validation failure. Missing SMTP credentials were incorrectly reported as successful email delivery.

## Changes in this branch

- Preserve the full product and pricing snapshot when copying quote versions; fill missing legacy display identities from linked records without overwriting historical rows.
- Show EANs in customer, printable and administrator quote views. Unpriced lines show price on request.
- Save customer quotes, their lines and two notification jobs in one transaction. Admin line replacement is also atomic.
- Send sales notifications with product descriptions, EANs, unit quantities, contact details, notes and a link to the saved request. Customer confirmations include product lines.
- Keep sales delivery independent of the existing inventory handoff. RD CRM integration remains deferred.
- Persist delivery status, retry failures with bounded backoff and expose a deliberate administrator retry for failed or legacy sales notifications. SMTP acceptance is recorded, not a claim that a person received or read the message.
- Report missing credentials and failed formal-quote emails as failures.

## Validation

- Production client/server build passed (`node --import tsx script/build.ts`).
- Seven unit/email tests passed (`node --import tsx --test tests/quote-*.test.ts`). Mail transport was mocked; no real email was sent.
- Eight isolated database checks passed using the actual queue SQL: transaction rollback, separate concurrent claims, active-lease exclusion, interrupted-job recovery, stale-worker protection, retry deduplication, prevention of requeuing a sent job, and final interrupted-attempt handling.
- Database fixtures were confined to a temporary schema on the existing website rehearsal branch. Production data was not written.
- TypeScript reports 17 pre-existing errors on the production base and the revised code, with no additional errors after normalizing line numbers. This is not a clean type-check gate.

## Deployment and remaining checks

This branch is based on production `migrate/off-replit` at `c9eea0a56a34b4f0acb7b8c4d7b5ae01f37a210e`. It has not been merged into or deployed to production during this review.

Startup creates the additive `quote_email_outbox` table with the existing database role. It does not backfill or automatically email historical requests. New customer requests enqueue sales and customer jobs. Admin-created drafts do not send automatically.

Before activation, verify `ZOHO_EMAIL`, `ZOHO_EMAIL_PASSWORD`, `NOTIFICATION_EMAIL`, `TRADE_INBOX`, `SALES_INBOX` and `APP_URL`. Existing inbox defaults are jeevan@pharmaoasis.com, trade@pharmaoasis.com and sales@pharmaoasis.com; no environment settings were changed. Once deployed, use one explicitly labelled test request and verify receipt in the intended inboxes, the customer confirmation, EANs and the administrator delivery status. SMTP credentials and actual inbox receipt have not been verified by the mocked tests.

The worker polls every 30 seconds, uses a two-minute claim lease and stops after six failed attempts. `QUOTE_EMAIL_WORKER_ENABLED=false` pauses sends while jobs remain saved. SMTP delivery is at least once: interruption after server acceptance or partial recipient rejection can cause a repeat message. Stable Message-ID values and job uniqueness reduce duplication but cannot guarantee exactly-once email. Check the mailbox before retrying a job with an unknown delivery outcome.

Rollback: disable the worker and redeploy the previous application commit. Retain the additive outbox table and queued jobs for investigation; do not delete quote history. Reverting the application also reintroduces the old notification behavior.

## Separate website design preview

Preview branch `feature/pharma-oasis-concept-02`, commit `8306ac006c47db799d1e455759d6d85522ace754`, now shows EANs and retains delivery details in browser-local saved enquiries. Its preview build and browser check passed. The review host remains read-only and disconnected from live login, quote submission and email. The preview catalogue still contains the priority selection, not the entire app catalogue. Connecting the design to production APIs requires a separate integration pass, including mapping catalogue IDs, quantities and delivery fields.
