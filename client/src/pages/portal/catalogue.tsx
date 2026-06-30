import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { usePortalBasket } from "@/lib/portal-basket";
import { useToast } from "@/hooks/use-toast";
import { Search, ShoppingCart, Loader2, Info, ChevronLeft, ChevronRight, PackageX, Package } from "lucide-react";

interface Brand { id: number; name: string; }
interface Category { id: number; name: string; }
interface PortalProductRow {
  itemId: number; brandId: number | null; brandName: string | null;
  description: string | null; ean: string | null; caseSize: string | null;
  price: number | null; availability: string; availableQty: number | null; imageUrl?: string | null;
}
interface PortalResponse { products: PortalProductRow[]; total: number; page: number; pageSize: number; hasPriceList: boolean; }

const availabilityBadge = (a: string, qty: number | null) => {
  if (a === "in_stock") return <Badge className="bg-green-100 text-green-800">{qty && qty < 20 ? `Low (${qty})` : "In stock"}</Badge>;
  if (a === "out_of_stock") return <Badge className="bg-red-100 text-red-700">Out of stock</Badge>;
  return <Badge variant="outline">On request</Badge>;
};

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
  const [qty, setQty] = useState<Record<number, number>>({});

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

  const money = (n: number | null) => (n === null ? null : `£${n.toFixed(2)}`);

  const add = (p: PortalProductRow) => {
    const q = qty[p.itemId] || 1;
    addItem({ id: p.itemId, productName: p.description ?? "Item", sku: p.ean ?? "", imageUrl: p.imageUrl ?? null, price: p.price, availability: p.availability, availableQty: p.availableQty, caseSize: p.caseSize }, q);
    toast({ title: "Added to basket", description: `${q} × ${p.description ?? "item"}` });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Product Catalogue</h1>
        <p className="text-muted-foreground">Prices shown are your account prices. Add items to your basket to order or request a quote.</p>
      </div>

      {data && !data.hasPriceList && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>No price list assigned yet</AlertTitle>
          <AlertDescription>Your account doesn't have a price list, so items show "price on request". Please contact us and we'll set it up.</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-12 gap-3">
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
              <SelectItem value="on_request">On request</SelectItem>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((p) => (
            <Card key={p.itemId} className="flex flex-col overflow-hidden">
              <CardContent className="p-3 flex flex-col gap-2 flex-1">
                <div className="aspect-square w-full rounded-md bg-muted/40 overflow-hidden flex items-center justify-center">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.description ?? ""}
                      loading="lazy"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Image coming soon</span>
                  )}
                </div>
                <div className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">{p.description}</div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{p.brandName || p.caseSize || p.ean}</span>
                  {availabilityBadge(p.availability, p.availableQty)}
                </div>
                <div className="mt-auto">
                  {p.price === null ? (
                    <div className="text-sm font-semibold text-muted-foreground">Price on request</div>
                  ) : (
                    <div className="text-lg font-bold">{money(p.price)}</div>
                  )}
                  {p.caseSize && <div className="text-xs text-muted-foreground">Case: {p.caseSize}</div>}
                </div>
                <div className="flex gap-2">
                  <Input type="number" min={1} className="w-16 h-9" value={qty[p.itemId] ?? 1}
                    onChange={(e) => setQty({ ...qty, [p.itemId]: Math.max(1, Number(e.target.value)) })} />
                  <Button size="sm" className="flex-1" onClick={() => add(p)} disabled={p.availability === "out_of_stock"}>
                    <ShoppingCart className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
