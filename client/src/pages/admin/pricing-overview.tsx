import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PoundSterling, Building2, Tag, FileUp, Coins, Users, BookOpen,
  Layers, CheckCircle2, AlertTriangle, ArrowRight, UserCheck,
} from "lucide-react";

// Mirrors the shapes used by assignments.tsx — all existing, read-only endpoints.
interface Assignment { brandId: number | null; priceListId: number; customerId: number; }
interface PriceListSummary {
  id: number; name: string; brandId: number | null; brandName: string | null;
  status: string; itemCount: number; customerCount: number;
}
interface PricingBrand { id: number; name: string; }
interface PricingCategory { id: number; name: string; }
interface AppUser { id: number; role: string; status: string; }

export default function PricingOverviewPage() {
  const { data: brands = [] } = useQuery<PricingBrand[]>({ queryKey: ["/api/admin/pricing-brands"] });
  const { data: categories = [] } = useQuery<PricingCategory[]>({ queryKey: ["/api/admin/pricing-categories"] });
  const { data: lists = [] } = useQuery<PriceListSummary[]>({ queryKey: ["/api/admin/v2/price-lists"] });
  const { data: assignments = [] } = useQuery<Assignment[]>({ queryKey: ["/api/admin/v2/assignments"] });
  const { data: users = [] } = useQuery<AppUser[]>({ queryKey: ["/api/admin/users"] });

  const stats = useMemo(() => {
    const customers = users.filter((u) => u.role === "customer" && u.status === "active");
    const publishedLists = lists.filter((l) => l.status === "published");

    // A customer is "covered" if they're assigned to at least one published list.
    const coveredIds = new Set(assignments.map((a) => a.customerId));
    const covered = customers.filter((c) => coveredIds.has(c.id)).length;

    // Things needing attention
    const unassignedPublished = publishedLists.filter((l) => l.customerCount === 0);
    const brandsWithPublished = new Set(publishedLists.map((l) => l.brandId));
    const brandsNoList = brands.filter((b) => !brandsWithPublished.has(b.id));
    const draftLists = lists.filter((l) => l.status === "draft");

    return {
      customers, publishedLists, covered,
      unassignedPublished, brandsNoList, draftLists,
    };
  }, [brands, lists, assignments, users]);

  const kpis = [
    { label: "Brands", value: brands.length, icon: Building2, href: "/admin/pricing-brands" },
    { label: "Categories", value: categories.length, icon: Tag, href: "/admin/pricing-categories" },
    { label: "Published price lists", value: stats.publishedLists.length, sub: `${lists.length} total`, icon: Coins, href: "/admin/price-builder" },
    { label: "Customers covered", value: `${stats.covered}/${stats.customers.length}`, sub: "see a price list", icon: UserCheck, href: "/admin/assignments" },
  ];

  const tools = [
    { n: "1", title: "Brands", desc: "Define the brands you price", href: "/admin/pricing-brands", icon: Building2 },
    { n: "2", title: "Categories", desc: "Group brands by category", href: "/admin/pricing-categories", icon: Tag },
    { n: "3", title: "Cost Uploads", desc: "Import supplier cost files", href: "/admin/cost-uploads", icon: FileUp },
    { n: "4", title: "Current Costs", desc: "Quick-edit live costs", href: "/admin/current-costs", icon: PoundSterling },
    { n: "5", title: "Price Lists", desc: "Build & assign customer prices", href: "/admin/price-builder", icon: Coins },
    { n: "6", title: "Who Sees What", desc: "Check customer coverage", href: "/admin/assignments", icon: Users },
  ];

  const attentionCount =
    stats.unassignedPublished.length + stats.brandsNoList.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Layers className="h-6 w-6 text-emerald-600" /> Customer Pricing
          </h1>
          <p className="text-muted-foreground">Your pricing setup at a glance — brands, price lists and who can see them.</p>
        </div>
        <Link href="/admin/pricing-guide">
          <Button variant="outline" size="sm" className="gap-1">
            <BookOpen className="h-4 w-4" /> How this works
          </Button>
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href}>
            <Card className="hover:border-emerald-300 hover:shadow-sm transition-colors cursor-pointer h-full">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{k.value}</div>
                  <k.icon className="h-5 w-5 text-emerald-600/70" />
                </div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mt-1">{k.label}</div>
                {k.sub && <div className="text-xs text-muted-foreground/80 mt-0.5">{k.sub}</div>}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Needs attention */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {attentionCount === 0
              ? <><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Everything looks good</>
              : <><AlertTriangle className="h-4 w-4 text-amber-600" /> Needs attention ({attentionCount})</>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {attentionCount === 0 ? (
            <p className="text-sm text-muted-foreground">
              Every published price list has customers, and every brand has a published list. Nothing to chase.
            </p>
          ) : (
            <>
              {stats.unassignedPublished.map((l) => (
                <Link key={`u-${l.id}`} href="/admin/price-builder">
                  <div className="flex items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 p-2.5 text-sm hover:bg-amber-100/70 dark:hover:bg-amber-950/40 cursor-pointer">
                    <span className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span className="truncate"><b>{l.name}</b>{l.brandName ? ` (${l.brandName})` : ""} is published but has <b>0 customers</b> assigned.</span>
                    </span>
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1 shrink-0">Assign <ArrowRight className="h-3 w-3" /></span>
                  </div>
                </Link>
              ))}
              {stats.brandsNoList.map((b) => (
                <Link key={`b-${b.id}`} href="/admin/price-builder">
                  <div className="flex items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 p-2.5 text-sm hover:bg-amber-100/70 dark:hover:bg-amber-950/40 cursor-pointer">
                    <span className="flex items-center gap-2 min-w-0">
                      <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      <span className="truncate"><b>{b.name}</b> has no published price list — no customer can see its prices.</span>
                    </span>
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1 shrink-0">Build one <ArrowRight className="h-3 w-3" /></span>
                  </div>
                </Link>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {/* Tool shortcuts */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">The 6-step workflow</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tools.map((t) => (
            <Link key={t.href} href={t.href}>
              <Card className="hover:border-emerald-300 hover:shadow-sm transition-colors cursor-pointer h-full">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-semibold shrink-0">{t.n}</div>
                  <div className="min-w-0">
                    <div className="font-medium flex items-center gap-1.5"><t.icon className="h-4 w-4 text-emerald-600/80" /> {t.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.desc}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Brand coverage snapshot */}
      {brands.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" /> Brands</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-2">
              <div className="min-w-[420px] px-2 divide-y">
                {brands.map((b) => {
                  const bl = lists.filter((l) => l.brandId === b.id);
                  const pub = bl.filter((l) => l.status === "published");
                  const cust = bl.reduce((s, l) => s + (l.customerCount || 0), 0);
                  return (
                    <div key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="font-medium truncate">{b.name}</span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">{bl.length} list(s)</span>
                        {pub.length === 0
                          ? <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300">no published list</Badge>
                          : cust === 0
                            ? <Badge variant="outline" className="border-amber-400 text-amber-700 dark:text-amber-300">0 customers</Badge>
                            : <Badge className="bg-emerald-600">{cust} customer(s)</Badge>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
