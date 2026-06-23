import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Coins, Users, RefreshCw, Trash2, Save, CheckCircle2, Search, Eye, AlertTriangle, SlidersHorizontal } from "lucide-react";

interface PricingBrand { id: number; name: string; }
interface PriceListSummary {
  id: number; name: string; brandId: number | null; brandName: string | null;
  defaultMarginPercent: string | null; status: string; itemCount: number; customerCount: number;
}
interface PriceListItem {
  id: number; ean: string | null; description: string | null; caseSize: string | null;
  costPrice: string | null; method: "margin" | "fixed" | "cost_plus";
  marginPercent: string | null; fixedPrice: string | null; plusAmount: string | null;
  preparedPrice: string | null; supplierQty: number | null;
}
interface Customer { id: number; email: string; companyName: string | null; role: string; status: string; }
interface AssignedCustomer { id: number; email: string; companyName: string | null; }

const money = (n: string | number | null) => (n == null || n === "" ? "—" : `£${Number(n).toFixed(2)}`);
const num = (v: string | null | undefined) => (v == null || v === "" ? null : Number(v));

// Mirror of server computePrepared — instant local preview while editing.
function preview(method: string, cost: number | null, margin: number | null, fixed: number | null, plus: number | null): number | null {
  if (method === "fixed") return fixed;
  if (method === "cost_plus") return cost != null && plus != null ? Math.round((cost + plus) * 100) / 100 : null;
  return cost != null && margin != null ? Math.round(cost * (1 + margin / 100) * 100) / 100 : null;
}
const availLabel = (qty: number | null) => (qty == null ? "On request" : qty <= 0 ? "Out of stock" : qty < 20 ? `Low (${qty})` : "In stock");

