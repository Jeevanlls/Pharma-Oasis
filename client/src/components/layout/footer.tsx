import { Link } from "wouter";
import { Mail, Phone, MapPin, Shield, Award, Truck, Building2, Globe } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import logoImage from "@assets/01_1764977214745.png";
import type { CompanyLocation } from "@shared/schema";

export function Footer() {
  const { data: locations = [] } = useQuery<CompanyLocation[]>({
    queryKey: ["/api/company-locations"],
  });

  // Get headquarters for main display
  const headquarters = locations.find(l => l.locationType === "headquarters");
  const otherLocations = locations.filter(l => l.locationType !== "headquarters");

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
                Trusted wholesale partner to 3,000+ UK pharmacies. Licensed healthcare,
                wellness and beauty distributor.
              </p>
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-1.5 text-xs text-sidebar-foreground/70">
                  <Shield className="h-4 w-4" />
                  <span>MHRA Licensed</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-sidebar-foreground/70">
                  <Award className="h-4 w-4" />
                  <span>GDP Compliant</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Quick Links</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/products" className="text-sidebar-foreground/80 hover:text-sidebar-foreground transition-colors">
                    Product Catalogue
                  </Link>
                </li>
                <li>
                  <Link href="/brands" className="text-sidebar-foreground/80 hover:text-sidebar-foreground transition-colors">
                    Our Brands
                  </Link>
                </li>
                <li>
                  <Link href="/how-to-order" className="text-sidebar-foreground/80 hover:text-sidebar-foreground transition-colors">
                    How to Order
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="text-sidebar-foreground/80 hover:text-sidebar-foreground transition-colors">
                    Register as Customer
                  </Link>
                </li>
                <li>
                  <Link href="/supplier-registration" className="text-sidebar-foreground/80 hover:text-sidebar-foreground transition-colors">
                    Become a Supplier
                  </Link>
                </li>
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
                    <a href="mailto:trade@pharmaoasis.com" className="text-sidebar-primary hover:underline">
                      trade@pharmaoasis.com
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
              © {new Date().getFullYear()} Pharma Oasis Ltd. All rights reserved.
            </p>
            <div className="flex flex-wrap gap-4 text-xs text-sidebar-foreground/60">
              <Link href="/privacy" className="hover:text-sidebar-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-sidebar-foreground transition-colors">
                Terms of Service
              </Link>
              <Link href="/cookies" className="hover:text-sidebar-foreground transition-colors">
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
