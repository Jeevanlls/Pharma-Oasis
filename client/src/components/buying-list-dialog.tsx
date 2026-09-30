import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePortalBasket } from "@/lib/portal-basket";
import { parseBuyingList, resolveBuyingList } from "@/lib/buying-list";
import { useToast } from "@/hooks/use-toast";
export function BuyingListDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { addItem } = usePortalBasket();
  const { toast } = useToast();
  async function addList() {
    setError("");
    setBusy(true);
    try {
      const matches = await resolveBuyingList(
        parseBuyingList(raw),
        async (ean) => {
          const response = await fetch(
            `/api/portal/products?search=${encodeURIComponent(ean)}&page=1`,
            { credentials: "include" },
          );
          if (!response.ok)
            throw new Error(
              "Unable to check your catalogue. Please try again. Nothing has been added.",
            );
          const result = await response.json();
          return result.products;
        },
      );
      matches.forEach(({ product: p, quantity }) =>
        addItem(
          {
            id: p.itemId,
            productName: p.description || p.ean || "Product",
            sku: p.ean,
            price: p.price,
            imageUrl: p.imageUrl,
            availability: p.availability,
            caseSize: p.caseSize,
          },
          quantity,
        ),
      );
      toast({
        title: "Buying list added",
        description: `${matches.length} product lines added to your basket. Review prices and quantities before submitting.`,
      });
      setRaw("");
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to check the buying list. Nothing has been added.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!busy) onOpenChange(value);
      }}
    >
      <DialogContent className="po-design">
        <DialogTitle className="text-2xl">
          Start with your EAN list.
        </DialogTitle>
        <DialogDescription>
          Paste one EAN and quantity per line, separated by a comma or tab. Up
          to 50 lines. We’ll match your account catalogue before adding
          anything.
        </DialogDescription>
        <label htmlFor="buying-list" className="text-sm font-medium">
          EAN and quantity
        </label>
        <Textarea
          id="buying-list"
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          placeholder="EAN, quantity"
          rows={7}
          disabled={busy}
          maxLength={5000}
        />
        <p className="text-xs text-muted-foreground">
          Items without an account price can be included in a quote. Adding a
          list does not place an order.
        </p>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button onClick={() => void addList()} disabled={busy}>
          {busy ? "Checking your catalogue…" : "Add matched products to basket"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
