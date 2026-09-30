# Commercial range and weekly edit review — 30 September 2026

## Scope

Review service only. No production database, employee inventory, price lists, customer access or trading records were changed. The source is an explicit public-field snapshot from the website Neon database, read in a read-only transaction. Direct access to RD’s upstream Supabase database could not be verified from this workspace (DNS unavailable; connected Supabase account does not expose that project).

## Commercial authority

Price Manager determines commercial brand membership. The synced website contains 87 active pricing brands with a PM UUID, not a verified 89. Four unlinked pricing-brand records are excluded. This is not a real-time upstream sync. Current mirror cost-upload timestamps extend to 15 September.

The product subset joins unique EANs from active price-list items and the latest non-superseded Price Manager cost upload per linked brand to active website products with images. Ambiguous cross-brand EANs are held out. No costs, margins, prices, supplier quantities, customer assignments or credentials are exported. Product IDs, SKU, EAN, name, pack, case and existing photographs are retained. The snapshot’s display brand IDs are pricing-brand IDs, separate from production product brand IDs. Categories retain the reconciled website/app taxonomy. My Protein and MyVitamins display as Myprotein and Myvitamins without mutating production brand records.

- 87 verified linked commercial brands in the review brand directory.
- 19 brands have matched photographed products.
- 289 unique products with EAN matches and images, across 8 categories.
- Remaining brands invite a range enquiry; they do not receive invented product imagery.
- Legacy catalogue brand/product/offer endpoints are intercepted on the review host; unknown product detail IDs return 404. Supplier and customer pricing never reaches this snapshot.
- Review quote storage uses a new version to avoid retaining products from the prior broad catalogue.

## Five weekly selections / six brands

1. Myprotein + Myvitamins — A stronger everyday.
2. Aveeno — Care, beautifully considered.
3. Nature’s Aid — Make room for wellbeing.
4. BioGaia — A fresh range perspective.
5. Hawkins & Brimble — Everyday, well groomed.

Vitabiotics is excluded from the weekly promotion features at the user’s request. It remains in the commercial directory/catalogue where eligible; the request did not discontinue the brand.

All artwork consists of existing EAN-matched packshots laid out in the approved aubergine/white/citrus visual system. No invented discounts or dealership assertions. The initial review week is 28 September–4 October 2026, inclusive in Europe/London. Expired and paused selections disappear from the homepage and offers page.

## Review routes

- / — approved future skincare hero plus the weekly selections.
- /brands — searchable commercial brand directory.
- /products — curated catalogue with combined search/filtering.
- /offers — weekly selections and a quote-building detail view.
- /__review/campaigns — local campaign editor: dates, headline, description, palette, enabled state and 1–3 verified photographs. Updates apply to the homepage/weekly edit in the same browser. No shared or backend saving is represented as complete.

## Production integration remaining

Connect the authoritative upstream PM UUID/EAN feed; reconcile the remaining two expected brands; onboard other active app-matched PM products as drafts awaiting approved photos. Keep commercial visibility separate from inventory archive status and transaction history. Wire the reviewed campaign workflow to authenticated staff permissions and shared backend saving. Existing offers tables/admin may be extended rather than duplicated; ensure direct draft detail routes enforce active dates before seeding unpublished offers. Add approved social asset export and staff-controlled weekly rotation. Do not automatically invent deals or publish all sourced brands as direct dealerships.

## Verification

Preview build succeeds. Existing 17 server TypeScript errors remain; no client errors added. Data checks cover the 87-brand scope, 289 unique EANs, image requirements, exact EAN search, combined filters, stable pagination and absence of private pricing fields. Browser verification is recorded after deployment below.

Browser checks on deployed review: all five campaigns and their 15 real photos render; Myvitamins EAN 5055534304143 enters the quote workspace. Changing the headline and pausing the combined Myprotein/Myvitamins campaign persists across navigation and removes it from the scheduled edit (four remain). Original wording and enabled state restored after testing.

Brand directory renders exactly 87 cards; spaced search “my protein” returns Myprotein and its 10 reviewed products. The mobile weekly edit renders all five campaigns with viewport/content width both 375px (no horizontal overflow).
