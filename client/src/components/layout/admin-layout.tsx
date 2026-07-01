import { useEffect, useState } from "react";
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
  ShoppingCart,
  PoundSterling,
  BookOpen,
  Layers,
  Megaphone,
  ChevronDown,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = { title: string; href: string; icon: any; staffAccess: boolean };
type NavGroup = { key: string; label: string; icon: any; accent?: "emerald"; items: NavItem[] };

// Always-visible items at the very top of the sidebar.
const topItems: NavItem[] = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard, staffAccess: true },
  { title: "Analytics", href: "/admin/analytics", icon: BarChart3, staffAccess: false },
];

// Collapsible groups.
const navGroups: NavGroup[] = [
  {
    key: "catalogue",
    label: "Catalogue",
    icon: Package,
    items: [
      { title: "Products", href: "/admin/products", icon: Package, staffAccess: true },
      { title: "Brands", href: "/admin/brands", icon: Building2, staffAccess: true },
      { title: "Categories", href: "/admin/categories", icon: Tag, staffAccess: true },
      { title: "CSV Import", href: "/admin/import", icon: Upload, staffAccess: true },
    ],
  },
  {
    key: "sales",
    label: "Sales & Enquiries",
    icon: ShoppingCart,
    items: [
      { title: "Sales (pipeline)", href: "/admin/sales", icon: ShoppingCart, staffAccess: false },
      { title: "Offers", href: "/admin/offers", icon: Percent, staffAccess: false },
      { title: "Suppliers", href: "/admin/suppliers", icon: Globe, staffAccess: false },
      { title: "Messages", href: "/admin/messages", icon: MessageSquare, staffAccess: false },
      { title: "Chat Leads", href: "/admin/chat-leads", icon: Bot, staffAccess: false },
    ],
  },
  {
    key: "pricing",
    label: "Customer Pricing",
    icon: PoundSterling,
    accent: "emerald",
    items: [
      { title: "Overview", href: "/admin/pricing", icon: Layers, staffAccess: true },
      { title: "How this works (guide)", href: "/admin/pricing-guide", icon: BookOpen, staffAccess: true },
      { title: "1. Brands", href: "/admin/pricing-brands", icon: Building2, staffAccess: false },
      { title: "2. Categories", href: "/admin/pricing-categories", icon: Tag, staffAccess: false },
      { title: "3. Cost Uploads", href: "/admin/cost-uploads", icon: FileUp, staffAccess: false },
      { title: "4. Current Costs", href: "/admin/current-costs", icon: PoundSterling, staffAccess: false },
      { title: "5. Price Lists", href: "/admin/price-builder", icon: Coins, staffAccess: false },
      { title: "6. Who Sees What", href: "/admin/assignments", icon: Users, staffAccess: false },
      { title: "7. Promotions", href: "/admin/promotions", icon: Megaphone, staffAccess: false },
    ],
  },
  {
    key: "users",
    label: "Users & Security",
    icon: UserCog,
    items: [
      { title: "Users", href: "/admin/users", icon: Users, staffAccess: false },
      { title: "Staff", href: "/admin/staff", icon: UserCog, staffAccess: false },
      { title: "Security (2FA)", href: "/admin/security", icon: ShieldCheck, staffAccess: false },
    ],
  },
  {
    key: "homepage",
    label: "Homepage",
    icon: Image,
    items: [
      { title: "Hero Slides", href: "/admin/hero-slides", icon: Image, staffAccess: false },
      { title: "Featured Brands", href: "/admin/featured-brands", icon: Star, staffAccess: false },
    ],
  },
  {
    key: "content",
    label: "Content & SEO",
    icon: Newspaper,
    items: [
      { title: "Blog", href: "/admin/blog", icon: Newspaper, staffAccess: false },
      { title: "SEO Management", href: "/admin/seo", icon: Globe, staffAccess: false },
      { title: "SEO AI Agent", href: "/admin/seo-agent", icon: Bot, staffAccess: false },
      { title: "Product Rotation", href: "/admin/product-rotation", icon: Shuffle, staffAccess: false },
      { title: "Google Pricing", href: "/admin/google-pricing", icon: Tag, staffAccess: false },
      { title: "AI Categories", href: "/admin/ai-categories", icon: Bot, staffAccess: false },
      { title: "CMS", href: "/admin/cms", icon: LayoutDashboard, staffAccess: false },
      { title: "Footer Content", href: "/admin/footer-content", icon: ScrollText, staffAccess: false },
      { title: "Company Locations", href: "/admin/company-locations", icon: MapPin, staffAccess: false },
    ],
  },
];

