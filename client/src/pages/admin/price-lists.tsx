import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Trash2, Save, Coins, Eye, Loader2, Star, FileSpreadsheet, FileText } from "lucide-react";

interface Brand { id: number; name: string; }
interface Category { id: number; name: string; }
interface PriceList { id: number; name: string; type: string; isActive: boolean; isDefault: boolean; notes: string | null; }
interface Rule { level: string; targetId: number | null; marginPercent: string | null; fixedPrice: string | null; }
interface UserRow { id: number; email: string; role: string; status: string; companyName: string | null; priceListId: number | null; }
interface Resolved { productId: number; price: number | null; cost: number | null; marginPercent: number | null; ruleLevel: string | null; isFixed: boolean; }

const LEVELS = ["overall", "brand", "category", "product"];

export default function AdminPriceListsPage() {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("tier");
  const [rules, setRules] = useState<Rule[]>([]);
  const [previewBrand, setPreviewBrand] = useState<string>("");
  const [previewRows, setPreviewRows] = useState<{ name: string; cost: number | null; price: number | null; level: string | null; fixed: boolean }[]>([]);

  const { data: lists = [] } = useQuery<PriceList[]>({ queryKey: ["/api/admin/price-lists"] });
  const { data: brands = [] } = useQuery<Brand[]>({ queryKey: ["/api/brands"] });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const { data: users = [] } = useQuery<UserRow[]>({ queryKey: ["/api/admin/users"] });
  const { data: detail } = useQuery<{ list: PriceList; rules: Rule[] }>({
    queryKey: ["/api/admin/price-lists", selectedId],
    enabled: selectedId !== null,
  });

  useEffect(() => {
    if (detail?.rules) {
      setRules(detail.rules.map((r) => ({
        level: r.level, targetId: r.targetId,
        marginPercent: r.marginPercent != null ? String(r.marginPercent) : null,
        fixedPrice: r.fixedPrice != null ? String(r.fixedPrice) : null,
      })));
    }
  }, [detail]);

  const customers = users.filter((u) => u.role === "customer");

  const createMut = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/admin/price-lists", { name: newName, type: newType }),
    onSuccess: async (res) => {
      const list = await res.json();
      setNewName("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/price-lists"] });
      setSelectedId(list.id);
      toast({ title: "Price list created" });
    },
  });

  const saveRulesMut = useMutation({
    mutationFn: async () => {
      const clean = rules.map((r) => ({
        level: r.level,
        targetId: r.level === "overall" ? null : r.targetId,
        marginPercent: r.fixedPrice ? null : (r.marginPercent ? Number(r.marginPercent) : null),
        fixedPrice: r.fixedPrice ? Number(r.fixedPrice) : null,
      }));
      return apiRequest("PUT", `/api/admin/price-lists/${selectedId}/rules`, { rules: clean });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/price-lists", selectedId] });
      toast({ title: "Rules saved" });
      if (previewBrand) runPreview();
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/admin/price-lists/${id}`),
    onSuccess: () => {
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/price-lists"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Price list deleted" });
    },
  });

  const assignMut = useMutation({
    mutationFn: async ({ userId, priceListId }: { userId: number; priceListId: number | null }) =>
      apiRequest("POST", `/api/admin/customers/${userId}/price-list`, { priceListId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Customer updated" });
    },
  });

  async function runPreview() {
    if (!selectedId || !previewBrand) return;
    try {
      const res = await fetch(`/api/products?brand=${previewBrand}&limit=15`, { credentials: "include" });
      const data = await res.json();
      const products: any[] = data.products ?? data;
      const ids = products.map((p) => p.id);
      const pr = await apiRequest("POST", `/api/admin/price-lists/${selectedId}/preview-prices`, { productIds: ids });
      const resolved: Resolved[] = await pr.json();
      const byId = new Map(resolved.map((r) => [r.productId, r]));
      setPreviewRows(products.map((p) => {
        const r = byId.get(p.id);
        return { name: p.productName, cost: r?.cost ?? null, price: r?.price ?? null, level: r?.ruleLevel ?? null, fixed: r?.isFixed ?? false };
      }));
    } catch (e: any) {
      toast({ title: "Preview failed", description: e.message, variant: "destructive" });
    }
  }

  const updateRule = (i: number, patch: Partial<Rule>) =>
    setRules((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRule = () => setRules((rs) => [...rs, { level: "overall", targetId: null, marginPercent: "", fixedPrice: null }]);
  const removeRule = (i: number) => setRules((rs) => rs.filter((_, idx) => idx !== i));

  const money = (n: number | null) => (n === null ? "—" : `£${Number(n).toFixed(2)}`);

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Price Lists</h1>
        <p className="text-muted-foreground">Reusable tiers (e.g. Gold/Silver) or per-customer lists. Rules add a margin on cost — most specific wins.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: lists */}
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="flex items-center gap-2"><Coins className="h-5 w-5" /> Lists</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {lists.map((l) => (
              <button key={l.id} onClick={() => setSelectedId(l.id)}
                className={`w-full text-left px-3 py-2 rounded border ${selectedId === l.id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{l.name}</span>
                  <div className="flex gap-1">
                    {l.isDefault && <Badge variant="outline" className="text-xs"><Star className="h-3 w-3 mr-1" />default</Badge>}
                    <Badge variant="outline" className="text-xs">{l.type}</Badge>
                  </div>
                </div>
              </button>
            ))}
            <div className="pt-3 border-t space-y-2">
              <Label className="text-xs">New list</Label>
              <Input placeholder="Name (e.g. Gold)" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <div className="flex gap-2">
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tier">Tier (reusable)</SelectItem>
                    <SelectItem value="customer">Customer (private)</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => createMut.mutate()} disabled={!newName}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: editor */}
        <div className="lg:col-span-2 space-y-6">
          {selectedId === null ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Select a price list to edit its rules.</CardContent></Card>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{detail?.list.name}</CardTitle>
                    <CardDescription>Margin on cost. A fixed price overrides the margin.</CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/api/admin/price-lists/${selectedId}/download?format=xlsx`}><FileSpreadsheet className="h-4 w-4 mr-1" /> Excel</a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/api/admin/price-lists/${selectedId}/download?format=pdf`}><FileText className="h-4 w-4 mr-1" /> PDF</a>
                    </Button>
                    {!detail?.list.isDefault && (
                      <Button variant="ghost" size="sm" onClick={() => deleteMut.mutate(selectedId)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Level</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead className="w-28">Margin %</TableHead>
                        <TableHead className="w-28">Fixed £</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Select value={r.level} onValueChange={(v) => updateRule(i, { level: v, targetId: null })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {r.level === "overall" ? <span className="text-muted-foreground text-sm">all products</span>
                              : r.level === "brand" ? (
                                <Select value={r.targetId ? String(r.targetId) : ""} onValueChange={(v) => updateRule(i, { targetId: Number(v) })}>
                                  <SelectTrigger><SelectValue placeholder="brand" /></SelectTrigger>
                                  <SelectContent>{brands.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
                                </Select>
                              ) : r.level === "category" ? (
                                <Select value={r.targetId ? String(r.targetId) : ""} onValueChange={(v) => updateRule(i, { targetId: Number(v) })}>
                                  <SelectTrigger><SelectValue placeholder="category" /></SelectTrigger>
                                  <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                                </Select>
                              ) : (
                                <Input type="number" placeholder="product ID" value={r.targetId ?? ""} onChange={(e) => updateRule(i, { targetId: e.target.value ? Number(e.target.value) : null })} />
                              )}
                          </TableCell>
                          <TableCell>
                            <Input type="number" placeholder="%" value={r.marginPercent ?? ""} disabled={!!r.fixedPrice}
                              onChange={(e) => updateRule(i, { marginPercent: e.target.value })} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" placeholder="£" value={r.fixedPrice ?? ""}
                              onChange={(e) => updateRule(i, { fixedPrice: e.target.value || null })} />
                          </TableCell>
                          <TableCell><Button variant="ghost" size="sm" onClick={() => removeRule(i)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" onClick={addRule}><Plus className="h-4 w-4 mr-1" /> Add rule</Button>
                    <Button size="sm" onClick={() => saveRulesMut.mutate()} disabled={saveRulesMut.isPending}>
                      {saveRulesMut.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save rules
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Live preview */}
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5" /> Live price preview</CardTitle>
                  <CardDescription>What the customer would pay on this list.</CardDescription></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Select value={previewBrand} onValueChange={setPreviewBrand}>
                      <SelectTrigger className="w-64"><SelectValue placeholder="Pick a brand to preview" /></SelectTrigger>
                      <SelectContent>{brands.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button variant="secondary" onClick={runPreview} disabled={!previewBrand}>Preview</Button>
                  </div>
                  {previewRows.length > 0 && (
                    <Table>
                      <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Cost</TableHead><TableHead className="text-right">Customer price</TableHead><TableHead>Rule</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {previewRows.map((p, i) => (
                          <TableRow key={i}>
                            <TableCell className="max-w-[260px] truncate">{p.name}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{money(p.cost)}</TableCell>
                            <TableCell className="text-right font-semibold">{p.price === null ? "on request" : money(p.price)}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{p.fixed ? "fixed" : p.level ?? "—"}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Customer assignment */}
      <Card>
        <CardHeader><CardTitle>Customer assignments</CardTitle><CardDescription>Each customer should have a price list, or they see "price on request".</CardDescription></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Email</TableHead><TableHead>Status</TableHead><TableHead className="w-64">Price list</TableHead></TableRow></TableHeader>
            <TableBody>
              {customers.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No customers yet</TableCell></TableRow>}
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.companyName ?? "—"}</TableCell>
                  <TableCell className="text-xs">{c.email}</TableCell>
                  <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                  <TableCell>
                    <Select value={c.priceListId ? String(c.priceListId) : "none"}
                      onValueChange={(v) => assignMut.mutate({ userId: c.id, priceListId: v === "none" ? null : Number(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— none —</SelectItem>
                        {lists.map((l) => <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
