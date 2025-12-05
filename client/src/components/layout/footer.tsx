import { Link } from "wouter";
import { Mail, Phone, MapPin, Shield, Award, Truck } from "lucide-react";
import logoImage from "@assets/01_1764977214745.png";

export function Footer() {
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
              <h3 className="font-semibold">Contact Us</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <Mail className="h-4 w-4 mt-0.5 text-sidebar-foreground/70" />
                  <div>
                    <p className="text-sidebar-foreground/80">General Enquiries</p>
                    <a href="mailto:info@pharmaoasis.com" className="text-sidebar-primary hover:underline">
                      info@pharmaoasis.com
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <Phone className="h-4 w-4 mt-0.5 text-sidebar-foreground/70" />
                  <div>
                    <p className="text-sidebar-foreground/80">Customer Support</p>
                    <a href="tel:+442012345678" className="text-sidebar-primary hover:underline">
                      +44 (0) 20 1234 5678
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-sidebar-foreground/70" />
                  <div>
                    <p className="text-sidebar-foreground/80">
                      Pharma Oasis Ltd<br />
                      123 Healthcare Way<br />
                      London, UK EC1A 1BB
                    </p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold">Our Promise</h3>
              <ul className="space-y-3 text-sm">
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
