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
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const mainMenuItems = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Users", href: "/admin/users", icon: Users },
  { title: "Products", href: "/admin/products", icon: Package },
  { title: "Brands", href: "/admin/brands", icon: Building2 },
  { title: "Categories", href: "/admin/categories", icon: Tag },
  { title: "Quotes", href: "/admin/quotes", icon: FileText },
  { title: "CSV Import", href: "/admin/import", icon: Upload },
  { title: "Suppliers", href: "/admin/suppliers", icon: Globe },
  { title: "Messages", href: "/admin/messages", icon: MessageSquare },
];

const homepageMenuItems = [
  { title: "Hero Slides", href: "/admin/hero-slides", icon: Image },
  { title: "Featured Brands", href: "/admin/featured-brands", icon: Star },
];

const siteMenuItems = [
  { title: "CMS", href: "/admin/cms", icon: LayoutDashboard },
  { title: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

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
                  {mainMenuItems.map((item) => (
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

            <SidebarGroup>
              <SidebarGroupLabel>Homepage</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {homepageMenuItems.map((item) => (
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

            <SidebarGroup>
              <SidebarGroupLabel>Site</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {siteMenuItems.map((item) => (
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
