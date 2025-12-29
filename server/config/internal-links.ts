/**
 * Internal Link Configuration for AI Blog Generation
 * 
 * Centralized configuration for all internal links used in AI-generated content.
 * This ensures maintainability and prevents broken links.
 */

export const INTERNAL_LINKS = {
  compliance: "/compliance",
  products: "/products",
  brands: "/brands",
  howToOrder: "/how-to-order",
  distributionNetwork: "/distribution-network",
  contact: "/contact",
  blog: "/blog",
  register: "/register",
} as const;

/**
 * Full URLs for production use (absolute URLs)
 */
export const SITE_URL = "https://pharmaoasis.co.uk";

export const INTERNAL_URLS = {
  compliance: `${SITE_URL}/compliance`,
  products: `${SITE_URL}/products`,
  brands: `${SITE_URL}/brands`,
  howToOrder: `${SITE_URL}/how-to-order`,
  distributionNetwork: `${SITE_URL}/distribution-network`,
  contact: `${SITE_URL}/contact`,
  blog: `${SITE_URL}/blog`,
  register: `${SITE_URL}/register`,
} as const;

/**
 * Topics that should trigger a compliance link
 */
export const COMPLIANCE_KEYWORDS = [
  "gdp",
  "good distribution practice",
  "mhra",
  "wda",
  "wda(h)",
  "wholesale dealer",
  "pharmaceutical regulation",
  "regulatory compliance",
  "pharmaceutical licensing",
  "quality management",
  "cold chain",
  "falsified medicines",
  "fmd",
  "responsible person",
  "pharmaceutical distribution",
] as const;

/**
 * Check if a topic should include a compliance link
 */
export function shouldIncludeComplianceLink(topic: string): boolean {
  const lowerTopic = topic.toLowerCase();
  return COMPLIANCE_KEYWORDS.some(keyword => lowerTopic.includes(keyword));
}

/**
 * Anchor text suggestions for compliance links
 */
export const COMPLIANCE_ANCHOR_TEXTS = [
  "GDP Compliance Framework",
  "MHRA & GDP Compliance",
  "Regulatory Compliance Overview",
  "our compliance standards",
  "pharmaceutical compliance requirements",
  "GDP compliance standards",
] as const;
