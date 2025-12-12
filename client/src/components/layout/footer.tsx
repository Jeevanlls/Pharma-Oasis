import { Link } from "wouter";
import { Mail, Phone, Truck, Building2, Globe, Shield, Award } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { SiFacebook, SiInstagram, SiX, SiLinkedin, SiYoutube, SiTiktok } from "react-icons/si";
import logoImage from "@assets/01_1764977214745.png";
import type { CompanyLocation, CmsBlock } from "@shared/schema";

interface SiteSettings {
  site_name?: string;
  site_tagline?: string;
  contact_email?: string;
  contact_phone?: string;
  active_theme?: string;
  social_facebook?: string;
  social_instagram?: string;
  social_twitter?: string;
  social_linkedin?: string;
  social_youtube?: string;
  social_tiktok?: string;
}

interface FooterLink {
  label: string;
  url: string;
}

function MHRALogo() {
  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-sidebar-foreground/10">
      <div className="flex flex-col items-center">
        <svg viewBox="0 0 60 40" className="h-8 w-12">
          <rect x="2" y="2" width="56" height="36" rx="4" fill="none" stroke="currentColor" strokeWidth="2" className="text-sidebar-foreground/80"/>
          <text x="30" y="18" textAnchor="middle" fill="currentColor" className="text-sidebar-foreground" fontSize="10" fontWeight="bold" fontFamily="Arial, sans-serif">MHRA</text>
          <text x="30" y="30" textAnchor="middle" fill="currentColor" className="text-sidebar-foreground/70" fontSize="6" fontFamily="Arial, sans-serif">WDA(H) Licensed</text>
        </svg>
      </div>
      <div className="text-left">
        <p className="text-[10px] font-semibold text-sidebar-foreground leading-tight">Medicines & Healthcare</p>
        <p className="text-[10px] font-semibold text-sidebar-foreground leading-tight">Regulatory Agency</p>
        <p className="text-[9px] text-sidebar-foreground/60">Licence: 53820</p>
      </div>
    </div>
  );
}

function GDPLogo() {
  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-sidebar-foreground/10">
      <div className="flex flex-col items-center">
        <svg viewBox="0 0 50 40" className="h-8 w-10">
          <circle cx="25" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-sidebar-foreground/80"/>
          <text x="25" y="18" textAnchor="middle" fill="currentColor" className="text-sidebar-foreground" fontSize="9" fontWeight="bold" fontFamily="Arial, sans-serif">GDP</text>
          <text x="25" y="28" textAnchor="middle" fill="currentColor" className="text-sidebar-foreground/70" fontSize="5" fontFamily="Arial, sans-serif">CERTIFIED</text>
          <path d="M17 20 L22 25 L33 14" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-400" opacity="0.8" transform="translate(0, 5)"/>
        </svg>
      </div>
      <div className="text-left">
        <p className="text-[10px] font-semibold text-sidebar-foreground leading-tight">Good Distribution</p>
        <p className="text-[10px] font-semibold text-sidebar-foreground leading-tight">Practice Compliant</p>
        <p className="text-[9px] text-sidebar-foreground/60">Supply Chain Certified</p>
      </div>
    </div>
  );
}

