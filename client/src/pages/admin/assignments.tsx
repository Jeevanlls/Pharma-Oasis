import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Search, Coins, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";

interface Assignment {
  brandId: number | null;
  brandName: string | null;
  priceListId: number;
  listName: string | null;
  listStatus: string | null;
  customerId: number;
  customerEmail: string;
  customerCompany: string | null;
}
interface PriceListSummary {
  id: number; name: string; brandId: number | null; brandName: string | null;
  status: string; itemCount: number; customerCount: number;
}
interface PricingBrand { id: number; name: string; }
interface AppUser {
  id: number; email: string; role: string; status: string;
  companyName: string | null; primaryContactName: string | null;
}

const custName = (c: AppUser) => c.companyName?.trim() || c.primaryContactName?.trim() || c.email;
const assignName = (a: Assignment) => a.customerCompany?.trim() || a.customerEmail;

export default function AssignmentsPage() {
  const [search, setSearch] = useState("");
  const { data: assignments = [] } = useQuery<Assignment[]>({ queryKey: ["/api/admin/v2/assignments"] });
  const { data: lists = [] } = useQuery<PriceListSummary[]>({ queryKey: ["/api/admin/v2/price-lists"] });
  const { data: brands = [] } = useQuery<PricingBrand[]>({ queryKey: ["/api/admin/pricing-brands"] });
  const { data: users = [] } = useQuery<AppUser[]>({ queryKey: ["/api/admin/users"] });

  // The customers who SHOULD be able to see prices = approved (active) customers.
  const customers = useMemo(
    () => users.filter((u) => u.role === "customer" && u.status === "active").sort((a, b) => custName(a).localeCompare(custName(b))),
    [users],
  );

  // Per-brand view: lists + their customers, plus which approved customers can't see this brand.
  const brandViews = useMemo(() => {
    return brands.map((brand) => {
      const brandLists = lists.filter((l) => l.brandId === brand.id);
      const brandAssign = assignments.filter((a) => a.brandId === brand.id);
      const coveredIds = new Set(brandAssign.map((a) => a.customerId));
      const covered = customers.filter((c) => coveredIds.has(c.id));
      const uncovered = customers.filter((c) => !coveredIds.has(c.id));

      // Lists with their assigned customers (seed from real lists; add assignment-only lists too).
      const listMap = new Map<number, { name: string; status: string; customers: Assignment[] }>();
      for (const l of brandLists) listMap.set(l.id, { name: l.name, status: l.status, customers: [] });
      for (const a of brandAssign) {
        if (!listMap.has(a.priceListId)) listMap.set(a.priceListId, { name: a.listName ?? `List #${a.priceListId}`, status: a.listStatus ?? "draft", customers: [] });
        listMap.get(a.priceListId)!.customers.push(a);
      }
      const hasPublishedList = brandLists.some((l) => l.status === "published");
      return {
        brand,
        lists: Array.from(listMap.values()).sort((x, y) => x.name.localeCompare(y.name)),
        covered, uncovered, hasPublishedList,
      };
    });
  }, [brands, lists, assignments, customers]);

  const q = search.trim().toLowerCase();
  const brandMatches = (v: typeof brandViews[number]) =>
    !q ||
    v.brand.name.toLowerCase().includes(q) ||
    v.lists.some((l) => l.name.toLowerCase().includes(q) || l.customers.some((c) => assignName(c).toLowerCase().includes(q) || c.customerEmail.toLowerCase().includes(q))) ||
    v.uncovered.some((c) => custName(c).toLowerCase().includes(q) || c.email.toLowerCase().includes(q));

  const brandsWithGaps = brandViews.filter((v) => v.uncovered.length > 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" /> Customer Assignments
        </h1>
        <p className="text-muted-foreground">
          <b>Step 6.</b> Which customers can see which prices, for each brand. A customer sees a brand's prices only if
          they're on a price list for it — so below, each brand shows who's covered and <b>who isn't</b>.
        </p>
      </div>

      {/* Top summary */}
      {brands.length > 0 && customers.length > 0 && (
        brandsWithGaps === 0 ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/20 p-3 text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Every one of your <b>{customers.length}</b> approved customer(s) can see all <b>{brands.length}</b> brand(s). Nothing missing.</span>
          </div>
        ) : (
          <div className="rounded-md border border-amber-300 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 p-3 text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span><b>{brandsWithGaps}</b> of <b>{brands.length}</b> brand(s) have customers who can't see prices yet. Check each brand below — expand "customers who can't see this" to find them.</span>
          </div>
        )
      )}

      <div className="relative max-w-md">
        <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
        <Input className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer, price list, or brand…" data-testid="input-assignments-search" />
      </div>

      {brands.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          No brands yet. Add one under <b>Brands</b>, then build a price list.
        </CardContent></Card>
      )}

      {brandViews.filter(brandMatches).map((v) => {
        const M = customers.length;
        const coveredN = v.covered.length;
        const allCovered = M > 0 && v.uncovered.length === 0;
        return (
          <Card key={v.brand.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <CardTitle className="text-base flex items-center gap-2">
                  <Coins className="h-4 w-4 text-muted-foreground" /> {v.brand.name}
                </CardTitle>
                <Badge variant={allCovered ? "default" : "outline"} className={allCovered ? "bg-emerald-600" : "border-amber-400 text-amber-800 dark:text-amber-300"}>
                  {coveredN} of {M} customers covered
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Coverage status */}
              {M === 0 ? (
                <p className="text-sm text-muted-foreground">No approved customers yet.</p>
              ) : !v.hasPublishedList ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 p-2.5 text-sm">
                  <div className="flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0" /> No published price list for this brand — none of your {M} customer(s) can see its prices.
                  </div>
                  <Link href="/admin/price-builder">
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer inline-flex items-center gap-1 mt-1">
                      Create &amp; publish one in Price List Builder <ArrowRight className="h-3 w-3" />
                    </span>
                  </Link>
                </div>
              ) : allCovered ? (
                <p className="text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" /> All {M} approved customer(s) can see this brand's prices.
                </p>
              ) : (
                <details className="rounded-md border border-amber-300 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 p-2.5 text-sm" data-testid={`gap-${v.brand.id}`}>
                  <summary className="cursor-pointer font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" /> {v.uncovered.length} customer(s) can't see this brand's prices — click to view
                  </summary>
                  <p className="text-xs text-muted-foreground mt-2">These approved customers have no price list for {v.brand.name}, so they see nothing for it. Assign them a list in the Price List Builder.</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {v.uncovered.map((c) => (
                      <Badge key={c.id} variant="outline" className="font-normal border-amber-400" title={c.email}>{custName(c)}</Badge>
                    ))}
                  </div>
                </details>
              )}

              {/* Lists and who's on them */}
              {v.lists.length > 0 && (
                <div className="space-y-2">
                  {v.lists.map((l) => (
                    <div key={l.name} className="rounded-md border p-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{l.name}</span>
                        <Badge variant={l.status === "published" ? "default" : "secondary"}>{l.status}</Badge>
                        <span className="text-xs text-muted-foreground">{l.customers.length} customer(s)</span>
                      </div>
                      {l.customers.length === 0 ? (
                        <p className="text-xs text-muted-foreground mt-2">
                          {l.status === "published" ? "Published, but nobody is assigned yet." : "Draft — publish it before you can assign customers."}
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {l.customers.slice().sort((a, b) => assignName(a).localeCompare(assignName(b))).map((c) => (
                            <Badge key={c.customerId} variant="outline" className="font-normal" title={c.customerEmail}>{assignName(c)}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <div>
        <Link href="/admin/price-builder">
          <Button variant="outline" size="sm">
            Manage assignments in Price List Builder <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
