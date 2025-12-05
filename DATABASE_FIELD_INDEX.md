# DATABASE FIELD INDEX
## Master Reference for All Database Tables and Fields

**RULE #1: This file MUST be updated BEFORE any schema changes.**
**No field may be added to Drizzle schema without first being documented here.**

Last Updated: Initial Creation

---

## Table: users

**Purpose:** Store all user accounts (customers and admin)

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| id | Serial | Yes | Primary key |
| email | String | Yes | Unique, used for login |
| password_hash | String | Yes | Bcrypt hashed password |
| role | Enum | Yes | 'customer' or 'admin' |
| status | Enum | Yes | 'pending', 'active', 'rejected', 'suspended' |
| business_type | String | No | Customer only: Community Pharmacy, Online Pharmacy, Wholesaler, Retailer, Healthcare Business, Other |
| company_name | String | No | Customer only |
| trading_name | String | No | Customer only |
| gphc_number | String | No | Customer only (required for pharmacies) |
| company_registration_number | String | No | Customer only |
| vat_number | String | No | Customer only |
| primary_contact_name | String | No | Customer only |
| job_title | String | No | Customer only |
| phone_number | String | No | Customer only |
| mobile_number | String | No | Customer only |
| billing_address_line_1 | String | No | Customer only |
| billing_address_line_2 | String | No | Customer only |
| billing_city | String | No | Customer only |
| billing_postcode | String | No | Customer only |
| billing_country | String | No | Customer only (default: United Kingdom) |
| delivery_same_as_billing | Boolean | No | Customer only (default: true) |
| delivery_address_line_1 | String | No | Customer only |
| delivery_address_line_2 | String | No | Customer only |
| delivery_city | String | No | Customer only |
| delivery_postcode | String | No | Customer only |
| delivery_country | String | No | Customer only |
| mhra_licence_type | String | No | Customer only: None, Wholesale Dealer (WDA(H)), Pharmacy Only, Other |
| mhra_licence_number | String | No | Customer only |
| responsible_person_name | String | No | Customer only |
| responsible_person_email | String | No | Customer only |
| cold_chain_capability | Boolean | No | Customer only (default: false) |
| interested_in_controlled_products | Boolean | No | Customer only (default: false) |
| estimated_monthly_spend | String | No | Customer only (dropdown bands) |
| ordering_contact_email | String | No | Customer only |
| accounts_payable_email | String | No | Customer only |
| preferred_order_method | String | No | Customer only: Online Portal, Email, Phone |
| how_did_you_hear | String | No | Customer only |
| notes | Text | No | Customer only (free text) |
| marketing_consent | Boolean | No | Customer only (default: false) |
| created_at | Timestamp | Yes | Auto-generated |
| updated_at | Timestamp | Yes | Auto-updated |

---

## Table: brands

**Purpose:** Master list of product brands

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| id | Serial | Yes | Primary key |
| name | String | Yes | Unique brand name |
| description | Text | No | Brand description |
| logo_url | String | No | External URL to brand logo |
| is_direct_distributor | Boolean | No | Flag to indicate if Pharma Oasis is a direct distributor for this brand - Default: false |
| is_active | Boolean | Yes | Default: true |
| created_at | Timestamp | Yes | Auto-generated |
| updated_at | Timestamp | Yes | Auto-updated |

---

## Table: categories

**Purpose:** Product categories with parent/child support

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| id | Serial | Yes | Primary key |
| name | String | Yes | Category name |
| parent_id | Int | No | NULL = top-level category, otherwise references categories.id |
| description | Text | No | Category description |
| is_active | Boolean | Yes | Default: true |
| created_at | Timestamp | Yes | Auto-generated |
| updated_at | Timestamp | Yes | Auto-updated |

---

## Table: products

**Purpose:** Complete product catalogue

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| id | Serial | Yes | Primary key |
| sku | String | Yes | Unique SKU identifier |
| ean | String | No | EAN barcode |
| brand_id | Int | Yes | Foreign key → brands.id |
| product_name | String | Yes | Product name |
| short_description | Text | No | Brief description |
| long_description | Text | No | Full description |
| category_id | Int | Yes | Foreign key → categories.id (top-level) |
| subcategory_id | Int | No | Foreign key → categories.id (child category) |
| pack_size | String | No | e.g. "500ml", "30 tablets" |
| uom | String | No | Unit of measure |
| rrp | Decimal | No | Recommended retail price |
| wholesale_price | Decimal | Yes | B2B wholesale price |
| moq | Int | No | Minimum order quantity (default: 1) |
| vat_rate | Decimal | No | VAT rate (e.g. 0.20 for 20%) |
| is_active | Boolean | Yes | Default: true |
| is_featured | Boolean | Yes | Default: false |
| image_url | String | No | External URL to product image |
| country_of_origin | String | No | Manufacturing country |
| product_type | String | No | Product classification |
| storage_conditions | String | No | Storage requirements |
| notes_internal | Text | No | Internal admin notes |
| created_at | Timestamp | Yes | Auto-generated |
| updated_at | Timestamp | Yes | Auto-updated |

