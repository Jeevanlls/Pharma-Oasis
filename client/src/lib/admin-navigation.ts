export interface AdminSection {
  key: string;
  label: string;
  href: string;
  links: { label: string; href: string }[];
}

const link = (label: string, path: string) => ({ label, href: `/admin${path}` });

/** Existing routes stay available; specialist tools live under one of seven areas. */
export const adminSections: AdminSection[] = [
  { key: "overview", label: "Overview", href: "/admin", links: [link("Overview", ""), link("Analytics", "/analytics")] },
  { key: "sales", label: "Sales desk", href: "/admin/sales", links: [link("Enquiries & orders", "/sales"), link("Website requests", "/website-requests"), link("Messages", "/messages"), link("Chat leads", "/chat-leads")] },
  { key: "accounts", label: "Accounts", href: "/admin/accounts", links: [link("All relationships", "/accounts"), link("Customer applications", "/users"), link("Customer logins", "/customer-sync"), link("Supplier applications", "/suppliers")] },
  { key: "catalogue", label: "Catalogue", href: "/admin/products", links: [link("Products", "/products"), link("Brands", "/brands"), link("Categories", "/categories"), link("CSV import", "/import"), link("Category assistance", "/ai-categories")] },
  { key: "pricing", label: "Pricing", href: "/admin/pricing", links: [link("Overview", "/pricing"), link("How pricing works", "/pricing-guide"), link("Daily price run", "/bulk-setup"), link("Rates", "/rates"), link("Pricing brands", "/pricing-brands"), link("Pricing categories", "/pricing-categories"), link("Cost uploads", "/cost-uploads"), link("Price Manager sync", "/pm-sync"), link("Current costs", "/current-costs"), link("Build price lists", "/price-builder"), link("Price lists", "/price-lists"), link("Customer assignments", "/assignments")] },
  { key: "campaigns", label: "Campaigns", href: "/admin/offers", links: [link("Weekly offers", "/offers"), link("Promotions", "/promotions"), link("Homepage", "/homepage"), link("Hero slides", "/hero-slides"), link("Featured brands", "/featured-brands"), link("Blog", "/blog"), link("Content", "/cms"), link("SEO", "/seo"), link("SEO assistant", "/seo-agent"), link("Product rotation", "/product-rotation"), link("Google pricing", "/google-pricing"), link("Footer content", "/footer-content")] },
  { key: "settings", label: "Settings", href: "/admin/settings", links: [link("Site settings", "/settings"), link("Staff", "/staff"), link("Security & 2FA", "/security"), link("Company locations", "/company-locations")] },
];

export function routeIsActive(path: string, href: string) {
  return path === href || (href !== "/admin" && path.startsWith(`${href}/`));
}

export function adminSectionFor(path: string) {
  return adminSections.find(section => section.links.some(link => routeIsActive(path, link.href))) ?? adminSections[0];
}
