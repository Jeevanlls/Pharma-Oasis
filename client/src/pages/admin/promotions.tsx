import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Megaphone, Search, Trash2, CheckCircle2, Archive, CalendarClock } from "lucide-react";

interface PromotionSummary {
  id: number; name: string; status: string; startsAt: string | null; endsAt: string | null;
  itemCount: number; isLive: boolean;
}
interface PromoItem {
  id: number; ean: string | null; description: string | null; caseSize: string | null;
  costPrice: string | null; preparedPrice: string | null;
}
interface PromoFull { list: PromotionSummary & { scope: string }; items: PromoItem[]; }
interface Promotable { ean: string; description: string | null; caseSize: string | null; costPrice: string | null; brandName: string | null; }

const money = (n: string | number | null) => (n == null || n === "" ? "—" : `£${Number(n).toFixed(2)}`);
// ISO -> value for <input type="datetime-local"> (local clock, no seconds/zone)
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fmtWindow = (s: string | null, e: string | null) => {
  const f = (x: string | null) => (x ? new Date(x).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");
  if (!s && !e) return "No dates set (open-ended)";
  return `${f(s)} → ${f(e)}`;
};

function statusBadge(p: PromotionSummary) {
  if (p.status === "archived") return <Badge variant="outline" className="text-muted-foreground">Archived</Badge>;
  if (p.isLive) return <Badge className="bg-emerald-100 text-emerald-800">Live</Badge>;
  if (p.status === "published") return <Badge className="bg-amber-100 text-amber-800">Scheduled / ended</Badge>;
  return <Badge variant="secondary">Draft</Badge>;
}

export default function AdminPromotionsPage() {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [pickSearch, setPickSearch] = useState("");
  const [pickQuery, setPickQuery] = useState("");
  const [addPrice, setAddPrice] = useState<Record<string, string>>({});

  const { data: promos = [] } = useQuery<PromotionSummary[]>({ queryKey: ["/api/admin/promotions"] });
  const { data: detail } = useQuery<PromoFull>({
    queryKey: ["/api/admin/promotions", selectedId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/promotions/${selectedId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load promotion");
      return res.json();
    },
    enabled: selectedId != null,
  });
  const { data: picks = [] } = useQuery<Promotable[]>({
    queryKey: ["/api/admin/promotions-product-search", pickQuery],
    queryFn: async () => {
      const res = await fetch(`/api/admin/promotions-product-search?q=${encodeURIComponent(pickQuery)}`, { credentials: "include" });
      if (!res.ok) throw new Error("search failed");
      return res.json();
    },
    enabled: selectedId != null,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/promotions"] });
    if (selectedId != null) queryClient.invalidateQueries({ queryKey: ["/api/admin/promotions", selectedId] });
  };

  const createMut = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/promotions", {
      name: newName, startsAt: newStart || null, endsAt: newEnd || null,
    }),
    onSuccess: async (res) => {
      const p = await res.json();
      setCreateOpen(false); setNewName(""); setNewStart(""); setNewEnd("");
      refresh(); setSelectedId(p.id);
      toast({ title: "Promotion created", description: "Add products, then publish to go live." });
    },
    onError: (e: any) => toast({ title: "Could not create", description: e.message, variant: "destructive" }),
  });

  const metaMut = useMutation({
    mutationFn: (patch: any) => apiRequest("PUT", `/api/admin/promotions/${selectedId}`, patch),
    onSuccess: () => refresh(),
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const addMut = useMutation({
    mutationFn: (item: { ean: string; description: string | null; caseSize: string | null; costPrice: string | null; price: number }) =>
      apiRequest("POST", `/api/admin/promotions/${selectedId}/items`, { items: [item] }),
    onSuccess: async (res) => {
      const r = await res.json();
      refresh();
      if (r.added) toast({ title: "Added to promotion" });
      else toast({ title: "Already on this promotion", variant: "destructive" });
    },
  });

  const priceMut = useMutation({
    mutationFn: ({ itemId, price }: { itemId: number; price: number }) =>
      apiRequest("PUT", `/api/admin/promotions/${selectedId}/items/${itemId}`, { price }),
    onSuccess: () => refresh(),
  });
  const removeMut = useMutation({
    mutationFn: (itemId: number) => apiRequest("DELETE", `/api/admin/promotions/${selectedId}/items/${itemId}`),
    onSuccess: () => refresh(),
  });
  const archiveMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/promotions/${selectedId}/archive`),
    onSuccess: () => { refresh(); setSelectedId(null); toast({ title: "Promotion archived" }); },
  });

  const onEans = new Set((detail?.items ?? []).map((i) => i.ean));

  return (
    <div className="space-y-6" data-testid="admin-promotions">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Megaphone className="h-6 w-6 text-emerald-600" /> Monthly Promotions</h1>
          <p className="text-muted-foreground">Cross-brand offers shown to every customer. A live promotion price overrides the customer's brand &amp; category list price.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="button-new-promotion"><Plus className="h-4 w-4 mr-1" /> New promotion</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Promotions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {promos.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">No promotions yet.</div>}
            {promos.map((p) => (
              <button key={p.id} onClick={() => setSelectedId(p.id)} data-testid={`promo-row-${p.id}`}
                className={`w-full text-left rounded-lg border p-3 transition ${selectedId === p.id ? "border-emerald-400 bg-emerald-50/60" : "hover:bg-muted/50"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium truncate">{p.name}</span>
                  {statusBadge(p)}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" /> {fmtWindow(p.startsAt, p.endsAt)} · {p.itemCount} item{p.itemCount === 1 ? "" : "s"}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Detail */}
        <Card className="lg:col-span-2">
          {!detail ? (
            <CardContent className="py-16 text-center text-muted-foreground">Select a promotion, or create one.</CardContent>
          ) : (
            <>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">{detail.list.name} {statusBadge(detail.list)}</CardTitle>
                    <div className="text-xs text-muted-foreground mt-1">{fmtWindow(detail.list.startsAt, detail.list.endsAt)}</div>
                  </div>
                  <div className="flex gap-2">
                    {detail.list.status !== "published" ? (
                      <Button size="sm" onClick={() => metaMut.mutate({ status: "published" })} data-testid="button-publish-promotion">
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Publish
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => metaMut.mutate({ status: "draft" })} data-testid="button-unpublish-promotion">
                        Unpublish
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => archiveMut.mutate()} data-testid="button-archive-promotion">
                      <Archive className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {/* Schedule editor */}
                <div className="grid grid-cols-2 gap-3 pt-3">
                  <div>
                    <Label className="text-xs">Starts</Label>
                    <Input type="datetime-local" defaultValue={toLocalInput(detail.list.startsAt)}
                      onBlur={(e) => metaMut.mutate({ startsAt: e.target.value || null })} data-testid="input-promo-start" />
                  </div>
                  <div>
                    <Label className="text-xs">Ends</Label>
                    <Input type="datetime-local" defaultValue={toLocalInput(detail.list.endsAt)}
                      onBlur={(e) => metaMut.mutate({ endsAt: e.target.value || null })} data-testid="input-promo-end" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Items on the promotion */}
                <div>
                  <div className="text-sm font-semibold mb-2">Products on this promotion ({detail.items.length})</div>
                  {detail.items.length === 0 ? (
                    <div className="text-sm text-muted-foreground">None yet — add products below.</div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="w-28">EAN</TableHead>
                          <TableHead className="w-32">Promo price</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.items.map((it) => (
                          <TableRow key={it.id} data-testid={`promo-item-${it.id}`}>
                            <TableCell className="text-sm">{it.description ?? "—"}{it.caseSize ? <span className="text-xs text-muted-foreground"> · {it.caseSize}</span> : null}</TableCell>
                            <TableCell className="font-mono text-xs">{it.ean}</TableCell>
                            <TableCell>
                              <Input className="h-8 w-24 tabular-nums" defaultValue={it.preparedPrice ?? ""}
                                onBlur={(e) => { const v = Number(e.target.value); if (!isNaN(v) && String(v) !== it.preparedPrice) priceMut.mutate({ itemId: it.id, price: v }); }} />
                            </TableCell>
                            <TableCell>
                              <Button size="icon" variant="ghost" onClick={() => removeMut.mutate(it.id)} data-testid={`button-remove-${it.id}`}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                {/* Product picker */}
                <div className="border-t pt-4">
                  <div className="text-sm font-semibold mb-2">Add products</div>
                  <div className="flex gap-2 mb-3">
                    <Input placeholder="Search the pricing catalogue by name or EAN" value={pickSearch}
                      onChange={(e) => setPickSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && setPickQuery(pickSearch)} />
                    <Button variant="secondary" onClick={() => setPickQuery(pickSearch)}><Search className="h-4 w-4" /></Button>
                  </div>
                  <div className="space-y-1 max-h-80 overflow-auto">
                    {picks.filter((p) => !onEans.has(p.ean)).map((p) => (
                      <div key={p.ean} className="flex items-center gap-2 rounded-md border p-2" data-testid={`pick-${p.ean}`}>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{p.description ?? p.ean}</div>
                          <div className="text-xs text-muted-foreground font-mono">{p.ean}{p.brandName ? ` · ${p.brandName}` : ""}{p.costPrice ? ` · cost ${money(p.costPrice)}` : ""}</div>
                        </div>
                        <Input className="h-8 w-24" placeholder="£ price" value={addPrice[p.ean] ?? ""}
                          onChange={(e) => setAddPrice({ ...addPrice, [p.ean]: e.target.value })} />
                        <Button size="sm" disabled={!addPrice[p.ean] || isNaN(Number(addPrice[p.ean]))}
                          onClick={() => addMut.mutate({ ean: p.ean, description: p.description, caseSize: p.caseSize, costPrice: p.costPrice, price: Number(addPrice[p.ean]) })}>
                          Add
                        </Button>
                      </div>
                    ))}
                    {pickQuery && picks.length === 0 && <div className="text-sm text-muted-foreground py-3">No products match.</div>}
                    {!pickQuery && <div className="text-xs text-muted-foreground py-2">Search to find products to promote.</div>}
                  </div>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New monthly promotion</DialogTitle>
            <DialogDescription>Create the promotion, add products and a price, then publish to go live. Leave dates empty for an open-ended promotion.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. July Deals" data-testid="input-new-promo-name" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Starts (optional)</Label><Input type="datetime-local" value={newStart} onChange={(e) => setNewStart(e.target.value)} /></div>
              <div><Label className="text-xs">Ends (optional)</Label><Input type="datetime-local" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button disabled={!newName.trim() || createMut.isPending} onClick={() => createMut.mutate()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
