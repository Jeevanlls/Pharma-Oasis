import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  UserCog,
  ShieldCheck,
  Package,
  Building2,
  Tag,
  FileText,
  Upload,
  Globe,
  MessageSquare,
  Settings,
  LogOut,
  Home,
  Image,
  Star,
  ScrollText,
  Bot,
  MapPin,
  BarChart3,
  Newspaper,
  Shuffle,
  Percent,
  FileUp,
  Coins,
  ClipboardList,
  PoundSterling,
  BookOpen,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const mainMenuItems = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard, staffAccess: true },
  { title: "Analytics", href: "/admin/analytics", icon: BarChart3, staffAccess: false },
  { title: "Users", href: "/admin/users", icon: Users, staffAccess: false },
  { title: "Staff", href: "/admin/staff", icon: UserCog, staffAccess: false },
  { title: "Security (2FA)", href: "/admin/security", icon: ShieldCheck, staffAccess: false },
  { title: "Products", href: "/admin/products", icon: Package, staffAccess: true },
  { title: "Brands", href: "/admin/brands", icon: Building2, staffAccess: true },
  { title: "Categories", href: "/admin/categories", icon: Tag, staffAccess: true },
  { title: "Quotes", href: "/admin/quotes", icon: FileText, staffAccess: false },
  { title: "Orders", href: "/admin/orders", icon: ClipboardList, staffAccess: false },
  { title: "CSV Import", href: "/admin/import", icon: Upload, staffAccess: true },
  { title: "Suppliers", href: "/admin/suppliers", icon: Globe, staffAccess: false },
  { title: "Messages", href: "/admin/messages", icon: MessageSquare, staffAccess: false },
  { title: "Chat Leads", href: "/admin/chat-leads", icon: Bot, staffAccess: false },
  { title: "Offers", href: "/admin/offers", icon: Percent, staffAccess: false },
];

const pricingMenuItems = [
  { title: "How this works (guide)", href: "/admin/pricing-guide", icon: BookOpen, staffAccess: true },
  { title: "1. Brands", href: "/admin/pricing-brands", icon: Building2, staffAccess: false },
  { title: "2. Categories", href: "/admin/pricing-categories", icon: Tag, staffAccess: false },
  { title: "3. Cost Uploads", href: "/admin/cost-uploads", icon: FileUp, staffAccess: false },
  { title: "4. Current Costs", href: "/admin/current-costs", icon: PoundSterling, staffAccess: false },
  { title: "5. Price Lists", href: "/admin/price-builder", icon: Coins, staffAccess: false },
  { title: "6. Who Sees What", href: "/admin/assignments", icon: Users, staffAccess: false },
  // Legacy "Price Lists" page hidden from the sidebar — superseded by the Price List Builder.
  // Route still registered in App.tsx (/admin/price-lists) so it's reversible; no data removed.
  // { title: "Price Lists (legacy)", href: "/admin/price-lists", icon: Coins, staffAccess: false },
];

const homepageMenuItems = [
  { title: "Hero Slides", href: "/admin/hero-slides", icon: Image, staffAccess: false },
  { title: "Featured Brands", href: "/admin/featured-brands", icon: Star, staffAccess: false },
];

const siteMenuItems = [
  { title: "Blog", href: "/admin/blog", icon: Newspaper, staffAccess: false },
  { title: "SEO Management", href: "/admin/seo", icon: Globe, staffAccess: false },
  { title: "SEO AI Agent", href: "/admin/seo-agent", icon: Bot, staffAccess: false },
  { title: "Product Rotation", href: "/admin/product-rotation", icon: Shuffle, staffAccess: false },
  { title: "Google Pricing", href: "/admin/google-pricing", icon: Tag, staffAccess: false },
  { title: "AI Categories", href: "/admin/ai-categories", icon: Bot, staffAccess: false },
  { title: "CMS", href: "/admin/cms", icon: LayoutDashboard, staffAccess: false },
  { title: "Footer Content", href: "/admin/footer-content", icon: ScrollText, staffAccess: false },
  { title: "Company Locations", href: "/admin/company-locations", icon: MapPin, staffAccess: false },
  { title: "Settings", href: "/admin/settings", icon: Settings, staffAccess: false },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  // Keep the active menu item visible: navigating between pages resets the
  // sidebar scroll to the top, which buried the lower groups (e.g. Customer
  // Pricing) and made it feel like the menu "jumped" away. After each route
  // change, scroll the highlighted item back into view.
  useEffect(() => {
    const el = document.querySelector('[data-sidebar="menu-button"][data-active="true"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [location]);

  const isStaff = user?.role === "staff";
  const isAdmin = user?.role === "admin";
  
  const filteredMainMenuItems = mainMenuItems.filter(item => isAdmin || item.staffAccess);
  const filteredPricingMenuItems = pricingMenuItems.filter(item => isAdmin || item.staffAccess);
  const filteredHomepageMenuItems = homepageMenuItems.filter(item => isAdmin || item.staffAccess);
  const filteredSiteMenuItems = siteMenuItems.filter(item => isAdmin || item.staffAccess);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b p-4">
            <Link href="/admin">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                  PO
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">Pharma Oasis</span>
                  <span className="text-xs text-muted-foreground">Admin Panel</span>
                </div>
              </div>
            </Link>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Management</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredMainMenuItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={location === item.href}
                      >
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {filteredPricingMenuItems.length > 0 && (
              <SidebarGroup className="my-1 mx-2 rounded-lg border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <SidebarGroupLabel className="text-emerald-700 dark:text-emerald-400 font-semibold">
                  <PoundSterling className="h-3.5 w-3.5 mr-1" /> Customer Pricing
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {filteredPricingMenuItems.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={location === item.href}
                          className="text-emerald-900/90 dark:text-emerald-100/90 data-[active=true]:bg-emerald-600 data-[active=true]:text-white"
                        >
                          <Link href={item.href}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {filteredHomepageMenuItems.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel>Homepage</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {filteredHomepageMenuItems.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={location === item.href}
                        >
                          <Link href={item.href}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {filteredSiteMenuItems.length > 0 && (
              <SidebarGroup>
                <SidebarGroupLabel>Site</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {filteredSiteMenuItems.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={location === item.href}
                        >
                          <Link href={item.href}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>

          <SidebarFooter className="border-t p-4">
            <div className="flex items-center justify-between">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Home className="h-4 w-4" />
                  View Site
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
            <SidebarTrigger data-testid="button-admin-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user?.primaryContactName || user?.email}
              </span>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