---

## Table: quotes

**Purpose:** Customer quote request headers

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| id | Serial | Yes | Primary key |
| user_id | Int | Yes | Foreign key → users.id (customer) |
| status | Enum | Yes | 'pending', 'quoted', 'accepted', 'declined', 'closed' (default: pending) |
| customer_notes | Text | No | Notes from customer on submission |
| admin_notes | Text | No | Internal admin notes |
| total_estimate | Decimal | No | Calculated total (if available) |
| created_at | Timestamp | Yes | Quote submission timestamp |
| updated_at | Timestamp | Yes | Auto-updated |

---

## Table: quote_items

**Purpose:** Line items for quote requests

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| id | Serial | Yes | Primary key |
| quote_id | Int | Yes | Foreign key → quotes.id |
| product_id | Int | Yes | Foreign key → products.id |
| quantity | Int | Yes | Requested quantity |
| unit_price | Decimal | No | Price at time of quote (snapshot) |
| line_total | Decimal | No | quantity × unit_price |
| created_at | Timestamp | Yes | Auto-generated |

---

## Table: supplier_leads

**Purpose:** Supplier partnership enquiry submissions

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| id | Serial | Yes | Primary key |
| status | Enum | Yes | 'new', 'reviewing', 'approved', 'rejected' (default: new) |
| company_name | String | Yes | Supplier company name |
| trading_name | String | No | Trading name if different |
| website | String | No | Company website URL |
| country | String | Yes | Country of operation |
| business_type | String | Yes | Manufacturer, Brand Owner, Distributor, Wholesaler, Other |
| contact_name | String | Yes | Primary contact person |
| job_title | String | No | Contact job title |
| email | String | Yes | Contact email |
| phone_number | String | Yes | Contact phone |
| mhra_gdp_licences | Text | No | MHRA/GDP licence details (free text) |
| gdp_accredited | Boolean | No | GDP accreditation checkbox (default: false) |
| product_categories_supply | Text | Yes | Categories supplied |
| brand_names_represent | Text | Yes | Brand names represented |
| licensed_uk_eu | String | No | Yes / Partly / No / N/A |
| exclusivity_interest | Boolean | No | Interested in exclusivity (default: false) |
| stock_locations | Text | No | Stock/warehouse locations |
| minimum_order_quantities | Text | No | MOQ details |
| logistics_capability | Text | No | Logistics/delivery capability |
| proposal_summary | Text | Yes | Summary of proposal |
| additional_notes | Text | No | Additional information |
| marketing_consent | Boolean | No | Marketing consent (default: false) |
| admin_notes | Text | No | Internal admin notes |
| created_at | Timestamp | Yes | Submission timestamp |
| updated_at | Timestamp | Yes | Auto-updated |

---

## Table: cms_blocks

**Purpose:** Dynamic CMS content for homepage and static pages

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| id | Serial | Yes | Primary key |
| key | String | Yes | Unique identifier (e.g. 'homepage_hero_headline') |
| section | String | Yes | Grouping (e.g. 'homepage', 'static_pages', 'navigation') |
| content | Text | Yes | Actual content (text/HTML) |
| content_type | String | No | 'text', 'html', 'json' (default: text) |
| created_at | Timestamp | Yes | Auto-generated |
| updated_at | Timestamp | Yes | Auto-updated |

---

## Table: site_settings

**Purpose:** Site-wide configuration settings

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| id | Serial | Yes | Primary key |
| key | String | Yes | Unique setting key (e.g. 'active_theme', 'admin_notification_email') |
| value | Text | Yes | Setting value |
| description | String | No | Human-readable description |
| created_at | Timestamp | Yes | Auto-generated |
| updated_at | Timestamp | Yes | Auto-updated |

---

## Table: contact_messages

**Purpose:** Contact form submissions

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| id | Serial | Yes | Primary key |
| name | String | Yes | Sender name |
| email | String | Yes | Sender email |
| phone | String | No | Sender phone (optional) |
| message | Text | Yes | Message content |
| status | Enum | No | 'new', 'read', 'responded', 'archived' (default: new) |
| admin_notes | Text | No | Internal admin notes |
| created_at | Timestamp | Yes | Submission timestamp |
| updated_at | Timestamp | Yes | Auto-updated |

---

## Enums & Allowed Values

### User Role
- `customer`
- `admin`

### User Status
- `pending` (awaiting approval)
- `active` (approved, can login)
- `rejected` (denied registration)
- `suspended` (temporarily disabled)

### Quote Status
- `pending` (default, awaiting review)
- `quoted` (admin has prepared/sent quote)
- `accepted` (customer accepted)
- `declined` (not proceeding)
- `closed` (completed/archived)

### Supplier Lead Status
- `new` (default, just submitted)
- `reviewing` (under evaluation)
- `approved` (accepted as supplier)
- `rejected` (not proceeding)

### Contact Message Status
- `new` (default)
- `read`
- `responded`
- `archived`

---

**END OF DATABASE_FIELD_INDEX.md**
