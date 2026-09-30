# Expanded app range — 30 September 2026

This supersedes the photographed-only eligibility rule in price-manager-weekly-edit-2026-09-30.md. The user explicitly requested that missing photographs must not prevent products or brands appearing.

## Published scope

Review only: all active app records matched to the verified Price Manager commercial brand range by normalized brand name, explicit evidenced aliases, or exact PM EAN. The full employee app has 117,748 non-archived records; this phase prioritises the established commercial range, not every legacy app brand. Neither production database was mutated.

- 9,313 source app records; eight whitespace variants of duplicate EANs display once.
- 9,305 catalogue products, up from 289.
- 521 retained website photographs matched by EAN.
- 8,784 products use Image coming soon and remain searchable and quotable.
- 87 verified PM-linked brand groups; 82 have matching active app products.
- 15 source-app categories.
- 489 temporary/non-barcode references remain available, labelled Ref rather than EAN.
- All previous 289 products and their exact image URLs are retained.

## Brand detail

| Commercial brand | Products | Existing photographs |
| --- | ---: | ---: |
| BioGaia | 18 | 7 |
| Aveeno | 123 | 62 |
| Myprotein | 962 | 12 |
| Myvitamins | 39 | 1 |
| Nature's Aid | 202 | 107 |
| Hawkins & Brimble | 44 | 35 |

BioGaia includes the eight Price Manager products plus other active app products. Previously absent EANs 7350012555276 and 7350012555603 are included without photographs.

BIOSEN, LIGHTS BY TENA, OLEO, TENA LADY and TENA MEN currently lack an unambiguous active app match in the verified extraction. Keep these brand pages as enquiries pending mapping; this is not an image restriction. App brand Tena is not automatically assigned to a men's or women's subgroup without evidence.

## Identity and data rules

App name, category, product type/status, pack and case details are carried through; only non-archived app rows enter the source export. Commercial grouping uses a unique Price Manager EAN match first, then a normalized app brand match. Explicit aliases supported by source EANs: VALUPAK→ValuePak, Warrior→Warrior Nutrition, Max Dry→MAXXDRY, Nanny→Nanny Care, BYPHASSSE→BYPHASSE, PG TIPS/Lipton→Lipton - PG Tips. This does not rewrite the employee app's brand field. The private audit flags 411 discrepancies between app brand text and the commercial group for later master-data review.

Whitespace is removed from numeric barcode strings; leading zeroes are preserved. Only standard 8, 12, 13 or 14 digit lengths are labelled as barcodes. Truncated numeric values remain searchable product references; zeroes are never guessed. Duplicate canonical EANs display once. Temporary NEW- references are retained as product references; no barcode is invented. Existing website IDs and photographs are retained by EAN. New preview-only products have negative app-derived IDs, preventing collisions with positive website IDs. These IDs must not be sent to the production quote backend; the review remains browser-local and all API writes remain blocked.

The app image_url field includes website-page links, example.com placeholders and unverified external sources. These are not automatically treated as approved product photography. Existing website photos remain authoritative for this phase. Other photos can be reviewed/uploaded later without blocking product visibility.

## Implementation

script/build-commercial-review.py produces an allowlisted public snapshot from explicit read-only source exports. Its inputs contain no supplier/customer prices. The compressed JSON snapshot avoids committing a multi-megabyte raw data file. The server decompresses once at startup, paginates catalogue reads, and returns only photographed products to campaign artwork consumers. Brand counts include all products, not only those with images.

Product cards, detail modals, search, saved lists and quote lines tolerate missing images. Temporary references are labelled accurately, including separate EAN and product-reference columns in the quote CSV. Brand initials remain the fallback when a logo is absent. Campaign artwork continues to use real photographs.

## Verification

Build passed. No client TypeScript errors; the existing server errors are unchanged. Verified unique catalogue IDs and canonical EANs, all 289 previous products/images preserved, both missing BioGaia products present without photos, BioGaia count 18, exact-EAN combined brand filtering, temporary-reference search, taxonomy integrity and public-field allowlist. Deployment/browser checks follow in the task record.

## Remaining live work

This is a dated review snapshot, not a production import or continuous synchronisation. Connect the production catalogue/quote identity mapping and scheduled sync before launch. Confirm the two additional expected PM brands and the five unresolved app brand mappings. Review master-brand discrepancies and external image URLs separately. Image absence is no longer a publishing gate.

Browser verification on the deployed expanded review: BioGaia count 18; both previously missing EANs display Image coming soon. Pharax Kids Drops opens its detail modal and adds to the quote workspace with the correct EAN/pack size despite having no photo. A subsequent barcode-format correction relabels truncated numeric identifiers as product references without changing product counts.

## Catalogue presentation update

At Jeevan's request, browsing now places existing photographed products first and rotates between brands instead of opening with a global alphabetical list. The current commercial selections lead the rotation: Myprotein, Aveeno, Nature's Aid, BioGaia, Hawkins & Brimble and Myvitamins. Other brands follow by available range size. Each round takes one product per brand, using a fixed order so products do not repeat or disappear between pages.

The first two pages (24 products each) contain photographs throughout and a mixture of brands. All 9,305 products remain available; products without photos follow the photographed range. Brand/category filters retain photo priority, while searches keep exact EAN matches first regardless of whether a photograph exists. This changes presentation in the review only, not product records or eligibility.

## Subsequent incomplete-product archive

Jeevan authorised archiving products missing brand, category or classification, retaining any with sales/purchase history. The three groups overlap: 4,815 distinct app products, with 522 protected by transaction, inventory or commercial-work history. On 30 September, 4,293 products were soft-archived in the employee app, leaving 113,455 non-archived app records. Product identity, prices, stock and all other product fields were preserved. A recovery copy and guarded restore scripts were saved before mutation.

None of those archive candidates were public website product rows. However, 18 matching customer price-list entries were deactivated after checking quote/order history, including EAN-only and price-list-item references. Their prices and other fields were preserved.

The review snapshot contained 164 of the archived records, all without photos. `review-data/archived-product-ids.json` excludes them from catalogue search, detail endpoints, category/brand totals and promotion data. The review now has 9,141 products and retains all 521 photographs. The opening photographed pages remain unchanged. Future full app exports should exclude archived records at source; preserve this exclusion file while the earlier snapshot is still used.

For the original RD cleanup, 103,436 was the count requiring field updates, not the active product total. The file matched 117,643 records. 4,689 source rows used `active` in the classification field; the original cleanup retained their previous classification instead of interpreting that text as POM/GSL/NON_PHARMACEUTICAL.
