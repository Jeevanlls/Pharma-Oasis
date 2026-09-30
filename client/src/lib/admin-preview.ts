// Synthetic working records for the isolated, browser-local admin design preview.
export type Product = { id: string; name: string; brand: string; category: string; ean: string; status: "Active" | "Draft" | "Archived"; image: boolean; price: number };
export type Account = { id: string; name: string; contact: string; email: string; type: "Customer" | "Supplier"; country: string; status: "Active" | "Pending review" | "More information needed"; detail: string };
export type Deal = { id: string; kind: "Quote" | "Order"; account: string; status: "To price" | "Ready to send" | "Awaiting reply" | "New order" | "In progress" | "Completed"; owner: string; time: string; urgent: boolean; notes: string; lines: { product: string; quantity: number; price: number | null }[]; activity: string[] };
export type Campaign = { id: string; brand: string; title: string; week: string; audience: string; status: "Draft" | "Scheduled" };
export type AdminPreviewState = { version: 1; products: Product[]; accounts: Account[]; deals: Deal[]; campaigns: Campaign[]; preferences: { email: string; quoteAlerts: boolean; applicationAlerts: boolean } };
export const adminPreviewKey = "pharma-oasis-admin-design-v1";
export const initialAdminState: AdminPreviewState = {
  version: 1,
  products: [
    { id: "p1", name: "My Vitamin Omega 3 6 9", brand: "Myvitamins", category: "Vitamins & supplements", ean: "5055534304143", status: "Active", image: true, price: 4.25 },
    { id: "p2", name: "BioGaia Pharax Kids Drops, 5ml", brand: "BioGaia", category: "Vitamins & supplements", ean: "7350012555276", status: "Active", image: false, price: 8.75 },
    { id: "p3", name: "Impact Whey Protein, 1kg", brand: "Myprotein", category: "Sports nutrition", ean: "0000000000103", status: "Active", image: true, price: 18.5 },
    { id: "p4", name: "Daily Gentle Cleanser, 150ml", brand: "Cetaphil", category: "Skincare", ean: "0000000000104", status: "Active", image: true, price: 5.8 },
    { id: "p5", name: "Sensitive Care Moisturiser, 50ml", brand: "Eucerin", category: "Skincare", ean: "0000000000105", status: "Active", image: true, price: 7.9 },
    { id: "p6", name: "Vitamin D3, 60 capsules", brand: "Myvitamins", category: "Vitamins & supplements", ean: "0000000000106", status: "Draft", image: false, price: 3.1 },
    { id: "p7", name: "Daily Probiotic, 30 capsules", brand: "BioGaia", category: "Vitamins & supplements", ean: "0000000000107", status: "Active", image: false, price: 9.5 },
    { id: "p8", name: "Barrier Care Cream, 200ml", brand: "Cetaphil", category: "Skincare", ean: "0000000000108", status: "Archived", image: true, price: 8.2 },
  ],
  accounts: [
    { id: "a1", name: "Willow Health Trade", contact: "Alex Morgan", email: "alex@willow.example.invalid", type: "Customer", country: "United Kingdom", status: "Active", detail: "Independent pharmacy group. Interested in mixed supplement orders and monthly replenishment." },
    { id: "a2", name: "Northline Wellness", contact: "Sam Taylor", email: "sam@northline.example.invalid", type: "Customer", country: "Ireland", status: "Active", detail: "Health retail distributor. Requests consolidated deliveries and product expiry information." },
    { id: "a3", name: "Cedar Pharmacy Group", contact: "Robin Ellis", email: "robin@cedar.example.invalid", type: "Customer", country: "United Kingdom", status: "Pending review", detail: "New trade application. Company and licence details await review; trade approval has not been granted." },
    { id: "a4", name: "Linden Export Partners", contact: "Jamie Lee", email: "jamie@linden.example.invalid", type: "Customer", country: "United Arab Emirates", status: "Active", detail: "Export customer. Please confirm minimum remaining shelf life before preparing a quotation." },
    { id: "a5", name: "Fern Distribution", contact: "Casey Green", email: "casey@fern.example.invalid", type: "Supplier", country: "United Kingdom", status: "Pending review", detail: "Supplier application: skincare and personal care. Interested in distribution partnerships. Licence documents requested." },
    { id: "a6", name: "Meadow Nutrition", contact: "Drew Parker", email: "drew@meadow.example.invalid", type: "Supplier", country: "Germany", status: "Active", detail: "Supplement manufacturer. Weekly stock lists; minimum order quantities depend on the range." },
  ],
  deals: [
    { id: "Q-1048", kind: "Quote", account: "a1", status: "To price", owner: "Unassigned", time: "09:42", urgent: true, notes: "Please confirm availability for our October supplement range. Minimum 12 months remaining shelf life.", lines: [{ product: "p1", quantity: 240, price: null }, { product: "p2", quantity: 120, price: null }], activity: ["Customer submitted an enquiry", "Product EANs and quantities captured"] },
    { id: "O-2084", kind: "Order", account: "a2", status: "New order", owner: "Sales team", time: "09:26", urgent: false, notes: "Consolidated delivery requested. Please confirm dispatch timing.", lines: [{ product: "p4", quantity: 180, price: 5.8 }, { product: "p5", quantity: 96, price: 7.9 }], activity: ["Order received at agreed customer prices"] },
    { id: "Q-1047", kind: "Quote", account: "a4", status: "To price", owner: "Jeevan", time: "09:08", urgent: true, notes: "Export enquiry. Please quote 480 units and confirm packing details.", lines: [{ product: "p3", quantity: 480, price: null }], activity: ["Customer submitted an enquiry", "Assigned to Jeevan"] },
    { id: "Q-1046", kind: "Quote", account: "a2", status: "Awaiting reply", owner: "Sales team", time: "Yesterday", urgent: false, notes: "Quotation prepared. Customer reviewing quantities.", lines: [{ product: "p1", quantity: 120, price: 4.25 }, { product: "p7", quantity: 60, price: 9.5 }], activity: ["Quotation prepared", "Sample stage: awaiting customer reply"] },
    { id: "O-2083", kind: "Order", account: "a1", status: "In progress", owner: "Jeevan", time: "Yesterday", urgent: false, notes: "Check availability before confirming fulfilment.", lines: [{ product: "p2", quantity: 96, price: 8.75 }], activity: ["Order received", "Operations review started"] },
    { id: "Q-1045", kind: "Quote", account: "a1", status: "To price", owner: "Sales team", time: "Yesterday", urgent: false, notes: "Mixed skincare enquiry. Quote pricing and availability.", lines: [{ product: "p4", quantity: 144, price: null }, { product: "p5", quantity: 72, price: null }], activity: ["Customer submitted an enquiry"] },
    { id: "O-2082", kind: "Order", account: "a4", status: "Completed", owner: "Sales team", time: "28 Sep", urgent: false, notes: "Sample completed order for workspace review.", lines: [{ product: "p3", quantity: 60, price: 18.5 }], activity: ["Order completed in this sample workflow"] },
  ],
  campaigns: [
    { id: "c1", brand: "Myprotein", title: "Strength in your next order", week: "2026-10-05", audience: "Sports nutrition customers", status: "Scheduled" },
    { id: "c2", brand: "Myvitamins", title: "Everyday essentials", week: "2026-10-05", audience: "All approved trade customers", status: "Draft" },
    { id: "c3", brand: "BioGaia", title: "A fresh look at gut health", week: "2026-10-12", audience: "Pharmacy customers", status: "Draft" },
    { id: "c4", brand: "Cetaphil", title: "Care for every shelf", week: "2026-10-12", audience: "Skincare customers", status: "Draft" },
    { id: "c5", brand: "Eucerin", title: "The skincare selection", week: "2026-10-19", audience: "Skincare customers", status: "Draft" },
  ],
  preferences: { email: "jeevan@pharmaoasis.com", quoteAlerts: true, applicationAlerts: true },
};
export function readAdminPreview(): AdminPreviewState {
  try { const saved = JSON.parse(localStorage.getItem(adminPreviewKey) || "null"); if (saved?.version === 1 && [saved.products,saved.accounts,saved.deals,saved.campaigns].every(Array.isArray) && saved.preferences) return saved; } catch { /* An unavailable or old browser draft is safe to ignore. */ }
  return structuredClone(initialAdminState);
}
export function dealTotal(deal: Deal): number | null { return deal.lines.some(line => line.price == null) ? null : deal.lines.reduce((n,line) => n + line.quantity * (line.price || 0),0); }
export const money = (n: number | null) => n == null ? "Price on request" : new Intl.NumberFormat("en-GB",{ style:"currency",currency:"GBP" }).format(n);
