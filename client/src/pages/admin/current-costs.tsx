import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertTriangle, Loader2, Search, Save, CheckCircle2, RotateCcw, Clock, Coins } from "lucide-react";

interface Brand { id: number; name: string; }
interface CurrentCostRow {
  ean: string | null; description: string | null; costPrice: number | null;
  supplierQty: number | null; caseSize: string | null; comment: string | null; categoryName: string | null;
}
interface CurrentCosts {
  brandId: number; uploadId: number | null; publishedAt: string | null;
  validUntil: string | null; supplierName: string | null; rows: CurrentCostRow[];
}
interface ImpactLine {
  listId: number; listName: string; customers: string[];
  ean: string | null; description: string | null; method: string;
  oldCost: number | null; newCost: number; changePercent: number | null; big: boolean;
  oldPrice: number | null; newPrice: number | null;
}
interface CostEditPreview { costsChanged: number; itemsAffected: number; listsAffected: number; lines: ImpactLine[]; }

const money = (n: number | null) => (n === null || n === undefined ? "—" : `£${Number(n).toFixed(2)}`);
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function daysAgo(iso: string | null): { label: string; stale: boolean } | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  const days = Math.floor((Date.now() - then) / 86_400_000);
  const when = new Date(iso).toLocaleDateString();
  if (days <= 0) return { label: `Published today (${when})`, stale: false };
  return { label: `Published ${when} — ${days} day${days === 1 ? "" : "s"} ago`, stale: days > 60 };
}

