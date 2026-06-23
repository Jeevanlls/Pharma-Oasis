import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { usePortalBasket } from "@/lib/portal-basket";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Trash2, ShoppingCart, ArrowLeft, Loader2, ClipboardCheck, FileText } from "lucide-react";

export default function PortalBasketPage() {
  const { items, updateQuantity, removeItem, clearBasket, total } = usePortalBasket();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState<"order" | "quote" | null>(null);
  const money = (n: number) => `£${n.toFixed(2)}`;
  const hasPOA = items.some((i) => i.product.price === null);

  async function submit(kind: "order" | "quote") {
    setSubmitting(kind);
    try {
      const payload = { items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })), customerNotes: notes || null };
      await apiRequest("POST", kind === "order" ? "/api/portal/orders" : "/api/portal/quotes", payload);
      clearBasket();
      queryClient.invalidateQueries({ queryKey: [kind === "order" ? "/api/portal/orders" : "/api/quotes"] });
      toast({
        title: kind === "order" ? "Order placed" : "Quote requested",
        description: kind === "order" ? "We've emailed you a confirmation and our team will be in touch." : "We'll confirm pricing & availability shortly.",
      });
      setLocation(kind === "order" ? "/portal/orders" : "/portal/quotes");
    } catch (e: any) {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 text-muted-foreground">
        <ShoppingCart className="h-12 w-12 mb-3" />
        <p className="mb-4">Your basket is empty.</p>
        <Link href="/portal"><Button><ArrowLeft className="h-4 w-4 mr-2" /> Browse catalogue</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Basket</h1>
        <Button variant="ghost" size="sm" onClick={clearBasket}><Trash2 className="h-4 w-4 mr-1" /> Clear</Button>
      </div>

      <Card>
        <CardContent className="p-0 divide-y">
          {items.map((i) => (
            <div key={i.product.id} className="flex items-center gap-4 p-4">
              <div className="h-14 w-14 bg-muted/40 rounded flex items-center justify-center overflow-hidden shrink-0">
                {i.product.imageUrl ? <img src={i.product.imageUrl} alt="" className="object-contain h-full w-full" /> : <ShoppingCart className="h-5 w-5 text-muted-foreground/40" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{i.product.productName}</div>
                <div className="text-xs text-muted-foreground">{i.product.packSize || i.product.sku}</div>
              </div>
              <Input type="number" min={1} className="w-20" value={i.quantity}
                onChange={(e) => updateQuantity(i.product.id, Math.max(1, Number(e.target.value)))} />
              <div className="w-28 text-right">
                {i.product.price === null
                  ? <Badge variant="outline">On request</Badge>
                  : <div className="font-semibold">{money(i.product.price * i.quantity)}</div>}
                {i.product.price !== null && <div className="text-xs text-muted-foreground">{money(i.product.price)} ea</div>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeItem(i.product.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center justify-between text-lg">
          <span>Estimated total</span>
          <span>{money(total)}{hasPOA && <span className="text-sm font-normal text-muted-foreground"> + items on request</span>}</span>
        </CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Textarea placeholder="Notes for our team (optional) — e.g. delivery date, PO number, special requests" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <p className="text-sm text-muted-foreground">
            Submit as an order, or as a quote/availability request. Our team confirms pricing and stock before anything is finalised.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={() => submit("order")} disabled={submitting !== null}>
              {submitting === "order" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ClipboardCheck className="h-4 w-4 mr-2" />}
              Place Order
            </Button>
            <Button size="lg" variant="outline" onClick={() => submit("quote")} disabled={submitting !== null}>
              {submitting === "quote" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              Request Quote / Availability
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
