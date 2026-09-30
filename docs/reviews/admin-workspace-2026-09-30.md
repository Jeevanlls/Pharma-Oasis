# Website admin workspace design preview

Review route: `/__review/admin` on the existing website review host.

This is an interactive design proposal for the website staff workspace. It is
available only when `VITE_REVIEW_PREVIEW=true`. It does not replace the existing
production admin area, change employee inventory workflows, or alter permissions.

## Navigation and workflow

- Overview: enquiries requiring attention, account reviews, catalogue quality,
  weekly campaigns and connection status.
- Sales desk: quotes and orders together, searchable by company, reference and
  product EAN; quantities, sample prices, ownership, notes and email preview.
- Accounts: separate customer and supplier application reviews.
- Catalogue: product, brand, category and EAN search, visibility and missing images.
- Pricing: proposed relationship between Price Manager, customer terms and quotes.
- Campaigns: weekly brand promotions with dates, audiences and draft states.
- Settings: notification preferences, team and integration boundaries.

The plum, warm white and lime design follows the approved website direction.
The desktop sidebar becomes a navigation drawer on smaller screens.

## Data boundaries

All records and prices are illustrative. Account addresses use `.example.invalid`.
Changes are stored only in this browser under `pharma-oasis-admin-design-v1` and
can be reset with the sidebar control. Sample quotes, status changes and campaign
edits never create live records or send messages. Email previews are visual only.
The review server rejects write requests and does not expose private admin APIs.
No database migration, production release or CRM integration is included.

## Implementation checks

- Review production build succeeds.
- TypeScript reports the same 17 existing server errors; none concern these changes.
- Git whitespace validation passes.
- Browser verification of the published preview follows deployment.

Before live adoption, map the proposed workspace actions to the existing
authenticated APIs and permission checks, preserve transactional and EAN history,
and separately review the changes on the production release branch.
