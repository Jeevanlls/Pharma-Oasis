import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  Package, 
  FileText, 
  Building2, 
  MessageSquare,
  Settings,
  TrendingUp,
  Clock,
  ArrowRight,
  Shield,
  LayoutDashboard,
  Tag,
  Upload,
  Globe,
  AlertCircle,
  Home,
  ShoppingCart,
} from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalQuotes: number;
  pendingApprovals: number;
  pendingQuotes: number;
  activeCustomers: number;
}

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAdmin,
  });

  const { data: orderStats } = useQuery<{ newCount: number; toFulfil: number; doneThisWeek: number; activeTotal: number }>({
    queryKey: ["/api/admin/orders/stats"],
    enabled: isAdmin,
  });
  const ordersToHandle = (orderStats?.newCount || 0) + (orderStats?.toFulfil || 0);

  if (!isAdmin) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Card className="max-w-md text-center">
          <CardContent className="pt-6">
            <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Admin Access Required</h2>
            <p className="text-muted-foreground mb-4">
              You need admin privileges to access this area.
            </p>
            <Link href="/">
              <Button>Return Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const quickActions = [
    { label: "Sales (orders)", icon: ShoppingCart, href: "/admin/sales", badge: ordersToHandle || undefined },
    { label: "User Approvals", icon: Users, href: "/admin/users", badge: stats?.pendingApprovals },
    { label: "Quote Requests", icon: FileText, href: "/admin/sales", badge: stats?.pendingQuotes },
    { label: "Products", icon: Package, href: "/admin/products" },
    { label: "Brands", icon: Building2, href: "/admin/brands" },
    { label: "Categories", icon: Tag, href: "/admin/categories" },
    { label: "Homepage", icon: Home, href: "/admin/homepage" },
    { label: "CSV Import", icon: Upload, href: "/admin/import" },
    { label: "Supplier Leads", icon: Globe, href: "/admin/suppliers" },
    { label: "Messages", icon: MessageSquare, href: "/admin/messages" },
    { label: "CMS", icon: LayoutDashboard, href: "/admin/cms" },
    { label: "Settings", icon: Settings, href: "/admin/settings" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
          Admin Dashboard
        </h1>
        <p className="mt-2 text-muted-foreground">
          Welcome back, {user?.primaryContactName || "Admin"}
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.activeCustomers || 0} active customers
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
              <p className="text-xs text-muted-foreground">In catalogue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Quote Requests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalQuotes || 0}</div>
              <p className="text-xs text-muted-foreground">Total quotes</p>
            </CardContent>
          </Card>

          <Card className={stats?.pendingApprovals ? "border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20" : ""}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats?.pendingApprovals || 0) + (stats?.pendingQuotes || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats?.pendingApprovals || 0} approvals, {stats?.pendingQuotes || 0} quotes
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {(stats?.pendingApprovals || stats?.pendingQuotes || ordersToHandle) ? (
        <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-lg">Action Required</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {ordersToHandle ? (
                <Link href="/admin/sales">
                  <Button variant="outline" className="gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    {ordersToHandle} Order{ordersToHandle > 1 ? "s" : ""} to handle
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : null}
              {stats?.pendingApprovals ? (
                <Link href="/admin/users">
                  <Button variant="outline" className="gap-2">
                    <Users className="h-4 w-4" />
                    {stats.pendingApprovals} User{stats.pendingApprovals > 1 ? "s" : ""} Pending Approval
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : null}
              {stats?.pendingQuotes ? (
                <Link href="/admin/sales">
                  <Button variant="outline" className="gap-2">
                    <FileText className="h-4 w-4" />
                    {stats.pendingQuotes} Quote{stats.pendingQuotes > 1 ? "s" : ""} Pending Review
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div>
        <h2 className="text-xl font-semibold mb-4" style={{ fontFamily: "DM Sans, sans-serif" }}>
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="cursor-pointer hover-elevate h-full">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{action.label}</p>
                  </div>
                  {action.badge ? (
                    <Badge variant="secondary">{action.badge}</Badge>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
