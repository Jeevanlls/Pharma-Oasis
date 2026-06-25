import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useQuoteBasket } from "@/lib/quote-basket";
import logoImage from "@assets/01_1772051902531.png";
import {
  Menu,
  X,
  ShoppingCart,
  User,
  LogOut,
  LayoutDashboard,
  Package,
  Building2,
  HelpCircle,
  Phone,
  Network,
  BookOpen,
  Percent,
  Store,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const publicNavItems = [
  { href: "/products", label: "Products", icon: Package },
  { href: "/offers", label: "Offers", icon: Percent },
  { href: "/distribution-network", label: "Distribution Network", icon: Network },
  { href: "/how-to-order", label: "How to Order", icon: HelpCircle },
  { href: "/blog", label: "Insights", icon: BookOpen },
];

export function Header() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { itemCount } = useQuoteBasket();

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-18 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2" data-testid="link-home-logo">
            <img 
              src={logoImage} 
              alt="Pharma Oasis" 
              className="h-10 w-auto object-contain"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {publicNavItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={item.href === "/offers" ? "default" : location === item.href ? "secondary" : "ghost"}
                  size="sm"
                  className={`gap-2${item.href === "/offers" ? " font-semibold" : ""}`}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/portal" className="hidden sm:block">
              <Button variant="default" size="sm" className="gap-2" data-testid="button-customer-portal">
                <Store className="h-4 w-4" />
                Customer Portal
              </Button>
            </Link>

            {isAuthenticated && (
              <Link href="/quote" aria-label="View quote basket">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  aria-label="View quote basket"
                  data-testid="button-quote-basket"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {itemCount > 0 && (
                    <Badge
                      variant="default"
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                    >
                      {itemCount > 99 ? "99+" : itemCount}
                    </Badge>
                  )}
                </Button>
              </Link>
            )}

            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    data-testid="button-user-menu"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline-block max-w-[120px] truncate">
                      {user?.companyName || user?.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {isAdmin && (
                    <>
                      <Link href="/admin">
                        <DropdownMenuItem className="cursor-pointer" data-testid="link-admin-panel">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          Admin Panel
                        </DropdownMenuItem>
                      </Link>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <Link href="/dashboard">
                    <DropdownMenuItem className="cursor-pointer" data-testid="link-dashboard">
                      <User className="mr-2 h-4 w-4" />
                      My Dashboard
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/my-quotes">
                    <DropdownMenuItem className="cursor-pointer" data-testid="link-my-quotes">
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      My Quotes
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive"
                    onClick={handleLogout}
                    data-testid="button-logout"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                {/* Admin/staff sign-in is intentionally NOT linked here — it lives at a private URL (/staff).
                    Customers sign in via the "Customer Portal" button. */}
                <Link href="/register">
                  <Button size="sm" data-testid="button-register">
                    Register
                  </Button>
                </Link>
              </div>
            )}

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" aria-label="Open navigation menu" data-testid="button-mobile-menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[350px]">
                <div className="flex flex-col gap-4 mt-6">
                  <div className="flex items-center gap-2 pb-4 border-b">
                    <img 
                      src={logoImage} 
                      alt="Pharma Oasis" 
                      className="h-8 w-auto object-contain"
                    />
                  </div>

                  <nav className="flex flex-col gap-1">
                    {publicNavItems.map((item) => (
                      <Link key={item.href} href={item.href}>
                        <Button
                          variant={item.href === "/offers" ? "default" : location === item.href ? "secondary" : "ghost"}
                          className={`w-full justify-start gap-2${item.href === "/offers" ? " font-semibold" : ""}`}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Button>
                      </Link>
                    ))}
                  </nav>

                  <div className="border-t pt-4">
                    <Link href="/portal">
                      <Button className="w-full justify-start gap-2 mb-2" onClick={() => setMobileMenuOpen(false)}>
                        <Store className="h-4 w-4" />
                        Customer Portal
                      </Button>
                    </Link>
                    {isAuthenticated ? (
                      <div className="flex flex-col gap-1">
                        <Link href="/quote">
                          <Button
                            variant="ghost"
                            className="w-full justify-start gap-2"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <ShoppingCart className="h-4 w-4" />
                            Quote Basket
                            {itemCount > 0 && (
                              <Badge variant="default" className="ml-auto">
                                {itemCount}
                              </Badge>
                            )}
                          </Button>
                        </Link>
                        <Link href="/dashboard">
                          <Button
                            variant="ghost"
                            className="w-full justify-start gap-2"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <User className="h-4 w-4" />
                            My Dashboard
                          </Button>
                        </Link>
                        <Link href="/my-quotes">
                          <Button
                            variant="ghost"
                            className="w-full justify-start gap-2"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <Package className="h-4 w-4" />
                            My Quotes
                          </Button>
                        </Link>
                        {isAdmin && (
                          <Link href="/admin">
                            <Button
                              variant="ghost"
                              className="w-full justify-start gap-2"
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              <LayoutDashboard className="h-4 w-4" />
                              Admin Panel
                            </Button>
                          </Link>
                        )}
                        <Button
                          variant="ghost"
                          className="w-full justify-start gap-2 text-destructive"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            handleLogout();
                          }}
                        >
                          <LogOut className="h-4 w-4" />
                          Logout
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {/* Admin/staff sign-in lives at a private URL (/staff) and is not linked here.
                            Customers sign in via "Customer Portal" above. */}
                        <Link href="/register">
                          <Button
                            className="w-full"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            Register as Customer
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>

                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
