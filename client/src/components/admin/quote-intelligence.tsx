import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronUp, RefreshCw, Loader2, Database, AlertTriangle } from "lucide-react";
import { validCost, sellingPriceFromMarkup, type CostOption, type TradeIntelligence, type HistoryLine, type PricingSource } from "@shared/trade-intelligence";

const money = (value: unknown, currency = "GBP") => value == null || value === "" || !Number.isFinite(Number(value)) ? "—" :
  new Intl.NumberFormat("en-GB", { style: "currency", currency: /^[A-Z]{3}$/.test(currency) ? currency : "GBP" }).format(Number(value));
const date = (value: string | null | undefined) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Date not recorded";
const sourceLabel = (source: string) => source === "last_purchase" ? "Last recorded purchase" : source === "inventory_batch" ? "Stock batch cost" : "Supplier offer";

export function QuoteIntelligence({ quoteId, ean, quantity, currentCost, currentPrice, savedSource, onApply }: {
  quoteId: number; ean: string; quantity: number; currentCost: string; currentPrice: string; savedSource?: PricingSource | null;
  onApply: (update: { unitCost?: string; unitPrice?: string; sourceToken?: string | null; pricingSource?: PricingSource | null }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CostOption | null>(null);
  const [sell, setSell] = useState("");
  const [markup, setMarkup] = useState("");
  const barcode = ean.replace(/\s/g, "");
  const validEan = /^\d{8,14}$/.test(barcode);
  const query = useQuery<TradeIntelligence>({
    queryKey: ["/api/admin/quotes", quoteId, "intelligence", barcode],
    queryFn: async () => {
      const response = await fetch(`/api/admin/quotes/${quoteId}/intelligence?ean=${encodeURIComponent(barcode)}`, { credentials: "include" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Inventory lookup failed");
      return body;
    },
    enabled: open && validEan, staleTime: 60_000, retry: false, refetchOnWindowFocus: false,
  });
  useEffect(() => { setSelected(null); setSell(currentPrice); setMarkup(""); }, [barcode, quoteId]);
  useEffect(() => { setSelected(null); }, [query.data?.fetchedAt]);
  const data = query.data;
  const stalePrice = (p: CostOption) => !p.priceDate || Date.now() - Date.parse(p.priceDate) > 90 * 86400000;
  const selectedCost = selected?.unitCost ?? currentCost;
  const canApply = !!selected && validCost(selected) && !!selected.token && sell.trim() !== "" && Number.isFinite(Number(sell)) && Number(sell) >= 0;
  const profit = selectedCost !== "" && sell !== "" ? Number(sell) - Number(selectedCost) : null;
  const grossMargin = profit != null && Number(sell) > 0 ? profit / Number(sell) * 100 : null;
  const guidance = data?.pricing?.recommendations;
  const choose = (p: CostOption) => { setSelected(p); setSell(currentPrice); setMarkup(""); };

  return <div className="rounded-lg border bg-background">
    <Button type="button" variant="ghost" className="w-full justify-between text-left h-auto py-3" onClick={() => setOpen(v => !v)} aria-expanded={open}>
      <span className="flex items-center gap-2"><Database className="h-4 w-4" />Product intelligence <span className="hidden sm:inline text-xs font-normal text-muted-foreground">Prices, stock & history</span></span>
      {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </Button>
    {!open && savedSource && <p className="px-4 pb-3 text-xs text-muted-foreground">Cost source: {savedSource.supplierName || sourceLabel(savedSource.source)} · {date(savedSource.priceDate)}</p>}
    {open && <div className="border-t p-4 space-y-4">
      {!validEan ? <p className="text-sm text-muted-foreground">Enter the product’s EAN above to look up inventory.</p> : <>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{data ? `Checked ${new Date(data.fetchedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · Staff only` : "Inventory app · Staff only"}</span>
          <Button type="button" size="sm" variant="ghost" disabled={query.isFetching} onClick={() => query.refetch()}><RefreshCw className={`h-3 w-3 mr-1 ${query.isFetching ? "animate-spin" : ""}`} />Refresh</Button>
        </div>
        {query.isFetching && !data && <div className="flex items-center gap-2 py-4 text-sm"><Loader2 className="h-4 w-4 animate-spin" />Checking inventory records…</div>}
        {query.error && <p role="alert" className="rounded-md bg-amber-50 text-amber-900 p-3 text-sm">{query.error.message}</p>}
        {data && !query.error && <>
          <div><p className="font-medium">{data.product.name}</p><p className="text-xs text-muted-foreground">{data.product.brand || "Brand not recorded"} · {data.product.packSize || "Pack not recorded"}{data.product.caseSize ? ` · ${data.product.caseSize} per case` : ""}</p></div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {[['Recorded stock', data.inventory.onHand], ['Open order demand', data.inventory.allocated], ['Balance after orders', data.inventory.available], ['Incoming units', data.inventory.incoming]].map(([label, value]) => <div key={String(label)} className="rounded-md bg-muted/40 p-3"><p className="text-[11px] text-muted-foreground">{label}</p><p className={`text-xl font-semibold ${Number(value) < 0 ? "text-destructive" : ""}`}>{value}</p></div>)}
          </div>
          {data.inventory.available < quantity && <p className="text-sm text-amber-900 bg-amber-50 p-3 rounded-md flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />Stock balance does not cover the requested {quantity} units. Confirm sourcing and lead time before quoting.</p>}
          <p className="text-xs text-muted-foreground">Recorded stock is indicative. Confirm batch expiry, quarantine and allocation before promising delivery. A quotation does not reserve stock.</p>
          {data.warnings.map((w, i) => <p key={i} className="text-sm text-amber-800">{w}</p>)}
          <Tabs defaultValue="prices">
            <TabsList className="flex flex-wrap h-auto justify-start"><TabsTrigger value="prices">Costs</TabsTrigger><TabsTrigger value="history">Trading history</TabsTrigger><TabsTrigger value="guidance">Pricing guidance</TabsTrigger></TabsList>
            <TabsContent value="prices" className="space-y-2">
              <p className="text-xs text-muted-foreground">Review the date, pack and supplier terms. Prices are per unit; other currencies require manual conversion. No cost is selected automatically.</p>
              {!data.costOptions.length && <p className="py-4 text-sm text-muted-foreground">No supplier or purchase cost recorded for this EAN. Enter a confirmed cost manually.</p>}
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {data.costOptions.map((p, i) => <div key={`${p.source}-${i}`} className={`rounded-md border p-3 ${selected === p ? "border-primary bg-primary/5" : ""}`}>
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-medium text-sm">{p.supplierName || "Supplier not recorded"}</p><p className="text-xs text-muted-foreground">{sourceLabel(p.source)} · {date(p.priceDate)}</p></div><strong className="text-sm whitespace-nowrap">{money(p.unitCost, p.currency)}</strong></div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {p.latestForSupplier && <Badge variant="outline">Latest offer</Badge>}
                    {stalePrice(p) && <Badge variant="outline" className="text-amber-800">Reconfirm price</Badge>}
                    {p.provisional && <Badge variant="outline">Receipt provisional</Badge>}
                    {p.reference && <span className="text-xs text-muted-foreground break-all">{p.reference}</span>}
                    <Button type="button" variant={selected === p ? "default" : "outline"} size="sm" className="ml-auto" disabled={!validCost(p) || !p.token || query.isFetching} onClick={() => choose(p)}>{selected === p ? "Selected" : p.currency !== "GBP" ? "Convert manually" : "Select cost"}</Button>
                  </div>{p.comments && <p className="text-xs mt-2 text-muted-foreground whitespace-pre-wrap">{p.comments}</p>}
                </div>)}
              </div>
            </TabsContent>
            <TabsContent value="history" className="space-y-4">
              <History title="This customer — invoiced sales" rows={data.customerSales} empty={data.customerLinked ? "No invoiced sales found for this customer and EAN." : "Customer is not linked to an inventory account yet; no customer match is assumed."} />
              <History title="Recent invoiced sales" rows={data.sales} empty="No invoiced sales recorded." />
              <History title="Purchases — receipts and purchase orders" rows={data.purchases} empty="No purchase history recorded." />
            </TabsContent>
            <TabsContent value="guidance" className="space-y-3 text-sm">
              {data.customerPrice?.price != null ? <div className="rounded-md border p-3 flex flex-wrap justify-between items-center gap-2"><span>Customer’s prepared price <strong>{money(data.customerPrice.price)}</strong><span className="block text-xs text-muted-foreground">{data.customerPrice.scope} price list #{data.customerPrice.listId}</span></span><Button type="button" size="sm" variant="outline" onClick={() => setSell(Number(data.customerPrice!.price).toFixed(2))}>Use selling price</Button></div> : <p className="text-muted-foreground">No prepared customer price found for this EAN.</p>}
              {guidance && Number(guidance.optimalPricePoint) > 0 ? <div className="rounded-md border p-3 space-y-2"><p>App’s indicative range: <strong>{money(guidance.suggestedMinPrice)}–{money(guidance.suggestedMaxPrice)}</strong></p><p className="text-xs text-muted-foreground">{data.pricing?.reasoning} · Check against your selected cost.</p><Button type="button" size="sm" variant="outline" onClick={() => setSell(Number(guidance.optimalPricePoint).toFixed(2))}>Use indicative selling price {money(guidance.optimalPricePoint)}</Button></div> : <p className="text-muted-foreground">Insufficient reliable data for a selling-price suggestion.</p>}
              {data.pricing?.dealPerformance && <p className="text-xs text-muted-foreground">Recorded deals: {data.pricing.dealPerformance.wonDeals} won · {data.pricing.dealPerformance.lostDeals} lost. Historical results do not guarantee today’s price.</p>}
            </TabsContent>
          </Tabs>
          <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
            <p className="text-sm font-medium">Prepare this quote line</p>
            <p className="text-xs text-muted-foreground">{selected ? `${sourceLabel(selected.source)}: ${money(selected.unitCost)} · ${selected.supplierName || "Unknown supplier"}` : "Select a cost above, or keep the cost entered on the quote."}</p>
            <div className="grid grid-cols-2 gap-3"><label className="text-xs">Markup on cost %<Input type="number" min={0} step="0.1" value={markup} placeholder="Enter markup" onChange={e => { setMarkup(e.target.value); const price = sellingPriceFromMarkup(selectedCost, e.target.value); if (price) setSell(price); }} /></label><label className="text-xs">Selling price £ / unit<Input type="number" min={0} step="0.01" value={sell} placeholder="Confirm price" onChange={e => { setSell(e.target.value); setMarkup(""); }} /></label></div>
            {profit != null && Number.isFinite(profit) && <p className={`text-xs ${profit < 0 ? "text-destructive font-medium" : "text-muted-foreground"}`}>Profit per unit {money(profit)}{grossMargin != null ? ` · Gross margin ${grossMargin.toFixed(1)}%` : ""}{profit < 0 ? " — selling below cost" : ""}</p>}
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={!canApply || query.isFetching} onClick={() => { onApply({ unitCost: Number(selected!.unitCost).toFixed(2), unitPrice: Number(sell).toFixed(2), sourceToken: selected!.token!, pricingSource: null }); }}>Apply cost & price to quote</Button>
              {selected && <Button type="button" size="sm" variant="outline" disabled={!validCost(selected) || !selected.token || query.isFetching} onClick={() => onApply({ unitCost: Number(selected.unitCost).toFixed(2), sourceToken: selected.token!, pricingSource: null })}>Apply cost only</Button>}
              {!selected && <Button type="button" size="sm" variant="outline" disabled={!sell.trim() || !Number.isFinite(Number(sell)) || Number(sell) < 0 || query.isFetching} onClick={() => onApply({ unitPrice: Number(sell).toFixed(2) })}>Apply selling price</Button>}
            </div><p className="text-xs text-muted-foreground">Then use “Save prices” on the quote. Sending remains a separate action.</p>
          </div>
          {savedSource && <p className="text-xs text-muted-foreground">Saved cost source: {savedSource.supplierName || sourceLabel(savedSource.source)} · {date(savedSource.priceDate)} · recorded {date(savedSource.appliedAt)}</p>}
        </>}
      </>}
    </div>}
  </div>;
}

function History({ title, rows, empty }: { title: string; rows: HistoryLine[]; empty: string }) {
  return <div><h4 className="text-sm font-medium mb-2">{title}</h4>{!rows?.length ? <p className="text-xs text-muted-foreground">{empty}</p> : <div className="max-h-60 overflow-auto"><table className="w-full text-xs"><thead><tr className="text-left text-muted-foreground"><th className="p-2">Date / reference</th><th className="p-2">Account</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Unit price</th></tr></thead><tbody>{rows.map((r, i) => <tr key={i} className="border-t"><td className="p-2">{date(r.date)}<span className="block text-muted-foreground">{r.source ? `${r.source} · ` : ""}{r.reference}</span></td><td className="p-2">{r.customerName || r.supplierName || "—"}</td><td className="p-2 text-right">{r.quantity}</td><td className="p-2 text-right whitespace-nowrap">{money(r.unitPrice ?? r.unitCost, r.currency)}</td></tr>)}</tbody></table></div>}</div>;
}
