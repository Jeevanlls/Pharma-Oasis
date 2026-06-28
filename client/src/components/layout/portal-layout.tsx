import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { usePortalBasket } from "@/lib/portal-basket";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import logoImage from "@assets/01_1772051902531.png";
import { ShoppingCart, LogOut, LayoutGrid, FileText, Package, ClipboardList, Download, Megaphone } from "lucide-react";

const navItems = [
  { href: "/portal", label: "Catalogue", icon: LayoutGrid },
  { href: "/portal/promotions", label: "Promotions", icon: Megaphone },
  { href: "/portal/orders", label: "My Orders", icon: ClipboardList },
  { href: "/my-quotes", label: "My Quotes", icon: FileText },
  { href: "/portal/downloads", label: "Price List", icon: Download },
];

export function PortalLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { itemCount } = usePortalBasket();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <Link href="/portal" className="flex items-center gap-2">
                <img src={logoImage} alt="Pharma Oasis" className="h-9 w-auto object-contain" />
                <span className="hidden sm:inline text-xs font-semibold text-muted-foreground border-l pl-2">Customer Portal</span>
              </Link>
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Button variant={location === item.href ? "secondary" : "ghost"} size="sm" className="gap-2">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/basket" aria-label="Basket">
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {itemCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {itemCount > 99 ? "99+" : itemCount}
                    </Badge>
                  )}
                </Button>
              </Link>
              <span className="hidden sm:inline text-sm text-muted-foreground max-w-[160px] truncate">
                {user?.companyName || user?.email}
              </span>
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>

          {/* Mobile nav */}
          <nav className="md:hidden flex items-center gap-1 pb-2 overflow-x-auto">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button variant={location === item.href ? "secondary" : "ghost"} size="sm" className="gap-2 whitespace-nowrap">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">{children}</main>

      <footer className="border-t bg-background py-4">
        <div className="mx-auto max-w-7xl px-4 text-xs text-muted-foreground flex items-center gap-2">
          <Package className="h-3 w-3" /> Pharma Oasis Customer Portal — prices shown are your account prices.
        </div>
      </footer>
    </div>
  );
}
