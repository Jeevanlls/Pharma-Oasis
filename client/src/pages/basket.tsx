import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PublicLayout } from "@/components/layout/public-layout";
import { useBasket } from "@/lib/basket";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Trash2, ShoppingCart, ArrowLeft, Loader2, ClipboardCheck, FileText, LogIn } from "lucide-react";

// Unified basket + checkout (D2) — one shared basket for the public catalogue and
// the portal. Order is only offered when every line has a known price; otherwise
// the only action is "Request Quote" (the server prices on-request lines).
export default function BasketPage() {
  const { lines, setQty, remove, clear, total, allPriced } = useBasket();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState<"order" | "quote" | null>(null);
  const money = (n: number) => `£${n.toFixed(2)}`;
  const hasOnRequest = lines.some((l) => l.price === null);

  async function submit(kind: "order" | "quote") {
    setSubmitting(kind);
    try {
      const items = lines.map((l) => (l.kind === "portal" ? { itemId: l.refId, quantity: l.quantity } : { productId: l.refId, quantity: l.quantity }));
      await apiRequest("POST", kind === "order" ? "/api/portal/orders" : "/api/portal/quotes", { items, customerNotes: notes || null });
      clear();
      queryClient.invalidateQueries({ queryKey: [kind === "order" ? "/api/portal/orders" : "/api/quotes"] });
      toast({
        title: kind === "order" ? "Order placed" : "Quote requested",
        description: kind === "order" ? "We've emailed you a confirmation and our team will be in touch." : "We'll confirm pricing & availability shortly.",
      });
      setLocation(kind === "order" ? "/portal/orders" : "/my-quotes");
    } catch (e: any) {
      const msg = e?.message || "Please try again.";
      toast({ title: "Submission failed", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(null);
    }
  }

  if (lines.length === 0) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-4xl px-4 py-16 flex flex-col items-center text-muted-foreground">
          <ShoppingCart className="h-12 w-12 mb-3" />
          <p className="mb-4">Your basket is empty.</p>
          <div className="flex gap-3">
            <Link href="/products"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Browse products</Button></Link>
            {isAuthenticated && <Link href="/portal"><Button>Your price list</Button></Link>}
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Basket</h1>
        <Button variant="ghost" size="sm" onClick={clear}><Trash2 className="h-4 w-4 mr-1" /> Clear</Button>
      </div>

      <Card>
        <CardContent className="p-0 divide-y">
          {lines.map((l) => (
            <div key={l.key} className="flex items-center gap-4 p-4">
              <div className="h-14 w-14 bg-muted/40 rounded flex items-center justify-center overflow-hidden shrink-0">
                {l.imageUrl ? <img src={l.imageUrl} alt="" className="object-contain h-full w-full" /> : <ShoppingCart className="h-5 w-5 text-muted-foreground/40" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{l.name}</div>
                <div className="text-xs text-muted-foreground">{l.packSize || l.sku}</div>
              </div>
              <Input type="number" min={1} className="w-20" value={l.quantity} onChange={(e) => setQty(l.key, Math.max(1, Number(e.target.value)))} />
              <div className="w-28 text-right">
                {l.price === null ? <Badge variant="outline">On request</Badge> : <div className="font-semibold">{money(l.price * l.quantity)}</div>}
                {l.price !== null && <div className="text-xs text-muted-foreground">{money(l.price)} ea</div>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(l.key)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Estimated total</span>
            <span>{money(total)}{hasOnRequest && <span className="text-sm font-normal text-muted-foreground"> + items on request</span>}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isAuthenticated ? (
            <div className="rounded-md border bg-muted/30 p-4 text-sm">
              <p className="mb-3">Please sign in to submit your basket as an order or quote request.</p>
              <Link href="/login?redirect=/basket"><Button><LogIn className="h-4 w-4 mr-2" /> Sign in to continue</Button></Link>
            </div>
          ) : (
            <>
              <Textarea placeholder="Notes for our team (optional) — e.g. delivery date, PO number, special requests" value={notes} onChange={(e) => setNotes(e.target.value)} />
              {allPriced ? (
                <p className="text-sm text-muted-foreground">Place a firm order, or request a quote/availability first. Our team confirms stock before anything is finalised.</p>
              ) : (
                <p className="text-sm text-muted-foreground">Some items are <strong>priced on request</strong>. Request a quote and we'll price them for you — you can accept it to turn it into an order.</p>
              )}
              <div className="flex flex-wrap gap-3">
                <Button size="lg" onClick={() => submit("order")} disabled={submitting !== null || !allPriced} title={allPriced ? undefined : "Some items need a quote first"}>
                  {submitting === "order" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ClipboardCheck className="h-4 w-4 mr-2" />}
                  Place Order
                </Button>
                <Button size="lg" variant={allPriced ? "outline" : "default"} onClick={() => submit("quote")} disabled={submitting !== null}>
                  {submitting === "quote" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  Request Quote / Availability
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
    </PublicLayout>
  );
}