export default function PriceBuilderPage() {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [newBrandId, setNewBrandId] = useState("");
  const [newName, setNewName] = useState("");
  const [newMargin, setNewMargin] = useState("20");

  // local unsaved edits keyed by itemId
  const [edits, setEdits] = useState<Record<number, Partial<PriceListItem>>>({});
  const [bulkMargin, setBulkMargin] = useState("");
  const [search, setSearch] = useState("");

  // lines the user hand-edited this session — bulk pricing leaves these alone
  const [manualIds, setManualIds] = useState<Set<number>>(new Set());

  // Bulk pricing dialog (tiered cost bands / cost + £)
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkStrategy, setBulkStrategy] = useState<"tiered" | "cost_plus">("tiered");
  const [bulkPlus, setBulkPlus] = useState("");
  const [bands, setBands] = useState<{ upTo: string; margin: string }[]>([
    { upTo: "5", margin: "25" },
    { upTo: "10", margin: "20" },
    { upTo: "20", margin: "12" },
    { upTo: "", margin: "10" }, // empty "up to" = and above
  ]);

  const { data: brands = [] } = useQuery<PricingBrand[]>({ queryKey: ["/api/admin/pricing-brands"] });
  const { data: lists = [] } = useQuery<PriceListSummary[]>({ queryKey: ["/api/admin/v2/price-lists"] });
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
  const previewMarginAll = () => {
    if (bulkMargin === "") return;
    setEdits((prev) => {
      const next = { ...prev };
      for (const it of items) {
        const m = next[it.id] ?? {};
        const method = (m.method ?? it.method);
        if (method === "margin") next[it.id] = { ...m, method: "margin", marginPercent: bulkMargin };
      }
      return next;
    });
    toast({ title: "Preview updated", description: `All margin lines set to ${bulkMargin}% — review, then Save to publish-ready.` });
  };

  const create = useMutation({
    mutationFn: async () =>
      (await apiRequest("POST", "/api/admin/v2/price-lists", {
        brandId: Number(newBrandId), name: newName, defaultMarginPercent: Number(newMargin) || 0,
      })).json(),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/v2/price-lists"] });
      setCreateOpen(false); setNewName(""); setNewBrandId(""); setNewMargin("20");
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

  const refreshCost = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/admin/v2/price-lists/${selectedId}/refresh-cost`)).json(),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/v2/price-lists/${selectedId}`] });
      setEdits({});
      toast({ title: "Refreshed from base cost", description: `${res.updated} recomputed, ${res.fixedToReview} fixed prices to review.` });
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

  const del = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/admin/v2/price-lists/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/v2/price-lists"] });
      setSelectedId(null);
      toast({ title: "Price list deleted" });
    },
  });

  const selected = lists.find((l) => l.id === selectedId);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Coins className="h-6 w-6" /> Price List Builder
            </h1>
            <p className="text-muted-foreground">
              A working sheet: see each product's cost and selling price, set one margin for all, override a few lines, then save &amp; assign.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} data-testid="button-new-list">
            <Plus className="h-4 w-4 mr-2" /> New Price List
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          {/* Lists */}
          <Card>
            <CardHeader><CardTitle className="text-base">Saved lists</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {lists.length === 0 && <p className="text-muted-foreground text-sm">No price lists yet.</p>}
              {lists.map((l) => (
                <button
                  key={l.id}
                  onClick={() => { setSelectedId(l.id); setEdits({}); setSearch(""); setBulkMargin(""); setManualIds(new Set()); }}
                  className={`w-full text-left rounded-md border p-3 hover-elevate ${selectedId === l.id ? "border-primary bg-accent" : ""}`}
                  data-testid={`list-item-${l.id}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium truncate">{l.name}</span>
                    <Badge variant={l.status === "published" ? "default" : "secondary"}>{l.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {l.brandName ?? "—"} · {l.itemCount} items · {l.customerCount} customers
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

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
                    <div>
                      <CardTitle>{selected.name}</CardTitle>
                      <CardDescription>
                        {selected.brandName} · {items.length} products · base margin {selected.defaultMarginPercent ?? "—"}%
                        {priceRange && ` · selling £${priceRange.min.toFixed(2)}–£${priceRange.max.toFixed(2)}`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => setPreviewOpen(true)} data-testid="button-preview-customer">
                        <Eye className="h-4 w-4 mr-1" /> Preview as customer
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)} data-testid="button-assign">
                        <Users className="h-4 w-4 mr-1" /> Assign ({selected.customerCount})
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => refreshCost.mutate()} title="Re-pull the latest base cost">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      {selected.status === "published" ? (
                        <Button size="sm" variant="outline" onClick={() => setStatus.mutate("draft")}>Unpublish</Button>
                      ) : (
                        <Button size="sm" onClick={() => setStatus.mutate("published")} data-testid="button-publish" disabled={items.length === 0}>
                          <CheckCircle2 className="h-4 w-4 mr-1" /> Publish
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this price list?")) del.mutate(selected.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
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
                          <Label htmlFor="bulk-margin" className="text-xs">Margin % for all lines</Label>
                          <div className="flex gap-1">
                            <Input id="bulk-margin" className="w-24" type="number" value={bulkMargin}
                              onChange={(e) => setBulkMargin(e.target.value)} placeholder="e.g. 20" data-testid="input-bulk-margin" />
                            <Button variant="secondary" onClick={previewMarginAll} disabled={bulkMargin === ""}>Apply to all</Button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Or price by cost band / cost+£</Label>
                          <Button variant="outline" className="w-full" onClick={() => setBulkOpen(true)} data-testid="button-bulk-pricing">
                            <SlidersHorizontal className="h-4 w-4 mr-1" /> Bands &amp; Cost+£
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
                        {dirtyCount > 0 && <span className="text-amber-600 font-medium">{dirtyCount} unsaved — review prices, then Save</span>}
                      </div>

                      <div className="overflow-x-auto max-h-[60vh] overflow-y-auto border rounded-md">
                        <Table>
                          <TableHeader className="sticky top-0 bg-background z-10">
                            <TableRow>
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
                                      {p == null ? "—" : `£${p.toFixed(2)}`}
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
            <DialogDescription>Auto-fills every product from the brand's base cost at your default margin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Brand</Label>
              <Select value={newBrandId} onValueChange={setNewBrandId}>
                <SelectTrigger data-testid="select-new-brand"><SelectValue placeholder="Choose a brand" /></SelectTrigger>
                <SelectContent>
                  {brands.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="new-name">List name</Label>
              <Input id="new-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Gold customers" data-testid="input-new-name" />
            </div>
            <div>
              <Label htmlFor="new-margin">Default margin %</Label>
              <Input id="new-margin" type="number" value={newMargin} onChange={(e) => setNewMargin(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={!newBrandId || !newName.trim() || create.isPending} data-testid="button-create-list">
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

      {/* Assign dialog */}
      {selected && (
        <AssignDialog open={assignOpen} onOpenChange={setAssignOpen} listId={selected.id} listName={selected.name} brandName={selected.brandName} />
      )}
    </AdminLayout>
  );
}

function AssignDialog({ open, onOpenChange, listId, listName, brandName }: {
  open: boolean; onOpenChange: (v: boolean) => void; listId: number; listName: string; brandName: string | null;
}) {
  const { toast } = useToast();
  const [checked, setChecked] = useState<Record<number, boolean>>({});

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
        if (confirm(`${res.conflicts.length} customer(s) already have a different list for ${brandName}. Replace it with "${listName}"?`)) {
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
    onSuccess: () => { invalidate(); toast({ title: "Assigned to all customers (one list per brand enforced)" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const unassign = useMutation({
    mutationFn: async (customerId: number) => apiRequest("POST", `/api/admin/v2/price-lists/${listId}/unassign`, { customerId }),
    onSuccess: () => { invalidate(); toast({ title: "Removed" }); },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign “{listName}” to customers</DialogTitle>
          <DialogDescription>
            One list per customer per brand is enforced. Assigning a customer who already has another {brandName} list will prompt to replace it.
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
                  onCheckedChange={(v) => setChecked((p) => ({ ...p, [c.id]: !!v }))}
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={() => assign.mutate({ replace: false })}
            disabled={Object.values(checked).every((v) => !v) || assign.isPending} data-testid="button-confirm-assign">
            {assign.isPending ? "Assigning…" : "Assign selected"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
