import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { usePortalBasket } from "@/lib/portal-basket";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Loader2, Megaphone, PackageX } from "lucide-react";

interface PromoRow {
  itemId: number; description: string | null; ean: string | null; caseSize: string | null;
  price: number | null; availability: string; availableQty: number | null; onPromotion?: boolean;
}

export default function PortalPromotionsPage() {
  const { toast } = useToast();
  const { addItem } = usePortalBasket();
  const [qty, setQty] = useState<Record<number, number>>({});

  const { data, isLoading } = useQuery<{ products: PromoRow[] }>({
    queryKey: ["/api/portal/promotions"],
    queryFn: async () => {
      const res = await fetch("/api/portal/promotions", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const products = data?.products ?? [];
  const money = (n: number | null) => (n === null ? null : `£${n.toFixed(2)}`);

  const add = (p: PromoRow) => {
    const q = qty[p.itemId] || 1;
    addItem({ id: p.itemId, productName: p.description ?? "Item", sku: p.ean ?? "", imageUrl: null, price: p.price, availability: p.availability, availableQty: p.availableQty, caseSize: p.caseSize }, q);
    toast({ title: "Added to basket", description: `${q} × ${p.description ?? "item"}` });
  };

  return (
    <div className="space-y-5" data-testid="portal-promotions">
      <div className="flex items-center gap-2">
        <Megaphone className="h-6 w-6 text-emerald-600" />
        <div>
          <h1 className="text-2xl font-bold">Monthly Promotions</h1>
          <p className="text-muted-foreground">Limited-time offers. These prices apply while the promotion is live.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <PackageX className="h-10 w-10 mb-2" /> No promotions running right now. Check back soon.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((p) => (
            <Card key={p.itemId} className="flex flex-col overflow-hidden border-emerald-200">
              <CardContent className="p-3 flex flex-col gap-2 flex-1">
                <div className="flex items-center justify-between">
                  <Badge className="bg-emerald-100 text-emerald-800">Promotion</Badge>
                  {p.caseSize && <span className="text-xs text-muted-foreground">Case: {p.caseSize}</span>}
                </div>
                <div className="text-sm font-medium line-clamp-2 min-h-[2.5rem]">{p.description}</div>
                <div className="text-xs text-muted-foreground font-mono">{p.ean}</div>
                <div className="mt-auto">
                  {p.price === null ? (
                    <div className="text-sm font-semibold text-muted-foreground">Price on request</div>
                  ) : (
                    <div className="text-lg font-bold text-emerald-700">{money(p.price)}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input type="number" min={1} className="w-16 h-9" value={qty[p.itemId] ?? 1}
                    onChange={(e) => setQty({ ...qty, [p.itemId]: Math.max(1, Number(e.target.value)) })} />
                  <Button size="sm" className="flex-1" onClick={() => add(p)}>
                    <ShoppingCart className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
