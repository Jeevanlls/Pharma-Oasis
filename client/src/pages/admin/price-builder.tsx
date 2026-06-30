import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Minus, Coins, Users, RefreshCw, Trash2, Save, CheckCircle2, Search, Eye, AlertTriangle, SlidersHorizontal, PanelLeftClose, PanelLeftOpen, Archive, MoreHorizontal } from "lucide-react";

interface PricingBrand { id: number; name: string; }
interface PriceListSummary {
  id: number; name: string; brandId: number | null; brandName: string | null;
  scope?: string; categoryId?: number | null; categoryName?: string | null;
  defaultMarginPercent: string | null; status: string; itemCount: number; customerCount: number;
  publishedAt: string | null; updatedAt: string | null;
}
interface PriceListItem {
  id: number; ean: string | null; description: string | null; caseSize: string | null;
  costPrice: string | null; method: "margin" | "fixed" | "cost_plus";
  marginPercent: string | null; fixedPrice: string | null; plusAmount: string | null;
  preparedPrice: string | null; supplierQty: number | null;
}
interface Customer { id: number; email: string; companyName: string | null; role: string; status: string; }
interface AssignedCustomer { id: number; email: string; companyName: string | null; }
interface AssignImpactChange { ean: string; description: string | null; oldPrice: number | null; newPrice: number | null; oldSource: string; newSource: string; }
interface AssignImpact {
  listName: string; scope: string; totalChanges: number;
  customers: { customerId: number; name: string; changeCount: number; changes: AssignImpactChange[] }[];
}

const money = (n: string | number | null) => (n == null || n === "" ? "—" : `£${Number(n).toFixed(2)}`);
const num = (v: string | null | undefined) => (v == null || v === "" ? null : Number(v));

// Mirror of server computePrepared — instant local preview while editing.
function preview(method: string, cost: number | null, margin: number | null, fixed: number | null, plus: number | null): number | null {
  if (method === "fixed") return fixed;
  if (method === "cost_plus") return cost != null && plus != null ? Math.round((cost + plus) * 100) / 100 : null;
  return cost != null && margin != null ? Math.round(cost * (1 + margin / 100) * 100) / 100 : null;
}
const availLabel = (qty: number | null) => (qty == null ? "On request" : qty <= 0 ? "Out of stock" : qty < 20 ? `Low (${qty})` : "In stock");

// "Published 3 days ago" style relative date for price-list cards.
function publishedAgo(iso: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const days = Math.floor((Date.now() - then) / 86400000);
  if (days <= 0) return "Published today";
  if (days === 1) return "Published yesterday";
  if (days < 30) return `Published ${days} days ago`;
  if (days < 60) return "Published last month";
  return `Published ${Math.floor(days / 30)} months ago`;
}