export function Footer() {
  const { data: locations = [] } = useQuery<CompanyLocation[]>({
    queryKey: ["/api/company-locations"],
  });

  const { data: siteSettings } = useQuery<SiteSettings>({
    queryKey: ["/api/site-settings"],
  });

  const { data: cmsBlocks = [] } = useQuery<CmsBlock[]>({
    queryKey: ["/api/cms-blocks/footer"],
  });

  const contactEmail = siteSettings?.contact_email || "trade@pharmaoasis.com";
  const contactPhone = siteSettings?.contact_phone || "+44 7481 640640";

  const headquarters = locations.find(l => l.locationType === "headquarters");
  const otherLocations = locations.filter(l => l.locationType !== "headquarters");

  // Get footer content from CMS
  const getContent = (key: string, fallback: string) => {
    const block = cmsBlocks.find(b => b.key === key);
    return block?.content || fallback;
  };

  const footerTagline = getContent("footer_tagline", "Trusted wholesale partner to 3,000+ UK pharmacies. Licensed healthcare, wellness and beauty distributor.");
  const footerCopyright = getContent("footer_copyright", "Pharma Oasis Limited. All rights reserved.");

  // Parse JSON links
  const quickLinksJson = getContent("footer_quick_links", "[]");
  const policyLinksJson = getContent("footer_policy_links", "[]");
  
  let quickLinks: FooterLink[] = [];
  let policyLinks: FooterLink[] = [];
  
  try {
    quickLinks = JSON.parse(quickLinksJson);
  } catch { 
    quickLinks = [
      { label: "Product Catalogue", url: "/products" },
      { label: "Our Brands", url: "/brands" },
      { label: "How to Order", url: "/how-to-order" },
      { label: "Register as Customer", url: "/register" },
      { label: "Become a Supplier", url: "/supplier-registration" }
    ];
  }
  
  try {
    policyLinks = JSON.parse(policyLinksJson);
  } catch {
    policyLinks = [
      { label: "Privacy Policy", url: "/privacy" },
      { label: "Terms of Service", url: "/terms" },
      { label: "Cookie Policy", url: "/cookies" }
    ];
  }

  return (
    <footer className="bg-sidebar text-sidebar-foreground">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-12 md:py-16">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <img 
                  src={logoImage} 
                  alt="Pharma Oasis" 
                  className="h-10 w-auto brightness-0 invert"
                />
              </div>
              <p className="text-sm text-sidebar-foreground/80 leading-relaxed">
                {footerTagline}
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <MHRALogo />
                <GDPLogo />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                {quickLinks.map((link, index) => (
                  <li key={index}>
                    <Link href={link.url} className="text-sidebar-foreground/80 hover:text-sidebar-foreground transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Head Office</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 mt-0.5 text-sidebar-foreground/70 flex-shrink-0" />
                  <div>
                    {headquarters ? (
                      <>
                        <p className="font-medium text-sidebar-foreground">{headquarters.companyName}</p>
                        <p className="text-sidebar-foreground/80">
                          {headquarters.addressLine1}<br />
                          {headquarters.addressLine2 && <>{headquarters.addressLine2}<br /></>}
                          {headquarters.city}, {headquarters.postcode}<br />
                          {headquarters.country}
                        </p>
                        {headquarters.vatNumber && (
                          <p className="text-xs text-sidebar-foreground/60 mt-1">
                            VAT: {headquarters.vatNumber}
                          </p>
                        )}
                        {headquarters.companyRegNumber && (
                          <p className="text-xs text-sidebar-foreground/60">
                            Reg: {headquarters.companyRegNumber}
                          </p>
                        )}
                        {headquarters.wdaLicenceNumber && (
                          <p className="text-xs text-sidebar-foreground/60">
                            WDA(H): {headquarters.wdaLicenceNumber}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sidebar-foreground/80">
                        Pharma Oasis Limited<br />
                        United Kingdom
                      </p>
                    )}
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Mail className="h-4 w-4 mt-0.5 text-sidebar-foreground/70 flex-shrink-0" />
                  <div>
                    <a href={`mailto:${contactEmail}`} className="text-sidebar-primary hover:underline">
                      {contactEmail}
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Phone className="h-4 w-4 mt-0.5 text-sidebar-foreground/70 flex-shrink-0" />
                  <div>
                    <a href={`tel:${contactPhone.replace(/\s+/g, "")}`} className="text-sidebar-primary hover:underline">
                      {contactPhone}
                    </a>
                  </div>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Global Presence</h3>
              <ul className="space-y-3 text-sm">
                {otherLocations.map((location) => (
                  <li key={location.id} className="flex items-start gap-2">
                    <Globe className="h-4 w-4 mt-0.5 text-sidebar-primary flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sidebar-foreground/90">{location.locationName}</p>
                      <p className="text-xs text-sidebar-foreground/70">
                        {location.city}, {location.country}
                      </p>
                    </div>
                  </li>
                ))}
                {otherLocations.length === 0 && (
                  <>
                    <li className="flex items-start gap-2">
                      <Truck className="h-4 w-4 mt-0.5 text-sidebar-primary" />
                      <span className="text-sidebar-foreground/80">Fast, reliable UK-wide delivery</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Shield className="h-4 w-4 mt-0.5 text-sidebar-primary" />
                      <span className="text-sidebar-foreground/80">MHRA WDA(H) licensed operations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Award className="h-4 w-4 mt-0.5 text-sidebar-primary" />
                      <span className="text-sidebar-foreground/80">GDP-compliant supply chain</span>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-sidebar-border py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-sidebar-foreground/60">
              © {new Date().getFullYear()} {footerCopyright}
            </p>
            <div className="flex items-center gap-6">
              {/* Social Media Icons */}
              <div className="flex items-center gap-3">
                {siteSettings?.social_facebook && (
                  <a 
                    href={siteSettings.social_facebook} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sidebar-foreground/60 hover:text-sidebar-primary transition-colors"
                    aria-label="Facebook"
                    data-testid="link-social-facebook"
                  >
                    <SiFacebook className="h-5 w-5" />
                  </a>
                )}
                {siteSettings?.social_instagram && (
                  <a 
                    href={siteSettings.social_instagram} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sidebar-foreground/60 hover:text-sidebar-primary transition-colors"
                    aria-label="Instagram"
                    data-testid="link-social-instagram"
                  >
                    <SiInstagram className="h-5 w-5" />
                  </a>
                )}
                {siteSettings?.social_twitter && (
                  <a 
                    href={siteSettings.social_twitter} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sidebar-foreground/60 hover:text-sidebar-primary transition-colors"
                    aria-label="X (Twitter)"
                    data-testid="link-social-twitter"
                  >
                    <SiX className="h-5 w-5" />
                  </a>
                )}
                {siteSettings?.social_linkedin && (
                  <a 
                    href={siteSettings.social_linkedin} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sidebar-foreground/60 hover:text-sidebar-primary transition-colors"
                    aria-label="LinkedIn"
                    data-testid="link-social-linkedin"
                  >
                    <SiLinkedin className="h-5 w-5" />
                  </a>
                )}
                {siteSettings?.social_youtube && (
                  <a 
                    href={siteSettings.social_youtube} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sidebar-foreground/60 hover:text-sidebar-primary transition-colors"
                    aria-label="YouTube"
                    data-testid="link-social-youtube"
                  >
                    <SiYoutube className="h-5 w-5" />
                  </a>
                )}
                {siteSettings?.social_tiktok && (
                  <a 
                    href={siteSettings.social_tiktok} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sidebar-foreground/60 hover:text-sidebar-primary transition-colors"
                    aria-label="TikTok"
                    data-testid="link-social-tiktok"
                  >
                    <SiTiktok className="h-5 w-5" />
                  </a>
                )}
              </div>
              {/* Policy Links */}
              <div className="flex flex-wrap gap-4 text-xs text-sidebar-foreground/60">
                {policyLinks.map((link, index) => (
                  <Link key={index} href={link.url} className="hover:text-sidebar-foreground transition-colors">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
