import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { usePortalBasket } from "@/lib/portal-basket";
import { useToast } from "@/hooks/use-toast";
import { Search, ShoppingCart, Loader2, Info, ChevronLeft, ChevronRight, PackageX, ImageIcon } from "lucide-react";

interface Brand { id: number; name: string; }
interface Category { id: number; name: string; }
interface PortalProductRow {
  itemId: number; brandId: number | null; brandName: string | null;
  description: string | null; ean: string | null; caseSize: string | null;
  price: number | null; availability: string; availableQty: number | null; imageUrl?: string | null;
}
interface PortalResponse { products: PortalProductRow[]; total: number; page: number; pageSize: number; hasPriceList: boolean; }

function StockBadge({ a, qty }: { a: string; qty: number | null }) {
  if (a === "in_stock") return <Badge className="bg-green-100 text-green-800 whitespace-nowrap">{qty && qty < 20 ? `Low (${qty})` : "In stock"}</Badge>;
  if (a === "out_of_stock") return <Badge className="bg-red-100 text-red-700 whitespace-nowrap">Out of stock</Badge>;
  return <Badge variant="outline" className="whitespace-nowrap" title="Stock to be confirmed — add it and we'll confirm availability on your order/quote">Ask us</Badge>;
}

export default function PortalCataloguePage() {
  const { toast } = useToast();
  const { addItem } = usePortalBasket();
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [brand, setBrand] = useState("all");
  const [category, setCategory] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(1);
  // Quantities chosen this session, keyed by itemId, each holding a snapshot of the
  // product so the bulk "Add to basket" works even after paging away.
  const [lines, setLines] = useState<Record<number, { p: PortalProductRow; qty: number }>>({});
  const [zoom, setZoom] = useState<{ url: string; name: string } | null>(null);

  const { data: brands = [] } = useQuery<Brand[]>({ queryKey: ["/api/portal/brands"] });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/portal/categories"] });

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (brand !== "all") params.set("brand", brand);
  if (category !== "all") params.set("category", category);
  if (availability !== "all") params.set("availability", availability);
  params.set("sort", sort);
  params.set("page", String(page));

  const { data, isLoading } = useQuery<PortalResponse>({
    queryKey: ["/api/portal/products", params.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/portal/products?${params.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const products = data?.products ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const applySearch = () => { setSearch(searchInput); setPage(1); };
  const resetPage = () => setPage(1);
  const fmt = (n: number) => `£${n.toFixed(2)}`;

  function setLine(p: PortalProductRow, qty: number) {
    setLines((prev) => {
      const next = { ...prev };
      if (!qty || qty <= 0) delete next[p.itemId];
      else next[p.itemId] = { p, qty };
      return next;
    });
  }

  const picked = Object.values(lines);
  const lineCount = picked.length;
  const unitCount = picked.reduce((s, l) => s + l.qty, 0);
  const estTotal = picked.reduce((s, l) => s + (l.p.price ?? 0) * l.qty, 0);
  const hasUnpriced = picked.some((l) => l.p.price === null);

  function addAll() {
    for (const { p, qty } of picked) {
      addItem({ id: p.itemId, productName: p.description ?? "Item", sku: p.ean ?? "", imageUrl: p.imageUrl ?? null, price: p.price, availability: p.availability, availableQty: p.availableQty, caseSize: p.caseSize }, qty);
    }
    toast({ title: "Added to basket", description: `${unitCount} unit(s) across ${lineCount} line(s).` });
    setLines({});
  }

  return (
    <div className="space-y-4 pb-28">
      <div>
        <h1 className="text-2xl font-bold">Your Price List</h1>
        <p className="text-muted-foreground">These are <strong>your account prices</strong> for the brands assigned to you — the public site never shows pricing. Enter the quantities you want, then add the whole lot to your basket in one go.</p>
      </div>

      {/* Pricing terms — important for wholesale */}
      <div className="flex items-start gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
        <span>All prices are <strong>per unit</strong> and <strong>exclude VAT</strong>, duty, customs and delivery (ex-works). <strong>Case</strong> = units per case, for reference. Priced items can be ordered directly; anything marked <em>&ldquo;Request quote&rdquo;</em> goes to a quote.</span>
      </div>

      {data && !data.hasPriceList && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No price list assigned yet</AlertTitle>
          <AlertDescription>Your account doesn't have a price list yet, so items show &ldquo;price on request&rdquo;. Add what you need and request a quote, or contact us to set up your prices.</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-3 grid grid-cols-1 md:grid-cols-12 gap-2">
          <div className="md:col-span-4 flex gap-2">
            <Input placeholder="Search name, SKU or EAN" value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applySearch()} />
            <Button variant="secondary" onClick={applySearch}><Search className="h-4 w-4" /></Button>
          </div>
          <Select value={brand} onValueChange={(v) => { setBrand(v); resetPage(); }}>
            <SelectTrigger className="md:col-span-2"><SelectValue placeholder="Brand" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All brands</SelectItem>
              {brands.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={(v) => { setCategory(v); resetPage(); }}>
            <SelectTrigger className="md:col-span-2"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={availability} onValueChange={(v) => { setAvailability(v); resetPage(); }}>
            <SelectTrigger className="md:col-span-2"><SelectValue placeholder="Availability" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any availability</SelectItem>
              <SelectItem value="in_stock">In stock</SelectItem>
              <SelectItem value="on_request">Ask us</SelectItem>
              <SelectItem value="out_of_stock">Out of stock</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => { setSort(v); resetPage(); }}>
            <SelectTrigger className="md:col-span-2"><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="price-asc">Price: low to high</SelectItem>
              <SelectItem value="price-desc">Price: high to low</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <PackageX className="h-10 w-10 mb-2" /> No products match your filters.
        </div>
      ) : (
        <>
        {/* Mobile: stacked cards */}
        <div className="md:hidden space-y-2">
          {products.map((p) => {
            const inLine = lines[p.itemId]?.qty ?? "";
            return (
              <Card key={p.itemId} className={inLine ? "border-emerald-300" : ""}>
                <CardContent className="p-3 flex gap-3">
                  <button type="button" onClick={() => p.imageUrl && setZoom({ url: p.imageUrl, name: p.description ?? "" })}
                    className="h-16 w-16 rounded bg-muted/40 overflow-hidden flex items-center justify-center shrink-0"
                    title={p.imageUrl ? "Tap to enlarge" : "No image yet"}>
                    {p.imageUrl
                      ? <img src={p.imageUrl} alt="" loading="lazy" className="h-full w-full object-contain" />
                      : <ImageIcon className="h-5 w-5 text-muted-foreground/40" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm leading-snug">{p.description || "—"}</div>
                    <div className="text-xs text-muted-foreground">{[p.brandName, p.caseSize ? `Case ${p.caseSize}` : null].filter(Boolean).join(" · ")}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{p.ean || "—"}</div>
                    <div className="mt-2 flex items-end justify-between gap-2">
                      <div>
                        {p.price === null
                          ? <Badge variant="outline">Request quote</Badge>
                          : <div className="font-bold leading-none">{fmt(p.price)}<span className="text-[11px] font-normal text-muted-foreground"> /unit ex VAT</span></div>}
                        <div className="mt-1"><StockBadge a={p.availability} qty={p.availableQty} /></div>
                      </div>
                      <div className="text-right">
                        <label className="text-[10px] uppercase tracking-wide text-muted-foreground block">Qty</label>
                        <Input type="number" min={0} placeholder="0" inputMode="numeric"
                          className="h-9 w-20 text-center"
                          disabled={p.availability === "out_of_stock"}
                          value={inLine}
                          onChange={(e) => setLine(p, e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Desktop: table */}
        <Card className="hidden md:block">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead>
                <tr className="border-b bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="text-left font-semibold p-2 w-[56px]">Image</th>
                  <th className="text-left font-semibold p-2">Product</th>
                  <th className="text-left font-semibold p-2 w-[140px]">EAN</th>
                  <th className="text-center font-semibold p-2 w-[70px]">Case</th>
                  <th className="text-right font-semibold p-2 w-[130px]">Unit price<div className="font-normal normal-case text-[10px]">ex VAT</div></th>
                  <th className="text-center font-semibold p-2 w-[110px]">Availability</th>
                  <th className="text-center font-semibold p-2 w-[96px]">Qty</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const inLine = lines[p.itemId]?.qty ?? "";
                  return (
                    <tr key={p.itemId} className={`border-b last:border-0 hover:bg-muted/30 ${inLine ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""}`}>
                      <td className="p-2">
                        <button type="button" onClick={() => p.imageUrl && setZoom({ url: p.imageUrl, name: p.description ?? "" })}
                          className="h-11 w-11 rounded bg-muted/40 overflow-hidden flex items-center justify-center shrink-0"
                          title={p.imageUrl ? "Click to enlarge" : "No image yet"}>
                          {p.imageUrl
                            ? <img src={p.imageUrl} alt="" loading="lazy" className="h-full w-full object-contain cursor-zoom-in" />
                            : <ImageIcon className="h-4 w-4 text-muted-foreground/40" />}
                        </button>
                      </td>
                      <td className="p-2">
                        <div className="font-medium leading-snug">{p.description || "—"}</div>
                        {p.brandName && <div className="text-xs text-muted-foreground">{p.brandName}</div>}
                      </td>
                      <td className="p-2 font-mono text-xs text-muted-foreground">{p.ean || "—"}</td>
                      <td className="p-2 text-center text-xs">{p.caseSize || "—"}</td>
                      <td className="p-2 text-right">
                        {p.price === null
                          ? <Badge variant="outline" className="whitespace-nowrap">Request quote</Badge>
                          : <span className="font-semibold tabular-nums">{fmt(p.price)}</span>}
                      </td>
                      <td className="p-2 text-center"><StockBadge a={p.availability} qty={p.availableQty} /></td>
                      <td className="p-2 text-center">
                        <Input type="number" min={0} placeholder="0"
                          className="h-9 w-20 mx-auto text-center"
                          disabled={p.availability === "out_of_stock"}
                          value={inLine}
                          onChange={(e) => setLine(p, e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)))} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        </>
      )}

      {/* Pagination */}
      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages} · {data.total} products</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Sticky bulk add bar */}
      {lineCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
          <div className="mx-auto max-w-6xl flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="text-sm">
              <strong>{lineCount}</strong> line{lineCount === 1 ? "" : "s"} · <strong>{unitCount}</strong> unit{unitCount === 1 ? "" : "s"}
              <span className="text-muted-foreground"> · est. {fmt(estTotal)}{hasUnpriced && " + items on request"} (ex VAT)</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setLines({})}>Clear</Button>
              <Button onClick={addAll} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <ShoppingCart className="h-4 w-4 mr-2" /> Add {unitCount} to basket
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Image zoom */}
      <Dialog open={!!zoom} onOpenChange={(o) => { if (!o) setZoom(null); }}>
        <DialogContent className="max-w-2xl">
          {zoom && (
            <div className="space-y-2">
              <img src={zoom.url} alt={zoom.name} className="w-full max-h-[70vh] object-contain rounded" />
              <p className="text-center text-sm text-muted-foreground">{zoom.name}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