// Always-visible item at the bottom of the menu.
const bottomItems: NavItem[] = [
  { title: "Settings", href: "/admin/settings", icon: Settings, staffAccess: false },
];

const STORAGE_KEY = "po-admin-nav-open";

function isItemActive(location: string, href: string) {
  return location === href || location.startsWith(href + "/");
}

function loadOpenState(): Record<string, boolean> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : null;
  } catch {
    return null;
  }
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const isAdmin = user?.role === "admin";

  // Which group (if any) contains the current page — used to auto-open it.
  const activeGroupKey =
    navGroups.find((g) => g.items.some((i) => isItemActive(location, i.href)))?.key ?? null;

  // Collapsed by default, except the active group. Remembered between visits.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const saved = loadOpenState();
    if (saved) return saved;
    const init: Record<string, boolean> = {};
    if (activeGroupKey) init[activeGroupKey] = true;
    return init;
  });

  // Whenever the route changes, make sure the group holding the current page is open.
  useEffect(() => {
    if (activeGroupKey) {
      setOpenGroups((prev) => (prev[activeGroupKey] ? prev : { ...prev, [activeGroupKey]: true }));
    }
  }, [activeGroupKey]);

  // Persist the user's open/closed choices.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openGroups));
    } catch {
      /* ignore */
    }
  }, [openGroups]);

  // Keep the active menu item in view after navigating (its group is auto-opened above).
  useEffect(() => {
    const el = document.querySelector('[data-sidebar="menu-button"][data-active="true"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [location]);

  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const visible = (items: NavItem[]) => items.filter((i) => isAdmin || i.staffAccess);

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const topVisible = visible(topItems);
  const bottomVisible = visible(bottomItems);

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
            {/* Always-visible top items */}
            {topVisible.length > 0 && (
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {topVisible.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={location === item.href}>
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

            {/* Collapsible groups */}
            {navGroups.map((group) => {
              const items = visible(group.items);
              if (items.length === 0) return null;
              const isOpen = !!openGroups[group.key];
              const emerald = group.accent === "emerald";
              return (
                <SidebarGroup
                  key={group.key}
                  className={
                    emerald
                      ? "my-1 mx-2 rounded-lg border border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                      : ""
                  }
                >
                  <SidebarGroupLabel asChild>
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.key)}
                      aria-expanded={isOpen}
                      data-testid={`nav-group-${group.key}`}
                      className={`w-full cursor-pointer justify-between hover:text-foreground ${
                        emerald ? "text-emerald-700 dark:text-emerald-400 font-semibold" : ""
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <group.icon className="h-3.5 w-3.5" />
                        {group.label}
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                          isOpen ? "" : "-rotate-90"
                        }`}
                      />
                    </button>
                  </SidebarGroupLabel>
                  {isOpen && (
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {items.map((item) => (
                          <SidebarMenuItem key={item.href}>
                            <SidebarMenuButton
                              asChild
                              isActive={location === item.href}
                              className={
                                emerald
                                  ? "text-emerald-900/90 dark:text-emerald-100/90 data-[active=true]:bg-emerald-600 data-[active=true]:text-white"
                                  : ""
                              }
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
                  )}
                </SidebarGroup>
              );
            })}

            {/* Always-visible bottom items */}
            {bottomVisible.length > 0 && (
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {bottomVisible.map((item) => (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={location === item.href}>
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
          <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

interface AdminLayoutProps {
  children: React.ReactNode;
}
