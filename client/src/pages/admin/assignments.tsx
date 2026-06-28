import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Users, Search, Coins, ArrowRight, CheckCircle2, AlertTriangle, Plus, Loader2, X } from "lucide-react";

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
      const listMap = new Map<number, { id: number; name: string; status: string; customers: Assignment[] }>();
      for (const l of brandLists) listMap.set(l.id, { id: l.id, name: l.name, status: l.status, customers: [] });
      for (const a of brandAssign) {
        if (!listMap.has(a.priceListId)) listMap.set(a.priceListId, { id: a.priceListId, name: a.listName ?? `List #${a.priceListId}`, status: a.listStatus ?? "draft", customers: [] });
        listMap.get(a.priceListId)!.customers.push(a);
      }
      const hasPublishedList = brandLists.some((l) => l.status === "published");
      const publishedLists = brandLists
        .filter((l) => l.status === "published")
        .map((l) => ({ id: l.id, name: l.name }))
        .sort((x, y) => x.name.localeCompare(y.name));
      return {
        brand,
        lists: Array.from(listMap.values()).sort((x, y) => x.name.localeCompare(y.name)),
        covered, uncovered, hasPublishedList, publishedLists,
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
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          <Users className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Assignments</h1>
          <p className="text-muted-foreground">
            <b>Step 6.</b> Which customers can see which prices, for each brand. A customer sees a brand's prices only if
            they're on a price list for it — so below, each brand shows who's covered and <b>who isn't</b>.
          </p>
        </div>
      </div>

      {/* Top summary */}
      {brands.length > 0 && customers.length > 0 && (
        brandsWithGaps === 0 ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/50 dark:bg-emerald-950/20 p-4 text-sm flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>Every one of your <b>{customers.length}</b> approved customer(s) can see all <b>{brands.length}</b> brand(s). Nothing missing.</span>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 p-4 text-sm flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
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
        <Card><CardContent className="p-6">
          <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
            No brands yet. Add one under <b>Brands</b>, then build a price list.
          </div>
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
                <CardTitle className="text-lg flex items-center gap-2">
                  <Coins className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> {v.brand.name}
                </CardTitle>
                <Badge variant={allCovered ? "default" : "outline"} className={allCovered ? "bg-emerald-600" : "border-amber-400 text-amber-800 dark:text-amber-300"}>
                  {coveredN} of {M} customers covered
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Coverage status */}
              {M === 0 ? (
                <p className="text-sm text-muted-foreground">No approved customers yet.</p>
              ) : !v.hasPublishedList ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 p-3.5 text-sm">
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
                <details className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 p-3.5 text-sm" data-testid={`gap-${v.brand.id}`}>
                  <summary className="cursor-pointer font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" /> {v.uncovered.length} customer(s) can't see this brand's prices — click to view
                  </summary>
                  <p className="text-xs text-muted-foreground mt-2">These approved customers have no price list for {v.brand.name}. Pick a published list and assign them right here.</p>
                  <GapAssign brandName={v.brand.name} uncovered={v.uncovered} publishedLists={v.publishedLists} />
                </details>
              )}

              {/* Lists and who's on them */}
              {v.lists.length > 0 && (
                <div className="space-y-2">
                  {v.lists.map((l) => (
                    <ListRow key={l.id} list={l} brandName={v.brand.name} allCustomers={customers} />
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

// Shared POST to the assign endpoint. Returns the parsed body; on a 409
// (customer already has a different list for the brand) returns { conflict }.
async function assignRequest(listId: number, customerIds: number[], replace: boolean) {
  const res = await fetch(`/api/admin/v2/price-lists/${listId}/assign`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    credentials: "include", body: JSON.stringify({ customerIds, replace }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 409) return { conflict: true as const, ...body };
  if (!res.ok) throw new Error(body.message || "Failed to assign");
  return body;
}

// Inline assignment for a brand's uncovered customers — assigns them to one of
// the brand's PUBLISHED lists without leaving this page. Uses the same
// /assign endpoint the Price List Builder uses (one list per brand enforced).
function GapAssign({ brandName, uncovered, publishedLists }: {
  brandName: string;
  uncovered: AppUser[];
  publishedLists: { id: number; name: string }[];
}) {
  const { toast } = useToast();
  const [targetId, setTargetId] = useState<number>(publishedLists[0]?.id ?? 0);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/v2/assignments"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/v2/price-lists"] });
  };

  const assign = useMutation({
    mutationFn: async ({ listId, customerIds }: { listId: number; customerIds: number[] }) =>
      ({ listId, customerIds, ...(await assignRequest(listId, customerIds, false)) }),
    onSuccess: async (res: any) => {
      if (res?.conflict) {
        const n = res.conflicts?.length ?? "Some";
        if (confirm(`${n} customer(s) already have a different ${brandName} list. Replace it with this one?`)) {
          await assignRequest(res.listId, res.customerIds, true);
          invalidate();
          toast({ title: "Assigned (replaced existing list)" });
        }
        return;
      }
      invalidate();
      toast({ title: `Assigned ${res.assigned ?? res.customerIds.length} customer(s) to ${brandName}` });
    },
    onError: (e: any) => toast({ title: "Could not assign", description: e.message, variant: "destructive" }),
  });

  if (publishedLists.length === 0) return null;
  const target = publishedLists.find((l) => l.id === targetId) ?? publishedLists[0];

  return (
    <div className="mt-3 space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {publishedLists.length > 1 && (
          <Select value={String(target.id)} onValueChange={(v) => setTargetId(Number(v))}>
            <SelectTrigger className="h-8 w-52 text-xs" data-testid={`gap-target-${brandName}`}>
              <SelectValue placeholder="Choose a list" />
            </SelectTrigger>
            <SelectContent>
              {publishedLists.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={assign.isPending}
          onClick={() => assign.mutate({ listId: target.id, customerIds: uncovered.map((c) => c.id) })}
          data-testid={`gap-assign-all-${brandName}`}>
          {assign.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
          Assign all {uncovered.length} to “{target.name}”
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {uncovered.map((c) => (
          <span key={c.id} className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-background pl-2.5 pr-1 py-0.5" title={c.email}>
            <span className="text-xs">{custName(c)}</span>
            <Button size="sm" variant="ghost"
              className="h-6 px-1.5 text-xs text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              disabled={assign.isPending}
              onClick={() => assign.mutate({ listId: target.id, customerIds: [c.id] })}
              data-testid={`gap-assign-${c.id}`}>
              <Plus className="h-3 w-3 mr-0.5" /> Assign
            </Button>
          </span>
        ))}
      </div>
    </div>
  );
}

// One price list inside a brand card: shows its assigned customers (each with a
// Remove action) and, for published lists, an "add a customer" picker. Remove
// uses /unassign; add uses the shared /assign (one list per brand enforced).
function ListRow({ list, brandName, allCustomers }: {
  list: { id: number; name: string; status: string; customers: Assignment[] };
  brandName: string;
  allCustomers: AppUser[];
}) {
  const { toast } = useToast();
  const [addId, setAddId] = useState<string>("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/v2/assignments"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/v2/price-lists"] });
  };

  const assignedIds = new Set(list.customers.map((c) => c.customerId));
  const addable = allCustomers.filter((c) => !assignedIds.has(c.id));

  const assign = useMutation({
    mutationFn: async (customerId: number) => ({ customerId, ...(await assignRequest(list.id, [customerId], false)) }),
    onSuccess: async (res: any) => {
      if (res?.conflict) {
        if (confirm(`That customer already has a different ${brandName} list. Replace it with “${list.name}”?`)) {
          await assignRequest(list.id, [res.customerId], true);
          invalidate();
          toast({ title: "Assigned (replaced existing list)" });
        }
        return;
      }
      setAddId(""); invalidate();
      toast({ title: `Assigned to “${list.name}”` });
    },
    onError: (e: any) => toast({ title: "Could not assign", description: e.message, variant: "destructive" }),
  });

  const unassign = useMutation({
    mutationFn: async (customerId: number) => {
      const res = await fetch(`/api/admin/v2/price-lists/${list.id}/unassign`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ customerId }),
      });
      if (!res.ok) throw new Error("Failed to remove");
    },
    onSuccess: () => { invalidate(); toast({ title: "Removed from list" }); },
    onError: (e: any) => toast({ title: "Could not remove", description: e.message, variant: "destructive" }),
  });

  const busy = assign.isPending || unassign.isPending;

  return (
    <div className="rounded-lg border p-3.5 hover:bg-muted/40 transition-colors">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold">{list.name}</span>
        <Badge variant={list.status === "published" ? "default" : "secondary"}>{list.status}</Badge>
        <span className="text-xs text-muted-foreground">{list.customers.length} customer(s)</span>
      </div>

      {list.customers.length === 0 ? (
        <p className="text-xs text-muted-foreground mt-2">
          {list.status === "published" ? "Published, but nobody is assigned yet." : "Draft — publish it before you can assign customers."}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {list.customers.slice().sort((a, b) => assignName(a).localeCompare(assignName(b))).map((c) => (
            <span key={c.customerId} className="inline-flex items-center gap-1 rounded-md border bg-background pl-2.5 pr-1 py-0.5" title={c.customerEmail}>
              <span className="text-xs">{assignName(c)}</span>
              <Button size="sm" variant="ghost"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                disabled={busy} title="Remove from this list"
                onClick={() => unassign.mutate(c.customerId)}
                data-testid={`unassign-${list.id}-${c.customerId}`}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </span>
          ))}
        </div>
      )}

      {list.status === "published" && addable.length > 0 && (
        <div className="flex items-center gap-2 mt-2.5">
          <Select value={addId} onValueChange={setAddId}>
            <SelectTrigger className="h-8 w-56 text-xs" data-testid={`add-select-${list.id}`}>
              <SelectValue placeholder="Add a customer…" />
            </SelectTrigger>
            <SelectContent>
              {addable.map((c) => <SelectItem key={c.id} value={String(c.id)}>{custName(c)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={!addId || busy}
            onClick={() => assign.mutate(Number(addId))}
            data-testid={`add-assign-${list.id}`}>
            {assign.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
            Assign
          </Button>
        </div>
      )}
    </div>
  );
}