export default function PriceBuilderPage() {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [listsOpen, setListsOpen] = useState(true); // collapse the Saved-lists panel for more sheet width
  const [assignOpen, setAssignOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Saved-lists panel filters
  const [panelBrand, setPanelBrand] = useState("all"); // "all" or a brandId
  const [showArchived, setShowArchived] = useState(false);

  const [newBrandId, setNewBrandId] = useState("");
  const [newScope, setNewScope] = useState<"brand" | "category">("brand");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newName, setNewName] = useState("");
  const [newMargin, setNewMargin] = useState("20");
  const [newRounding, setNewRounding] = useState<"none" | "charm_49_99" | "charm_x9">("none");

  // local unsaved edits keyed by itemId
  const [edits, setEdits] = useState<Record<number, Partial<PriceListItem>>>({});
  const [bulkMargin, setBulkMargin] = useState("");
  const [search, setSearch] = useState("");

  // lines the user hand-edited this session — bulk pricing leaves these alone
  const [manualIds, setManualIds] = useState<Set<number>>(new Set());

  // Bulk pricing dialog (tiered cost bands / cost + £)
  const [bulkOpen, setBulkOpen] = useState(false);
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [bulkStrategy, setBulkStrategy] = useState<"tiered" | "cost_plus">("tiered");
  const [bulkPlus, setBulkPlus] = useState("");
  const [bands, setBands] = useState<{ upTo: string; margin: string }[]>([
    { upTo: "5", margin: "25" },
    { upTo: "10", margin: "20" },
    { upTo: "20", margin: "12" },
    { upTo: "", margin: "10" }, // empty "up to" = and above
  ]);

  const { data: brands = [] } = useQuery<PricingBrand[]>({ queryKey: ["/api/admin/pricing-brands"] });
  const { data: categories = [] } = useQuery<{ id: number; name: string }[]>({ queryKey: ["/api/admin/pricing-categories"] });
  // Two-element key so prefix-invalidation of ["/api/admin/v2/price-lists"] still refreshes it.
  const { data: lists = [] } = useQuery<PriceListSummary[]>({
    queryKey: ["/api/admin/v2/price-lists", showArchived ? "only" : "active"],
    queryFn: async () =>
      (await fetch(`/api/admin/v2/price-lists${showArchived ? "?archived=only" : ""}`, { credentials: "include" })).json(),
  });
  const { data: detail } = useQuery<{ list: PriceListSummary; brandName: string | null; items: PriceListItem[] }>({
    queryKey: [`/api/admin/v2/price-lists/${selectedId}`],
    enabled: selectedId != null,
  });

  const items = detail?.items ?? [];
  const merged = (it: PriceListItem): PriceListItem => ({ ...it, ...edits[it.id] });
  const livePrice = (it: PriceListItem) =>
    preview(it.method, num(it.costPrice), num(it.marginPercent), num(it.fixedPrice), num(it.plusAmount));

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return items;
    return items.filter((it) =>
      (it.description ?? "").toLowerCase().includes(s) || (it.ean ?? "").toLowerCase().includes(s));
  }, [items, search]);

  const dirtyCount = Object.keys(edits).length;
  const overrides = useMemo(
    () => items.filter((it) => merged(it).method !== "margin").length,
    [items, edits],
  );
  const priceRange = useMemo(() => {
    const ps = items.map((it) => livePrice(merged(it))).filter((p): p is number => p != null);
    if (!ps.length) return null;
    return { min: Math.min(...ps), max: Math.max(...ps) };
  }, [items, edits]);
  const belowCostCount = useMemo(
    () => items.filter((it) => {
      const m = merged(it); const c = num(m.costPrice); const p = livePrice(m);
      return p != null && c != null && p < c;
    }).length,
    [items, edits],
  );

  const editItem = (id: number, patch: Partial<PriceListItem>) => {
    setManualIds((prev) => { const n = new Set(prev); n.add(id); return n; });
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  // Pick the margin % for a given COST from the tiered bands (cost-based, per the user's choice).
  const bandMarginFor = (cost: number | null): number | null => {
    if (cost == null) return null;
    const finite = bands
      .filter((b) => b.upTo !== "" && b.margin !== "")
      .map((b) => ({ upTo: Number(b.upTo), margin: Number(b.margin) }))
      .sort((a, b) => a.upTo - b.upTo);
    for (const b of finite) if (cost <= b.upTo) return b.margin;
    const open = bands.find((b) => b.upTo === "" && b.margin !== "");
    if (open) return Number(open.margin);
    return finite.length ? finite[finite.length - 1].margin : null;
  };

  // How many lines a bulk action will touch (skips manual edits + saved fixed prices).
  const bulkEligible = useMemo(
    () => items.filter((raw) => !manualIds.has(raw.id) && raw.method !== "fixed").length,
    [items, manualIds],
  );

  // Stage bulk pricing into `edits` so prices update live; user reviews then Saves.
  const applyBulk = () => {
    if (bulkStrategy === "cost_plus" && bulkPlus === "") return;
    setEdits((prev) => {
      const next = { ...prev };
      for (const raw of items) {
        if (manualIds.has(raw.id) || raw.method === "fixed") continue; // keep manual overrides
        const cost = num(raw.costPrice);
        if (bulkStrategy === "cost_plus") {
          next[raw.id] = { ...next[raw.id], method: "cost_plus", plusAmount: bulkPlus };
        } else {
          const mg = bandMarginFor(cost);
          if (mg == null) continue;
          next[raw.id] = { ...next[raw.id], method: "margin", marginPercent: String(mg) };
        }
      }
      return next;
    });
    setBulkOpen(false);
    toast({
      title: "Applied to list",
      description:
        bulkStrategy === "cost_plus"
          ? `Cost + £${bulkPlus} applied to ${bulkEligible} line(s) — review, then Save.`
          : `Tiered margins applied to ${bulkEligible} line(s) — review, then Save.`,
    });
  };

  // Apply a margin to ALL margin-method rows locally so every price updates live (save persists).
  const previewMarginAll = (value?: string) => {
    const v = value ?? bulkMargin;
    if (v === "") return;
    setBulkMargin(v);
    setEdits((prev) => {
      const next = { ...prev };
      for (const it of items) {
        const m = next[it.id] ?? {};
        const method = (m.method ?? it.method);
        if (method === "margin") next[it.id] = { ...m, method: "margin", marginPercent: v };
      }
      return next;
    });
    toast({ title: "Preview updated", description: `All margin lines set to ${v}% — review, then Save to publish-ready.` });
  };
  const stepMargin = (delta: number) => {
    const base = Number(bulkMargin === "" ? 20 : bulkMargin);
    const v = String(Math.max(0, Math.round((base + delta) * 10) / 10));
    setBulkMargin(v);
  };

  const create = useMutation({
    mutationFn: async () =>
      (await apiRequest(
        "POST",
        newScope === "category" ? "/api/admin/v2/category-price-lists" : "/api/admin/v2/price-lists",
        newScope === "category"
          ? { categoryId: Number(newCategoryId), name: newName, defaultMarginPercent: Number(newMargin) || 0, roundingMode: newRounding }
          : { brandId: Number(newBrandId), name: newName, defaultMarginPercent: Number(newMargin) || 0, roundingMode: newRounding },
      )).json(),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/v2/price-lists"] });
      setCreateOpen(false); setNewName(""); setNewBrandId(""); setNewCategoryId(""); setNewScope("brand"); setNewMargin("20");
      if (res?.list?.id) { setSelectedId(res.list.id); setEdits({}); }
      toast({ title: "Price list created", description: res?.warning || `${res?.itemCount ?? 0} products auto-filled.` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveItems = useMutation({
    mutationFn: async () => {
      const patches = Object.entries(edits).map(([id, e]) => ({
        id: Number(id), method: e.method,
        marginPercent: e.marginPercent !== undefined ? num(e.marginPercent as string) : undefined,
        fixedPrice: e.fixedPrice !== undefined ? num(e.fixedPrice as string) : undefined,
        plusAmount: e.plusAmount !== undefined ? num(e.plusAmount as string) : undefined,
      }));
      return apiRequest("PUT", `/api/admin/v2/price-lists/${selectedId}/items`, { items: patches });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/v2/price-lists/${selectedId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/v2/price-lists"] });
      setEdits({}); setBulkMargin(""); setManualIds(new Set());
      toast({ title: "Prices saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const setStatus = useMutation({
    mutationFn: async (status: string) => apiRequest("PUT", `/api/admin/v2/price-lists/${selectedId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/v2/price-lists/${selectedId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/v2/price-lists"] });
      toast({ title: "Status updated" });
    },
  });

  const archive = useMutation({
    mutationFn: async (id: number) => apiRequest("POST", `/api/admin/v2/price-lists/${id}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/v2/price-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/v2/assignments"] });
      setSelectedId(null);
      toast({ title: "Price list archived", description: "Customers were unassigned. Find it under Archived to restore." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const restore = useMutation({
    mutationFn: async (id: number) => apiRequest("POST", `/api/admin/v2/price-lists/${id}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/v2/price-lists"] });
      toast({ title: "Price list restored", description: "It's back as a draft — re-publish and assign customers when ready." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/admin/v2/price-lists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/v2/price-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/v2/assignments"] });
      setSelectedId(null);
      toast({ title: "Price list deleted permanently" });
    },
  });

  const selected = lists.find((l) => l.id === selectedId);
  const panelLists =
    panelBrand === "all" ? lists
    : panelBrand === "category" ? lists.filter((l) => l.scope === "category")
    : lists.filter((l) => String(l.brandId) === panelBrand);

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Price List Builder</h1>
              <p className="text-muted-foreground">
                <b>Step 5.</b> Set your selling prices for one brand. Pick a list on the left, set a margin, tweak any lines, then <b>Save</b> and choose who gets it.
              </p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)} data-testid="button-new-list" className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-4 w-4 mr-2" /> New Price List
          </Button>
        </div>

        <div className={`grid grid-cols-1 gap-4 ${listsOpen ? "lg:grid-cols-[220px_minmax(0,1fr)]" : "lg:grid-cols-1"}`}>
          {/* Lists */}
          {listsOpen && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Saved lists</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {/* Filters: brand + active/archived */}
              <Select value={panelBrand} onValueChange={setPanelBrand}>
                <SelectTrigger className="h-8 text-xs" data-testid="select-panel-brand"><SelectValue placeholder="All brands" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All lists</SelectItem>
                  <SelectItem value="category">Category lists</SelectItem>
                  {brands.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex gap-1">
                <Button size="sm" variant={!showArchived ? "default" : "outline"} className="flex-1 h-7 text-xs"
                  onClick={() => { setShowArchived(false); setSelectedId(null); }} data-testid="button-show-active">Active</Button>
                <Button size="sm" variant={showArchived ? "default" : "outline"} className="flex-1 h-7 text-xs"
                  onClick={() => { setShowArchived(true); setSelectedId(null); }} data-testid="button-show-archived">Archived</Button>
              </div>

              {panelLists.length === 0 && (
                <p className="text-muted-foreground text-sm pt-1">{showArchived ? "No archived lists." : "No price lists yet."}</p>
              )}
              {panelLists.map((l) => (
                <div
                  key={l.id}
                  className={`w-full rounded-lg border p-3.5 transition-colors ${selectedId === l.id ? "border-emerald-300 border-l-4 border-l-emerald-500 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30" : "hover:bg-muted/40"}`}
                  data-testid={`list-item-${l.id}`}
                >
                  <button
                    className="w-full text-left rounded-sm"
                    onClick={() => { setSelectedId(l.id); setEdits({}); setSearch(""); setBulkMargin(""); setManualIds(new Set()); }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{l.name}</span>
                      <Badge variant={l.status === "published" ? "default" : l.status === "archived" ? "outline" : "secondary"}>{l.status}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {l.scope === "category"
                        ? <span className="text-blue-600 font-medium">Category: {l.categoryName ?? "—"}</span>
                        : (l.brandName ?? "—")} · {l.itemCount} items ·{" "}
                      <span className={l.customerCount === 0 && !showArchived ? "text-amber-600 font-medium" : ""}>
                        {l.customerCount} customers
                      </span>
                    </div>
                    {l.status === "published" && publishedAgo(l.publishedAt ?? l.updatedAt) && (
                      <div className="text-[11px] text-muted-foreground mt-0.5">{publishedAgo(l.publishedAt ?? l.updatedAt)}</div>
                    )}
                  </button>
                  {showArchived && (
                    <div className="flex gap-1 mt-2">
                      <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => restore.mutate(l.id)} data-testid={`button-restore-${l.id}`}>
                        <RefreshCw className="h-3 w-3 mr-1" /> Restore
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive"
                        onClick={() => { if (confirm("Permanently delete this archived list? This cannot be undone.")) del.mutate(l.id); }} data-testid={`button-delete-${l.id}`}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
          )}

          {/* Working sheet */}
          <Card>
            {!selected ? (
              <CardContent className="py-16 text-center text-muted-foreground">
                Select a price list, or create a new one.
              </CardContent>
            ) : (
              <>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-start gap-2">
                      <Button size="icon" variant="ghost" className="mt-0.5 shrink-0" onClick={() => setListsOpen((v) => !v)}
                        title={listsOpen ? "Hide the saved-lists panel for more room" : "Show the saved-lists panel"} data-testid="button-toggle-lists">
                        {listsOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                      </Button>
                      <div>
                      <CardTitle>{selected.name}</CardTitle>
                      <CardDescription>
                        {selected.scope === "category" ? `Category: ${selected.categoryName ?? "—"}` : selected.brandName} · {items.length} products · base margin {selected.defaultMarginPercent ?? "—"}%
                        {priceRange && ` · selling £${priceRange.min.toFixed(2)}–£${priceRange.max.toFixed(2)}`}
                        {selected.status === "published" && publishedAgo(selected.publishedAt ?? selected.updatedAt) && ` · ${publishedAgo(selected.publishedAt ?? selected.updatedAt)}`}
                      </CardDescription>
                      {selected.status !== "published" ? (
                        <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Draft — not published yet. Publish it before you can assign customers.
                        </p>
                      ) : selected.customerCount === 0 ? (
                        <p className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Not assigned to anyone yet — no customer can see this list until you assign it.
                        </p>
                      ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)} data-testid="button-preview-customer">
                        <Eye className="h-4 w-4 mr-1" /> Preview as customer
                      </Button>
                      {selected.status !== "published" ? (
                        <Button size="sm" variant="outline" disabled title="Publish this list before assigning customers" data-testid="button-assign">
                          <Users className="h-4 w-4 mr-1" /> Assign (publish first)
                        </Button>
                      ) : selected.customerCount === 0 ? (
                        <Button size="sm" onClick={() => setAssignOpen(true)} data-testid="button-assign"
                          className="bg-amber-500 hover:bg-amber-600 text-white">
                          <Users className="h-4 w-4 mr-1" /> Assign to customers
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)} data-testid="button-assign">
                          <Users className="h-4 w-4 mr-1" /> Assigned ({selected.customerCount})
                        </Button>
                      )}
                      {selected.status !== "published" && (
                        <Button size="sm" onClick={() => setStatus.mutate("published")} data-testid="button-publish" disabled={items.length === 0}>
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Publish
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => setReconcileOpen(true)} data-testid="button-reconcile">
                        <RefreshCw className="h-4 w-4 mr-1" /> Check for cost changes
                      </Button>
                      {selected.status === "published" && (
                        <Button size="sm" variant="outline" onClick={() => setStatus.mutate("draft")} data-testid="button-unpublish">
                          <Eye className="h-4 w-4 mr-1" /> Unpublish
                        </Button>
                      )}
                      <Button size="sm" variant="outline" data-testid="button-archive"
                        className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
                        onClick={() => { if (confirm("Archive this price list? Customers will be unassigned and it moves to Archived. You can restore it later.")) archive.mutate(selected.id); }}>
                        <Archive className="h-4 w-4 mr-1" /> Archive
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {items.length === 0 ? (
                    <div className="rounded-md border border-dashed p-6 text-center space-y-2">
                      <AlertTriangle className="h-6 w-6 mx-auto text-amber-500" />
                      <p className="font-medium">No products yet — this brand has no published base cost.</p>
                      <p className="text-sm text-muted-foreground">
                        Go to <b>Cost Uploads</b>, upload &amp; <b>Publish</b> the supplier cost for {selected.brandName}, then click the refresh
                        <RefreshCw className="h-3 w-3 inline mx-1" /> button here to pull the products in.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Toolbar: search + set-all-margin + save */}
                      <div className="flex items-end gap-2 flex-wrap border-b pb-3">
                        <div className="flex-1 min-w-[200px]">
                          <Label htmlFor="sheet-search" className="text-xs">Search by product name or EAN</Label>
                          <div className="relative">
                            <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
                            <Input id="sheet-search" className="pl-8" value={search}
                              onChange={(e) => setSearch(e.target.value)} placeholder="Type a name or barcode…" data-testid="input-sheet-search" />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="bulk-margin" className="text-xs">Set one margin % for every line</Label>
                          <div className="flex items-center gap-1">
                            <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => stepMargin(-1)} title="Lower by 1%">
                              <Minus className="h-4 w-4" />
                            </Button>
                            <Input id="bulk-margin" className="w-16 text-center" type="number" value={bulkMargin}
                              onChange={(e) => setBulkMargin(e.target.value)} placeholder="20" data-testid="input-bulk-margin" />
                            <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => stepMargin(1)} title="Raise by 1%">
                              <Plus className="h-4 w-4" />
                            </Button>
                            <div className="flex gap-1 mx-1">
                              {["10", "15", "20", "25", "30"].map((p) => (
                                <Button key={p} type="button" size="sm"
                                  variant={bulkMargin === p ? "default" : "outline"}
                                  className={bulkMargin === p ? "bg-emerald-600 hover:bg-emerald-700 h-9 px-2.5" : "h-9 px-2.5"}
                                  onClick={() => previewMarginAll(p)} data-testid={`chip-margin-${p}`}>{p}%</Button>
                              ))}
                            </div>
                            <Button variant="secondary" onClick={() => previewMarginAll()} disabled={bulkMargin === ""}>Apply to all</Button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Or price by cost band</Label>
                          <Button variant="outline" className="w-full" onClick={() => setBulkOpen(true)} data-testid="button-bulk-pricing">
                            <SlidersHorizontal className="h-4 w-4 mr-1" /> Bulk price (cost bands)
                          </Button>
                        </div>
                        <Button onClick={() => saveItems.mutate()} disabled={!dirtyCount || saveItems.isPending} data-testid="button-save-items">
                          <Save className="h-4 w-4 mr-1" />
                          {saveItems.isPending ? "Saving…" : dirtyCount ? `Save ${dirtyCount} change(s)` : "Saved"}
                        </Button>
                      </div>

                      <div className="text-xs text-muted-foreground flex gap-4 flex-wrap">
                        <span>Showing {filtered.length} of {items.length}</span>
                        <span>{overrides} line override(s)</span>
                        {belowCostCount > 0 && (
                          <span className="text-destructive font-medium flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> {belowCostCount} line(s) priced below cost
                          </span>
                        )}
                        {dirtyCount > 0 && <span className="text-amber-600 font-medium">{dirtyCount} unsaved — review prices, then Save</span>}
                      </div>

                      <div className="overflow-x-auto max-h-[72vh] overflow-y-auto border rounded-md">
                        <Table>
                          <TableHeader className="sticky top-0 z-10">
                            <TableRow className="bg-muted/60 hover:bg-muted/60 border-b [&>th]:text-[11px] [&>th]:uppercase [&>th]:tracking-wider [&>th]:font-semibold [&>th]:text-muted-foreground">
                              <TableHead>Product</TableHead>
                              <TableHead className="text-right">Cost</TableHead>
                              <TableHead>Pricing method</TableHead>
                              <TableHead className="w-28">Value</TableHead>
                              <TableHead className="text-right">Customer price</TableHead>
                              <TableHead>Margin</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filtered.map((raw) => {
                              const it = merged(raw);
                              const cost = num(it.costPrice);
                              const p = livePrice(it);
                              const belowCost = p != null && cost != null && p < cost;
                              const realMargin = p != null && cost != null && cost > 0 ? ((p - cost) / cost) * 100 : null;
                              const changed = edits[raw.id] !== undefined;
                              return (
                                <TableRow key={raw.id} className={changed ? "bg-amber-50 dark:bg-amber-950/20" : ""} data-testid={`item-row-${raw.id}`}>
                                  <TableCell>
                                    <div className="font-medium">{it.description || "—"}</div>
                                    <div className="text-xs text-muted-foreground">{it.ean}{it.caseSize ? ` · case ${it.caseSize}` : ""}</div>
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">{money(it.costPrice)}</TableCell>
                                  <TableCell>
                                    <Select value={it.method} onValueChange={(v) => editItem(raw.id, { method: v as any })}>
                                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="margin">Margin %</SelectItem>
                                        <SelectItem value="fixed">Fixed £</SelectItem>
                                        <SelectItem value="cost_plus">Cost + £</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    {it.method === "margin" && (
                                      <Input className="w-20" type="number" value={(it.marginPercent ?? "") as string}
                                        onChange={(e) => editItem(raw.id, { marginPercent: e.target.value })} placeholder="%" />
                                    )}
                                    {it.method === "fixed" && (
                                      <Input className="w-20" type="number" value={(it.fixedPrice ?? "") as string}
                                        onChange={(e) => editItem(raw.id, { fixedPrice: e.target.value })} placeholder="£" />
                                    )}
                                    {it.method === "cost_plus" && (
                                      <Input className="w-20" type="number" value={(it.plusAmount ?? "") as string}
                                        onChange={(e) => editItem(raw.id, { plusAmount: e.target.value })} placeholder="+£" />
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    <span className={belowCost ? "text-destructive font-bold" : "font-semibold"}>
                                      {p == null
                                        ? <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">On request</span>
                                        : `£${p.toFixed(2)}`}
                                    </span>
                                    {belowCost && <div className="text-xs text-destructive">below cost!</div>}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                                    {realMargin == null ? "—" : `${realMargin.toFixed(1)}%`}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            {filtered.length === 0 && (
                              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No products match “{search}”.</TableCell></TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New price list</DialogTitle>
            <DialogDescription>
              Auto-fills every product at your default margin — a <b>brand</b> list from that brand's base cost, or a <b>category</b> list from every brand's costs in that category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>List type</Label>
              <div className="flex gap-2 mt-1">
                <Button type="button" size="sm" variant={newScope === "brand" ? "default" : "outline"} className="flex-1" onClick={() => setNewScope("brand")} data-testid="button-scope-brand">Brand</Button>
                <Button type="button" size="sm" variant={newScope === "category" ? "default" : "outline"} className="flex-1" onClick={() => setNewScope("category")} data-testid="button-scope-category">Category</Button>
              </div>
            </div>
            {newScope === "brand" ? (
              <div>
                <Label>Brand</Label>
                <Select value={newBrandId} onValueChange={setNewBrandId}>
                  <SelectTrigger data-testid="select-new-brand"><SelectValue placeholder="Choose a brand" /></SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div>
                <Label>Category</Label>
                <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                  <SelectTrigger data-testid="select-new-category"><SelectValue placeholder="Choose a category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="new-name">List name</Label>
              <Input id="new-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Gold customers" data-testid="input-new-name" />
            </div>
            <div>
              <Label htmlFor="new-margin">Default margin %</Label>
              <Input id="new-margin" type="number" value={newMargin} onChange={(e) => setNewMargin(e.target.value)} />
            </div>
            <div>
              <Label>Smart pricing (price endings)</Label>
              <Select value={newRounding} onValueChange={(v) => setNewRounding(v as any)}>
                <SelectTrigger data-testid="select-new-rounding"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Exact — keep 2 decimals (£5.74 → £5.74)</SelectItem>
                  <SelectItem value="charm_49_99">Round to .49 / .99 (£5.74 → £5.99, £5.30 → £5.49)</SelectItem>
                  <SelectItem value="charm_x9">Round to nearest .x9 (£5.74 → £5.79, £5.30 → £5.29)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1">
                {newRounding === "charm_49_99"
                  ? "Each margin/cost-plus price rounds to the nearest .49 or .99 (e.g. £5.74 → £5.99, £5.30 → £5.49)."
                  : newRounding === "charm_x9"
                    ? "Each margin/cost-plus price rounds to the nearest ending in 9 pence (e.g. £5.74 → £5.79, £5.30 → £5.29)."
                    : "Prices keep their exact 2-decimal value (e.g. £5.74 stays £5.74)."}
                {" "}Fixed prices are always left exactly as typed.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={(newScope === "brand" ? !newBrandId : !newCategoryId) || !newName.trim() || create.isPending} data-testid="button-create-list">
              {create.isPending ? "Building…" : "Create & auto-fill"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>What the customer will see</DialogTitle>
            <DialogDescription>
              Exactly what an assigned customer sees in the portal — no cost or margin. {dirtyCount > 0 && "Includes your unsaved changes."}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto border rounded-md">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Availability</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((raw) => {
                  const it = merged(raw);
                  const p = livePrice(it);
                  return (
                    <TableRow key={raw.id}>
                      <TableCell>
                        <div className="font-medium">{it.description || "—"}</div>
                        <div className="text-xs text-muted-foreground">{it.ean}</div>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {p == null ? <span className="text-muted-foreground">Price on request</span> : `£${p.toFixed(2)}`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={it.supplierQty && it.supplierQty > 0 ? "default" : "outline"}>{availLabel(it.supplierQty)}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <DialogFooter><Button onClick={() => setPreviewOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk pricing dialog: tiered cost bands / cost + £ */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk pricing</DialogTitle>
            <DialogDescription>
              Set prices for the whole list at once. Applies to {bulkEligible} line(s) — your manual line edits and fixed £ prices are kept.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2">
            <Button variant={bulkStrategy === "tiered" ? "default" : "outline"} size="sm" onClick={() => setBulkStrategy("tiered")} data-testid="button-strategy-tiered">
              Tiered by cost
            </Button>
            <Button variant={bulkStrategy === "cost_plus" ? "default" : "outline"} size="sm" onClick={() => setBulkStrategy("cost_plus")} data-testid="button-strategy-costplus">
              Cost + £
            </Button>
          </div>

          {bulkStrategy === "tiered" ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Each product gets a margin based on its <b>cost</b>. Cheaper products usually take a higher margin.
              </p>
              {bands.map((b, i) => (
                <div className="flex items-center gap-2" key={i}>
                  <span className="text-sm whitespace-nowrap">Cost up to £</span>
                  <Input className="w-24" type="number" value={b.upTo}
                    placeholder="and above"
                    onChange={(e) => setBands((bs) => bs.map((x, j) => (j === i ? { ...x, upTo: e.target.value } : x)))}
                    data-testid={`input-band-upto-${i}`} />
                  <span className="text-sm whitespace-nowrap">→ margin</span>
                  <Input className="w-20" type="number" value={b.margin}
                    onChange={(e) => setBands((bs) => bs.map((x, j) => (j === i ? { ...x, margin: e.target.value } : x)))}
                    data-testid={`input-band-margin-${i}`} />
                  <span className="text-sm">%</span>
                  <Button variant="ghost" size="sm" onClick={() => setBands((bs) => bs.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setBands((bs) => [...bs, { upTo: "", margin: "" }])}>
                <Plus className="h-4 w-4 mr-1" /> Add band
              </Button>
              <p className="text-xs text-muted-foreground">Leave “up to £” blank for the top band (everything above the last value).</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="bulk-plus" className="text-xs">Add a fixed amount to every product's cost</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm">Cost + £</span>
                <Input id="bulk-plus" className="w-28" type="number" value={bulkPlus}
                  onChange={(e) => setBulkPlus(e.target.value)} placeholder="e.g. 3.00" data-testid="input-bulk-plus" />
              </div>
              <p className="text-xs text-muted-foreground">e.g. Cost + £3 makes a £4.00 product sell at £7.00.</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={applyBulk} disabled={bulkStrategy === "cost_plus" && bulkPlus === ""} data-testid="button-apply-bulk">
              Apply to {bulkEligible} line(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reconcile (review new cost) dialog */}
      {selected && (
        <ReconcileDialog open={reconcileOpen} onOpenChange={setReconcileOpen} listId={selected.id} listName={selected.name} />
      )}

      {/* Assign dialog */}
      {selected && (
        <AssignDialog open={assignOpen} onOpenChange={setAssignOpen} listId={selected.id} listName={selected.name} brandName={selected.brandName} />
      )}
    </>
  );
}

function AssignDialog({ open, onOpenChange, listId, listName, brandName }: {
  open: boolean; onOpenChange: (v: boolean) => void; listId: number; listName: string; brandName: string | null;
}) {
  const { toast } = useToast();
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [preview, setPreview] = useState<AssignImpact | null>(null);

  const { data: users = [] } = useQuery<Customer[]>({ queryKey: ["/api/admin/users"] });
  const { data: assigned = [] } = useQuery<AssignedCustomer[]>({
    queryKey: [`/api/admin/v2/price-lists/${listId}/customers`],
    enabled: open,
  });

  const customers = useMemo(() => users.filter((u) => u.role === "customer"), [users]);
  const assignedIds = useMemo(() => new Set(assigned.map((a) => a.id)), [assigned]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/admin/v2/price-lists/${listId}/customers`] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/v2/price-lists"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/v2/assignments"] }); // keep "Who Sees What" live
  };

  const assign = useMutation({
    mutationFn: async ({ replace }: { replace: boolean }) => {
      const customerIds = Object.entries(checked).filter(([, v]) => v).map(([k]) => Number(k));
      const res = await fetch(`/api/admin/v2/price-lists/${listId}/assign`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify({ customerIds, replace }),
      });
      const body = await res.json();
      if (res.status === 409) return { conflict: true, ...body };
      if (!res.ok) throw new Error(body.message || "Failed");
      return body;
    },
    onSuccess: (res: any) => {
      if (res?.conflict) {
        if (confirm(`${res.conflicts.length} customer(s) already have a different list of this type. Replace it with "${listName}"?`)) {
          assign.mutate({ replace: true });
        }
        return;
      }
      setChecked({}); invalidate();
      toast({ title: `Assigned ${res.assigned} customer(s)` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const assignAll = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/admin/v2/price-lists/${listId}/assign`, { all: true }),
    onSuccess: () => { invalidate(); toast({ title: "Assigned to all customers (one list per brand / per category enforced)" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const unassign = useMutation({
    mutationFn: async (customerId: number) => apiRequest("POST", `/api/admin/v2/price-lists/${listId}/unassign`, { customerId }),
    onSuccess: () => { invalidate(); toast({ title: "Removed" }); },
  });

  const previewMut = useMutation({
    mutationFn: async () => {
      const customerIds = Object.entries(checked).filter(([, v]) => v).map(([k]) => Number(k));
      return (await apiRequest("POST", `/api/admin/v2/price-lists/${listId}/assign-preview`, { customerIds })).json();
    },
    onSuccess: (res: AssignImpact) => setPreview(res),
    onError: (e: any) => toast({ title: "Preview failed", description: e.message, variant: "destructive" }),
  });
  const checkedCount = Object.values(checked).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign “{listName}” to customers</DialogTitle>
          <DialogDescription>
            One list per customer per brand, and one per category, is enforced — a brand list and a category list can coexist (brand price wins where they overlap). Use <b>Preview impact</b> to see what changes before assigning.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{assigned.length} currently assigned</span>
          <Button size="sm" variant="outline" onClick={() => assignAll.mutate()} data-testid="button-assign-all">
            Assign to all customers
          </Button>
        </div>

        <div className="max-h-72 overflow-y-auto border rounded-md divide-y">
          {customers.map((c) => {
            const isAssigned = assignedIds.has(c.id);
            return (
              <div key={c.id} className="flex items-center gap-3 p-2">
                <Checkbox
                  checked={isAssigned || !!checked[c.id]}
                  disabled={isAssigned}
                  onCheckedChange={(v) => { setChecked((p) => ({ ...p, [c.id]: !!v })); setPreview(null); }}
                  data-testid={`check-customer-${c.id}`}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{c.companyName || c.email}</div>
                  <div className="text-xs text-muted-foreground">{c.email}</div>
                </div>
                {isAssigned && (
                  <Button size="sm" variant="ghost" onClick={() => unassign.mutate(c.id)}>Remove</Button>
                )}
              </div>
            );
          })}
          {customers.length === 0 && <div className="p-3 text-sm text-muted-foreground">No customers found.</div>}
        </div>

        {/* Phase 3 — price-impact preview before committing the assignment */}
        {preview && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm" data-testid="assign-preview">
            {preview.totalChanges === 0 ? (
              <div className="text-emerald-700">No prices change for the selected customer(s) — brand-wins precedence keeps their current prices.</div>
            ) : (
              <div className="space-y-2">
                <div className="font-medium">{preview.totalChanges} price change(s) across {preview.customers.length} customer(s):</div>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {preview.customers.map((c) => (
                    <div key={c.customerId}>
                      <div className="text-xs font-semibold">{c.name} — {c.changeCount} change(s)</div>
                      {c.changes.slice(0, 6).map((ch) => (
                        <div key={ch.ean} className="text-xs text-muted-foreground flex justify-between gap-2">
                          <span className="truncate">{ch.description ?? ch.ean}</span>
                          <span className="tabular-nums whitespace-nowrap">
                            {ch.oldPrice == null ? "—" : `£${ch.oldPrice.toFixed(2)}`} ({ch.oldSource}) → {ch.newPrice == null ? "—" : `£${ch.newPrice.toFixed(2)}`} ({ch.newSource})
                          </span>
                        </div>
                      ))}
                      {c.changeCount > 6 && <div className="text-[11px] text-muted-foreground">…and {c.changeCount - 6} more</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button variant="secondary" onClick={() => previewMut.mutate()}
            disabled={checkedCount === 0 || previewMut.isPending} data-testid="button-preview-impact">
            {previewMut.isPending ? "Checking…" : "Preview impact"}
          </Button>
          <Button onClick={() => assign.mutate({ replace: false })}
            disabled={Object.values(checked).every((v) => !v) || assign.isPending} data-testid="button-confirm-assign">
            {assign.isPending ? "Assigning…" : "Assign selected"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// RECONCILE — review a new supplier cost before applying it to the list.
// Buckets: price changed (confirm), new products (add), missing (keep/delete).
// ============================================================
interface ReconcileChanged {
  itemId: number; ean: string | null; description: string | null; method: string;
  oldCost: number | null; newCost: number | null; changePercent: number | null; big: boolean;
}
interface ReconcileNew { ean: string | null; description: string | null; cost: number | null; costRowId: number; }
interface ReconcileMissing { itemId: number; ean: string | null; description: string | null; oldCost: number | null; preparedPrice: number | null; }
interface ReconcilePreview {
  hasBaseCost: boolean; defaultMarginPercent: number | null;
  changed: ReconcileChanged[]; unchangedCount: number;
  newProducts: ReconcileNew[]; missing: ReconcileMissing[];
}

function ReconcileDialog({ open, onOpenChange, listId, listName }: {
  open: boolean; onOpenChange: (v: boolean) => void; listId: number; listName: string;
}) {
  const { toast } = useToast();
  const [rejectChanged, setRejectChanged] = useState<Set<number>>(new Set());
  const [skipNew, setSkipNew] = useState<Set<string>>(new Set());
  const [deleteMissing, setDeleteMissing] = useState<Set<number>>(new Set());
  const [newMargin, setNewMargin] = useState("");

  const { data, isLoading } = useQuery<ReconcilePreview>({
    queryKey: [`/api/admin/v2/price-lists/${listId}/reconcile`],
    enabled: open,
  });

  // Fresh selections each time the dialog opens.
  useEffect(() => {
    if (open) { setRejectChanged(new Set()); setSkipNew(new Set()); setDeleteMissing(new Set()); setNewMargin(""); }
  }, [open, listId]);

  const toggle = <T,>(set: React.Dispatch<React.SetStateAction<Set<T>>>, v: T) =>
    set((prev) => { const n = new Set(prev); n.has(v) ? n.delete(v) : n.add(v); return n; });

  const changed = data?.changed ?? [];
  const newProducts = data?.newProducts ?? [];
  const missing = data?.missing ?? [];
  const marginForNew = newMargin !== "" ? newMargin : (data?.defaultMarginPercent != null ? String(data.defaultMarginPercent) : "20");

  const applyCount = changed.length - rejectChanged.size;
  const addCount = newProducts.filter((p) => p.ean && !skipNew.has(p.ean)).length;
  const deleteCount = deleteMissing.size;
  const keepCount = missing.length - deleteCount;
  const nothingToDo = !data?.hasBaseCost || (changed.length === 0 && newProducts.length === 0 && missing.length === 0);

  const apply = useMutation({
    mutationFn: async () =>
      apiRequest("POST", `/api/admin/v2/price-lists/${listId}/reconcile`, {
        applyChangedItemIds: changed.filter((c) => !rejectChanged.has(c.itemId)).map((c) => c.itemId),
        addNewEans: newProducts.filter((p) => p.ean && !skipNew.has(p.ean)).map((p) => p.ean),
        newMarginPercent: Number(marginForNew) || 0,
        removeMissingItemIds: Array.from(deleteMissing),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/v2/price-lists/${listId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/v2/price-lists"] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/v2/price-lists/${listId}/reconcile`] });
      onOpenChange(false);
      toast({
        title: "List updated from new cost",
        description: `${applyCount} price change(s) applied · ${addCount} added · ${deleteCount} removed · ${keepCount} kept at old price.`,
      });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Review new supplier cost — {listName}</DialogTitle>
          <DialogDescription>
            Compared against the latest published cost for this brand. Nothing changes until you click Apply.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-10 text-center text-muted-foreground">Loading…</div>
        ) : !data?.hasBaseCost ? (
          <div className="rounded-md border border-dashed p-6 text-center space-y-1">
            <AlertTriangle className="h-6 w-6 mx-auto text-amber-500" />
            <p className="font-medium">No published base cost for this brand yet.</p>
            <p className="text-sm text-muted-foreground">Upload &amp; publish a supplier cost in <b>Cost Uploads</b> first.</p>
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto space-y-5 pr-1">
            {/* Summary chips */}
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">{changed.length} price change(s)</Badge>
              <Badge variant="secondary">{data.unchangedCount} unchanged</Badge>
              <Badge variant="secondary">{newProducts.length} new</Badge>
              <Badge variant="secondary">{missing.length} missing</Badge>
            </div>

            {/* CHANGED */}
            {changed.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5"><RefreshCw className="h-4 w-4 text-amber-500" /> Price changed — tick to apply (untick to keep old cost)</h3>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setRejectChanged(new Set())}>Apply all</Button>
                    <Button size="sm" variant="ghost" onClick={() => setRejectChanged(new Set(changed.map((c) => c.itemId)))}>Keep all old</Button>
                  </div>
                </div>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="w-12">Apply</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Old cost</TableHead>
                      <TableHead className="text-right">New cost</TableHead>
                      <TableHead className="text-right">Change</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {changed.map((c) => {
                        const apply = !rejectChanged.has(c.itemId);
                        return (
                          <TableRow key={c.itemId} className={c.big ? "bg-destructive/5" : ""} data-testid={`reconcile-changed-${c.itemId}`}>
                            <TableCell><Checkbox checked={apply} onCheckedChange={() => toggle(setRejectChanged, c.itemId)} /></TableCell>
                            <TableCell>
                              <div className="font-medium">{c.description || "—"}</div>
                              <div className="text-xs text-muted-foreground">{c.ean}</div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">{money(c.oldCost)}</TableCell>
                            <TableCell className="text-right tabular-nums font-semibold">{money(c.newCost)}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              <span className={c.big ? "text-destructive font-bold" : ""}>
                                {c.changePercent == null ? "—" : `${c.changePercent > 0 ? "+" : ""}${c.changePercent.toFixed(1)}%`}
                              </span>
                              {c.big && <div className="text-xs text-destructive font-medium">are you sure?</div>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </section>
            )}

            {/* NEW */}
            {newProducts.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5"><Plus className="h-4 w-4 text-emerald-600" /> New products — added at margin</h3>
                  <div className="flex items-center gap-1">
                    <Label htmlFor="recon-new-margin" className="text-xs">margin %</Label>
                    <Input id="recon-new-margin" className="w-20" type="number" value={marginForNew}
                      onChange={(e) => setNewMargin(e.target.value)} data-testid="input-reconcile-new-margin" />
                  </div>
                </div>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="w-12">Add</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {newProducts.map((p) => (
                        <TableRow key={p.costRowId} data-testid={`reconcile-new-${p.costRowId}`}>
                          <TableCell><Checkbox checked={!!p.ean && !skipNew.has(p.ean)} disabled={!p.ean} onCheckedChange={() => p.ean && toggle(setSkipNew, p.ean)} /></TableCell>
                          <TableCell>
                            <div className="font-medium">{p.description || "—"}</div>
                            <div className="text-xs text-muted-foreground">{p.ean}</div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{money(p.cost)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>
            )}

            {/* MISSING */}
            {missing.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-red-500" /> Not in this upload — kept at old price unless you delete</h3>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteMissing(new Set(missing.map((m) => m.itemId)))}>Delete all</Button>
                </div>
                <p className="text-xs text-muted-foreground">{missing.length} product(s) from this list aren't in the new cost file. By default they keep last month's price.</p>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead className="w-16">Delete</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Old cost</TableHead>
                      <TableHead className="text-right">Current price</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {missing.map((m) => (
                        <TableRow key={m.itemId} className={deleteMissing.has(m.itemId) ? "bg-destructive/5 line-through opacity-60" : ""} data-testid={`reconcile-missing-${m.itemId}`}>
                          <TableCell><Checkbox checked={deleteMissing.has(m.itemId)} onCheckedChange={() => toggle(setDeleteMissing, m.itemId)} /></TableCell>
                          <TableCell>
                            <div className="font-medium">{m.description || "—"}</div>
                            <div className="text-xs text-muted-foreground">{m.ean}</div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">{money(m.oldCost)}</TableCell>
                          <TableCell className="text-right tabular-nums">{money(m.preparedPrice)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>
            )}

            {nothingToDo && (
              <div className="py-6 text-center text-muted-foreground">Everything is already up to date — no changes to review.</div>
            )}
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          <div className="text-xs text-muted-foreground mr-auto">
            {data?.hasBaseCost && `${applyCount} apply · ${addCount} add · ${deleteCount} delete · ${keepCount} keep`}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => apply.mutate()} disabled={nothingToDo || apply.isPending} data-testid="button-apply-reconcile">
            {apply.isPending ? "Applying…" : "Apply to list"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