export default function AdminCurrentCostsPage() {
  const { toast } = useToast();
  const [brandId, setBrandId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [brandSearch, setBrandSearch] = useState(""); // presentation-only: filters the left brand rail
  // EAN -> edited cost (string while typing) and note.
  const [edits, setEdits] = useState<Record<string, { cost: string; comment: string }>>({});
  const [preview, setPreview] = useState<CostEditPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [applying, setApplying] = useState(false);

  const { data: brands = [] } = useQuery<Brand[]>({ queryKey: ["/api/admin/pricing-brands"] });
  const { data: current, isFetching } = useQuery<CurrentCosts>({
    queryKey: ["/api/admin/current-costs", brandId],
    enabled: !!brandId,
  });
  // Per-EAN dependency counts: how many price-list lines / customers rely on each cost.
  const { data: deps = {} } = useQuery<Record<string, { lists: number; customers: number }>>({
    queryKey: ["/api/admin/current-costs", brandId, "dependencies"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/current-costs/${brandId}/dependencies`);
      return res.json();
    },
    enabled: !!brandId,
  });
  const depKey = (ean: string | null) => (ean ?? "").replace(/[^0-9]/g, "");

  // Reset edits when switching brands.
  useEffect(() => { setEdits({}); setPreview(null); }, [brandId]);

  const rows = current?.rows ?? [];
  const published = daysAgo(current?.publishedAt ?? null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      (r.description ?? "").toLowerCase().includes(q) || (r.ean ?? "").toLowerCase().includes(q));
  }, [rows, search]);

  // Build the edit payload: only rows whose cost actually changed (or note changed).
  const editPayload = useMemo(() => {
    const out: { ean: string; newCost: number; comment?: string | null }[] = [];
    for (const r of rows) {
      if (!r.ean) continue;
      const e = edits[r.ean];
      if (!e) continue;
      const newCost = e.cost === "" ? null : Number(e.cost);
      const costMoved = newCost !== null && Number.isFinite(newCost) && newCost > 0 &&
        (r.costPrice === null || round2(r.costPrice) !== round2(newCost));
      const noteMoved = e.comment !== (r.comment ?? "");
      if (costMoved) out.push({ ean: r.ean, newCost, comment: noteMoved ? e.comment : undefined });
      else if (noteMoved && r.costPrice !== null) out.push({ ean: r.ean, newCost: r.costPrice, comment: e.comment });
    }
    return out;
  }, [rows, edits]);

  const changedCount = editPayload.length;

  function setCost(ean: string, cost: string, fallbackComment: string) {
    setEdits((p) => ({ ...p, [ean]: { cost, comment: p[ean]?.comment ?? fallbackComment } }));
  }
  function setNote(ean: string, comment: string, fallbackCost: string) {
    setEdits((p) => ({ ...p, [ean]: { cost: p[ean]?.cost ?? fallbackCost, comment } }));
  }
  function resetEdits() { setEdits({}); setPreview(null); }

  async function openConfirm() {
    if (!brandId || changedCount === 0) return;
    setLoadingPreview(true);
    try {
      const res = await apiRequest("POST", `/api/admin/current-costs/${brandId}/preview`, { edits: editPayload });
      setPreview(await res.json());
    } catch (e: any) {
      toast({ title: "Could not preview changes", description: e.message, variant: "destructive" });
    } finally {
      setLoadingPreview(false);
    }
  }

  async function applyChanges() {
    if (!brandId) return;
    setApplying(true);
    try {
      const res = await apiRequest("POST", `/api/admin/current-costs/${brandId}/apply`, { edits: editPayload });
      const data = await res.json();
      toast({
        title: "Costs updated",
        description: `${data.costsChanged} cost(s) changed. ${data.itemsRepriced} customer price(s) updated across ${data.listsAffected} list(s).`,
      });
      setPreview(null);
      setEdits({});
      queryClient.invalidateQueries({ queryKey: ["/api/admin/current-costs", brandId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cost-uploads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing-brands-cost-status"] });
    } catch (e: any) {
      toast({ title: "Apply failed", description: e.message, variant: "destructive" });
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          <Coins className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Current Costs</h1>
          <p className="text-muted-foreground">
            <b>Step 4 (optional).</b> Quickly fix a brand's live cost prices without re-uploading a file. Changing a cost updates the
            customer prices built from it — you'll see exactly what changes before confirming.
          </p>
        </div>
      </div>

      {/* Mobile brand picker fallback (the left rail replaces this on lg+) */}
      <Card className="lg:hidden">
        <CardContent className="pt-6">
          <Label>Brand</Label>
          <Select value={brandId} onValueChange={setBrandId}>
            <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
            <SelectContent>
              {brands.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Left rail — brand list (desktop). Selection drives the same setBrandId. */}
        <Card className="hidden lg:block h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Brands</CardTitle>
            <CardDescription>Pick one to edit its live costs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
              <Input className="pl-8" placeholder="Filter brands…" value={brandSearch} onChange={(e) => setBrandSearch(e.target.value)} />
            </div>
            <div className="space-y-1.5 max-h-[520px] overflow-auto pr-1">
              {brands
                .filter((b) => b.name.toLowerCase().includes(brandSearch.trim().toLowerCase()))
                .map((b) => {
                  const selected = brandId === String(b.id);
                  return (
                    <button key={b.id} type="button" onClick={() => setBrandId(String(b.id))}
                      className={`w-full text-left rounded-lg border px-3 py-2.5 text-sm transition-colors ${selected ? "border-emerald-300 border-l-4 border-l-emerald-500 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 font-medium text-emerald-900 dark:text-emerald-200" : "hover:bg-muted/40"}`}>
                      {b.name}
                    </button>
                  );
                })}
              {brands.length === 0 && <p className="text-xs text-muted-foreground px-1 py-2">No brands yet.</p>}
            </div>
          </CardContent>
        </Card>

        {/* Right pane — live costs for the selected brand */}
        <div className="space-y-4 min-w-0">
          {brandId && changedCount > 0 && (
            <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-amber-300 bg-amber-50/95 px-3 py-2 shadow-sm backdrop-blur dark:border-amber-700 dark:bg-amber-950/60">
              <Badge className="bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100">{changedCount} edited</Badge>
              <span className="text-xs text-amber-800 dark:text-amber-200">Unsaved cost change{changedCount === 1 ? "" : "s"}.</span>
              <div className="ml-auto flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={resetEdits} className="text-amber-800 hover:bg-amber-100 dark:text-amber-200">
                  <RotateCcw className="h-4 w-4 mr-1.5" /> Discard
                </Button>
                <Button size="sm" onClick={openConfirm} disabled={loadingPreview}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {loadingPreview ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                  Review &amp; apply ({changedCount})
                </Button>
              </div>
            </div>
          )}
          {!brandId && (
            <Card><CardContent className="p-6">
              <div className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
                Select a brand to see and edit its live costs.
              </div>
            </CardContent></Card>
          )}

          {brandId && !current && (
            <Card><CardContent className="p-6 flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading live costs…
            </CardContent></Card>
          )}

          {brandId && current && current.uploadId === null && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No live costs for this brand yet</AlertTitle>
              <AlertDescription>Upload and publish a cost file in <strong>Cost Uploads</strong> first.</AlertDescription>
            </Alert>
          )}

      {brandId && current && current.uploadId !== null && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex flex-wrap items-center gap-2">
                Live costs
                <Badge variant="outline">{rows.length} products</Badge>
                {changedCount > 0 && <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">{changedCount} edited</Badge>}
              </CardTitle>
              {published && (
                <Badge className={published.stale ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"}>
                  <Clock className="h-3 w-3 mr-1" /> {published.label}
                </Badge>
              )}
            </div>
            <CardDescription>Search, then edit the cost or note on just the lines you need.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input className="max-w-sm" placeholder="Search by product name or EAN"
                value={search} onChange={(e) => setSearch(e.target.value)} />
              <span className="text-xs text-muted-foreground">Showing {filtered.length} of {rows.length}</span>
              {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            <div className="max-h-[520px] overflow-auto border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 z-10">
                  <TableRow className="bg-muted/60 hover:bg-muted/60 border-b">
                    <TableHead className="w-[170px] text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">EAN</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Description</TableHead>
                    <TableHead className="text-right w-[110px] text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Live cost</TableHead>
                    <TableHead className="text-right w-[150px] text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">New cost</TableHead>
                    <TableHead className="w-[130px] text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Used by</TableHead>
                    <TableHead className="w-[220px] text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-8">No products match</TableCell></TableRow>
                  )}
                  {filtered.map((r) => {
                    const key = r.ean ?? "";
                    const e = key ? edits[key] : undefined;
                    const costStr = e?.cost ?? (r.costPrice ?? "").toString();
                    const edited = !!e && (
                      (e.cost !== "" && round2(Number(e.cost)) !== round2(r.costPrice ?? NaN)) ||
                      (e.comment ?? "") !== (r.comment ?? "")
                    );
                    return (
                      <TableRow key={key || r.description} className={edited ? "bg-amber-50/70 dark:bg-amber-950/20" : ""}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <span className={`inline-block h-1.5 w-1.5 rounded-full ${edited ? "bg-amber-500" : "bg-transparent"}`} aria-hidden />
                            {r.ean || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{r.description || "—"}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{money(r.costPrice)}</TableCell>
                        <TableCell>
                          <div className="relative">
                            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">£</span>
                            <Input type="number" step="0.01" disabled={!r.ean}
                              className={`h-9 pl-5 text-right tabular-nums ${edited ? "border-amber-400 focus-visible:ring-amber-400 dark:border-amber-600" : ""}`}
                              placeholder={r.costPrice !== null ? Number(r.costPrice).toFixed(2) : "0.00"}
                              value={costStr}
                              onChange={(ev) => setCost(key, ev.target.value, r.comment ?? "")} />
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const d = depKey(r.ean) ? deps[depKey(r.ean)] : undefined;
                            if (!d || d.lists === 0) {
                              return <span className="text-[11px] text-muted-foreground">Not on any list</span>;
                            }
                            const title = `${d.lists} price-list line(s) and ${d.customers} customer(s) use this cost — they reprice automatically when you change it.`;
                            return (
                              <span title={title} className={`inline-flex flex-col gap-0.5 text-[11px] leading-tight ${edited ? "font-medium text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
                                <span>{d.lists} list{d.lists === 1 ? "" : "s"}</span>
                                <span>{d.customers} cust{d.customers === 1 ? "" : "s"}</span>
                              </span>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <Input className="h-9 text-sm" placeholder="Internal note" disabled={!r.ean}
                            value={e?.comment ?? (r.comment ?? "")}
                            onChange={(ev) => setNote(key, ev.target.value, (r.costPrice ?? "").toString())} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={openConfirm} disabled={changedCount === 0 || loadingPreview}
                className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {loadingPreview ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Review &amp; apply {changedCount > 0 ? `(${changedCount})` : ""}
              </Button>
              <Button variant="outline" onClick={resetEdits} disabled={changedCount === 0}>
                <RotateCcw className="h-4 w-4 mr-2" /> Discard edits
              </Button>
              {changedCount === 0 && <span className="text-xs text-muted-foreground">Edit a cost or note to enable.</span>}
            </div>
          </CardContent>
        </Card>
      )}
        </div>
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => { if (!o) setPreview(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Confirm cost changes</DialogTitle>
            <DialogDescription>
              {preview && preview.itemsAffected > 0
                ? <>These cost changes will update <strong>{preview.itemsAffected} customer price(s)</strong> across <strong>{preview.listsAffected} price list(s)</strong>. Review the new customer prices below. <strong>Nothing changes until you press Confirm &amp; apply.</strong></>
                : <>{preview?.costsChanged ?? 0} cost(s) will change. No customer price lists reference these products yet, so no customer prices change.</>}
            </DialogDescription>
          </DialogHeader>

          {preview && preview.lines.length > 0 && (
            <div className="max-h-[55vh] overflow-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Price list / customers</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Customer price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.lines.map((l, i) => (
                    <TableRow key={i} className={l.big ? "bg-red-50 dark:bg-red-950/30" : ""}>
                      <TableCell className="text-xs">
                        <div>{l.description || "—"}</div>
                        <div className="font-mono text-muted-foreground">{l.ean || "—"}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">{l.listName}</div>
                        <div className="text-muted-foreground truncate max-w-[220px]">
                          {l.customers.length ? l.customers.join(", ") : "no customers assigned"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {money(l.oldCost)} → <strong>{money(l.newCost)}</strong>
                        {l.changePercent !== null && (
                          <div className={l.big ? "text-red-600 dark:text-red-400 font-semibold" : "text-muted-foreground"}>
                            {l.changePercent > 0 ? "+" : ""}{l.changePercent}%{l.big ? " ⚠" : ""}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {money(l.oldPrice)} → <strong>{money(l.newPrice)}</strong>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {preview && preview.lines.some((l) => l.big) && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>Some changes are large (marked ⚠). Double-check those costs are correct before confirming.</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)} disabled={applying}>Cancel</Button>
            <Button onClick={applyChanges} disabled={applying}
              className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {applying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Confirm &amp; apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
