# Website admin workspace — implementation review

Based on production commit `e55b95ad042fdb3a61ef4ecc2635e5c67f6e4ede`.
Scope: the website staff/admin interface. The employee inventory app and QMS are separate.

## Connected behaviour

- Seven navigation groups retain existing specialist tools: Overview, Sales desk, Accounts, Catalogue, Pricing, Campaigns and Settings.
- Overview reads the existing quote, order, account and catalogue APIs. Loading or unavailable metrics show a dash, with retry controls when requests fail.
- Accounts brings customer and supplier applications together and opens the existing full application review. Supplier leads remain distinct from customer logins.
- Workspace search starts after three characters. It searches products, EANs, brands, categories, accounts, quotes and orders. Historical line identity takes precedence over current catalogue identity.
- Sales search can find quotes/orders by line EAN or product description. Existing pricing, sending, acceptance, order handoff and export actions remain in their original handlers.
- Deal changes invalidate dashboard and sales caches. Selecting a different sales view clears bulk selection. A single-order inventory/archive action now has a confirmation.
- Existing admin authentication and 2FA are retained. Both new endpoints use the existing `requireAdmin` middleware; no new role or permission is granted.
- The new theme is scoped to the admin layout, including its dialogs, and is removed on leaving admin. Existing public pages retain their styling.

## Validation

- Production client and server build passes.
- Ten focused Node tests pass: navigation, search validation and escaping, authentication enforcement, parameter binding, response redaction, quote EAN/financial snapshot preservation, and mocked email transport/retry behaviour. Tests do not send mail.
- Eight PostgreSQL integration cases pass using fictional CTE fixtures on the existing Neon rehearsal branch. They exercise snapshot precedence, catalogue/price-list fallback, leading-zero EANs, literal wildcard characters, brand/category search and order search. These are SELECT-only statements with every relation shadowed by a fixture; no application rows are read or written.
- Full TypeScript checking still reports 17 pre-existing server errors in pricing/PM sync/routes. No new errors were introduced in the changed workspace files. These existing errors are not hidden or fixed as part of a visual change.
- The standalone rehearsal server blocks POST, PUT, PATCH and DELETE with 403. Unknown APIs return 404. It never imports the main server, database or mailer.

## Isolated UI rehearsal

Build with `npm ci --include=dev --no-audit --no-fund && node --import tsx script/build.ts`.
Run **only** `node script/admin-workspace-rehearsal.mjs`, without database or email credentials.

`/admin` serves the actual compiled admin components with fictional API responses. The banner explicitly identifies sample records and blocked writes. `/__rehearsal/mobile` displays the same frontend in a 390px frame. Specialist workflows outside this rehearsal return an explicit unavailable response; this is not a substitute for production API testing.

This command is deliberately separate from production startup. The production `start` command and deployment configuration are unchanged. Do not attach a real database, SMTP settings or shared production environment group to the rehearsal service.

## Release and rollback

Review the isolated implementation and draft pull request before a production merge. No production deployment or database migration is included in this branch publication.

The release retains existing URLs, API shapes and all transactional handlers. After approval, merge onto `migrate/off-replit`, deploy the resulting commit to the existing website service and verify authenticated read-only views. Do not create customer orders or send test emails without explicit authorization. Rollback is a Render deployment of the preceding production commit; there is no schema migration to reverse.

RD CRM integration, the inventory-app redesign and QMS remain separate future work.
