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
import { AlertTriangle, Loader2, Search, Save, CheckCircle2, RotateCcw, Clock } from "lucide-react";

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
    } catch (e: any) {
      toast({ title: "Apply failed", description: e.message, variant: "destructive" });
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Current Costs</h1>
        <p className="text-muted-foreground">
          See and quickly edit a brand's live cost prices without re-uploading a file. Changing a cost will update the
          customer prices built from it — you'll see exactly what changes before confirming.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pick a brand</CardTitle>
          <CardDescription>Shows the costs that are live right now, and when they were published.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px]">
              <Label>Brand</Label>
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                <SelectContent>
                  {brands.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {brandId && published && (
              <Badge className={published.stale ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}>
                <Clock className="h-3 w-3 mr-1" /> {published.label}
              </Badge>
            )}
          </div>

          {brandId && current && current.uploadId === null && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No live costs for this brand yet</AlertTitle>
              <AlertDescription>Upload and publish a cost file in <strong>Cost Uploads</strong> first.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {brandId && current && current.uploadId !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              Live costs
              <Badge variant="outline">{rows.length} products</Badge>
              {changedCount > 0 && <Badge className="bg-amber-100 text-amber-800">{changedCount} edited</Badge>}
            </CardTitle>
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

            <div className="max-h-[520px] overflow-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">EAN</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right w-[110px]">Live cost</TableHead>
                    <TableHead className="text-right w-[120px]">New cost</TableHead>
                    <TableHead className="w-[220px]">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground text-sm">No products match</TableCell></TableRow>
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
                      <TableRow key={key || r.description} className={edited ? "bg-amber-50" : ""}>
                        <TableCell className="font-mono text-xs">{r.ean || "—"}</TableCell>
                        <TableCell className="text-xs">{r.description || "—"}</TableCell>
                        <TableCell className="text-right text-xs">{money(r.costPrice)}</TableCell>
                        <TableCell>
                          <Input type="number" step="0.01" disabled={!r.ean}
                            className="h-8 text-xs text-right" placeholder={money(r.costPrice)}
                            value={costStr}
                            onChange={(ev) => setCost(key, ev.target.value, r.comment ?? "")} />
                        </TableCell>
                        <TableCell>
                          <Input className="h-8 text-xs" placeholder="Internal note" disabled={!r.ean}
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
              <Button onClick={openConfirm} disabled={changedCount === 0 || loadingPreview}>
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

      <Dialog open={!!preview} onOpenChange={(o) => { if (!o) setPreview(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Confirm cost changes</DialogTitle>
            <DialogDescription>
              {preview && preview.itemsAffected > 0
                ? <>These cost changes will update <strong>{preview.itemsAffected} customer price(s)</strong> across <strong>{preview.listsAffected} price list(s)</strong>. Review the new customer prices below, then confirm.</>
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
                    <TableRow key={i} className={l.big ? "bg-red-50" : ""}>
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
                          <div className={l.big ? "text-red-600 font-semibold" : "text-muted-foreground"}>
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
            <Button onClick={applyChanges} disabled={applying}>
              {applying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              Confirm &amp; apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
