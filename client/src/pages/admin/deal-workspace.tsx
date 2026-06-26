import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { ArrowLeft, FileText, ClipboardList, Download, Printer, Building2, Mail, Phone, ListChecks, Plus, Trash2, Save, Send, Check, X, Loader2 } from "lucide-react";

// E2 — Deal Workspace. A quote/order opened from Sales. Quotes that are still
// pending/quoted are editable: the salesman prices the lines, sets validity + a
// message, sends the quote, and records accept/decline (accept creates the order).

const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  submitted: { label: "New order", variant: "secondary" }, confirmed: { label: "To fulfil", variant: "default" },
  processing: { label: "Processing", variant: "default" }, completed: { label: "Completed", variant: "outline" },
  entered: { label: "Entered ✓", variant: "outline" }, cancelled: { label: "Cancelled", variant: "destructive" },
  pending: { label: "Quote: to price", variant: "secondary" }, quoted: { label: "Quote: sent", variant: "default" },
  accepted: { label: "Quote: accepted", variant: "default" }, declined: { label: "Quote: declined", variant: "destructive" },
  closed: { label: "Quote: closed", variant: "outline" },
};
const money = (v: any) => (v == null || v === "" ? "—" : `£${Number(v).toFixed(2)}`);
const fmt = (d: any) => (d ? format(new Date(d), "d MMM yyyy, HH:mm") : null);

interface EditLine { description: string; ean: string; quantity: number; unitPrice: string; unitCost: string; productId: number | null; priceListItemId: number | null }

export default function DealWorkspacePage() {
  const params = useParams();
  const kind = (params.kind === "order" ? "order" : "quote") as "order" | "quote";
  const id = Number(params.id);
  const { toast } = useToast();
  const qKey = kind === "order" ? `/api/admin/orders/${id}` : `/api/admin/quotes/${id}`;

  const { data, isLoading, error } = useQuery<any>({ queryKey: [qKey] });

  const [lines, setLines] = useState<EditLine[]>([]);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [expiry, setExpiry] = useState("");
  const [internalNote, setInternalNote] = useState("");

  const isOrder = kind === "order";
  const root = data ? (isOrder ? data.order : data) : null;
  const status = root?.status as string;
  const editable = !isOrder && ["pending", "quoted"].includes(status);

  // Seed editable line state once data arrives.
  useEffect(() => {
    if (!data || isOrder) return;
    setLines((data.items || []).map((it: any) => ({
      description: it.description ?? it.product?.productName ?? "",
      ean: it.ean ?? "",
      quantity: it.quantity ?? 1,
      unitPrice: it.unitPrice != null ? String(it.unitPrice) : "",
      unitCost: it.unitCost != null ? String(it.unitCost) : "",
      productId: it.productId ?? null,
      priceListItemId: it.priceListItemId ?? null,
    })));
    setInternalNote(data.adminNotes ?? "");
    if (data.expiryDate) setExpiry(String(data.expiryDate).slice(0, 10));
    setDirty(false);
  }, [data, isOrder]);

  const saveItems = useMutation({
    mutationFn: async () => apiRequest("PUT", `/api/admin/quotes/${id}/items`, { items: lines.map((l) => ({ ...l, unitPrice: l.unitPrice === "" ? null : Number(l.unitPrice), unitCost: l.unitCost === "" ? null : Number(l.unitCost) })) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [qKey] }); setDirty(false); toast({ title: "Prices saved" }); },
    onError: (e: any) => toast({ title: "Couldn't save", description: e?.message, variant: "destructive" }),
  });
  const sendQuote = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/admin/quotes/${id}/send`, { message, expiryDate: expiry || null, adminNotes: internalNote }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [qKey] }); toast({ title: "Quote sent to customer" }); },
    onError: (e: any) => toast({ title: "Couldn't send", description: e?.message, variant: "destructive" }),
  });
  const setStatus = useMutation({
    mutationFn: async (s: "accepted" | "declined") => apiRequest("PATCH", `/api/admin/quotes/${id}`, { status: s }),
    onSuccess: async (res) => {
      const body = await res.json();
      queryClient.invalidateQueries({ queryKey: [qKey] });
      toast({ title: body.status === "accepted" ? `Accepted — order O-${body.orderId} created` : "Quote declined" });
    },
    onError: (e: any) => toast({ title: "Action failed", description: e?.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="space-y-6"><div className="h-40 animate-pulse rounded-lg bg-muted/40" /></div>;
  if (error || !data || !root) return (<div className="space-y-6"><BackLink /><Card><CardContent className="py-10 text-center text-muted-foreground">Couldn't load this {kind}.</CardContent></Card></div>);

  const customer = data.customer;
  const ref = `${isOrder ? "O" : "Q"}-${root.id}`;
  const value = isOrder ? root.totalAmount : root.totalEstimate;
  const badge = statusBadge[status] || { label: status, variant: "secondary" as const };

  // Read-only lines for orders + non-editable quotes.
  const roLines = (data.items || []).map((it: any) => ({
    name: isOrder ? (it.productName || it.description || it.ean || "Item") : (it.description || it.product?.productName || it.ean || "Item"),
    ean: it.ean ?? null, quantity: it.quantity, unitCost: it.unitCost, marginApplied: it.marginApplied, unitPrice: it.unitPrice, lineTotal: it.lineTotal,
  }));

  const liveTotal = lines.reduce((s, l) => s + (l.unitPrice === "" ? 0 : Number(l.unitPrice) * l.quantity), 0);
  const marginOf = (price: string, cost: string) => (price !== "" && cost !== "" && Number(cost) > 0 ? `${(((Number(price) - Number(cost)) / Number(cost)) * 100).toFixed(1)}%` : "—");

  const updateLine = (i: number, patch: Partial<EditLine>) => { setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l))); setDirty(true); };
  const addLine = () => { setLines((prev) => [...prev, { description: "", ean: "", quantity: 1, unitPrice: "", unitCost: "", productId: null, priceListItemId: null }]); setDirty(true); };
  const removeLine = (i: number) => { setLines((prev) => prev.filter((_, idx) => idx !== i)); setDirty(true); };

  const timeline: { label: string; at: any }[] = [
    { label: isOrder ? "Order created" : "Quote requested", at: root.createdAt },
    ...(root.respondedAt ? [{ label: "Responded to customer", at: root.respondedAt }] : []),
    ...(root.enteredToInventoryAt ? [{ label: "Entered into inventory", at: root.enteredToInventoryAt }] : []),
    ...(root.archivedAt ? [{ label: "Archived", at: root.archivedAt }] : []),
  ].filter((e) => e.at);

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>{ref}</h1>
            <Badge variant="outline" className="gap-1">{isOrder ? <ClipboardList className="h-3 w-3" /> : <FileText className="h-3 w-3" />}{isOrder ? "Sales order" : "Quote"}</Badge>
            <Badge variant={badge.variant}>{badge.label}</Badge>
          </div>
          <p className="mt-1 text-muted-foreground">
            {customer?.companyName || customer?.email || `Customer #${root.userId}`}
            {root.quoteId ? <span className="ml-2 text-sm">↳ from Q-{root.quoteId}</span> : null}
            {" · "}Created {fmt(root.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isOrder ? (
            <Button variant="outline" onClick={() => window.open(`/api/admin/orders/${root.id}/export`, "_blank")}><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
          ) : (
            <Link href={`/quotes/${root.id}/print`}><Button variant="outline"><Printer className="h-4 w-4 mr-2" /> Print / PDF</Button></Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-lg"><ListChecks className="h-5 w-5" /> {editable ? "Price the items" : "Items"} ({(editable ? lines : roLines).length})</CardTitle>
              {editable && <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-4 w-4 mr-1" /> Add line</Button>}
            </CardHeader>
            <CardContent className="p-0">
              {editable ? (
                <>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Item</TableHead><TableHead className="w-24">EAN</TableHead><TableHead className="w-16 text-right">Qty</TableHead>
                      <TableHead className="w-24 text-right">Cost</TableHead><TableHead className="w-16 text-right">Margin</TableHead><TableHead className="w-24 text-right">Unit price</TableHead>
                      <TableHead className="w-24 text-right">Line</TableHead><TableHead className="w-8" />
                    </TableRow></TableHeader>
                    <TableBody>
                      {lines.map((l, i) => (
                        <TableRow key={i}>
                          <TableCell><Input value={l.description} placeholder="Description" onChange={(e) => updateLine(i, { description: e.target.value })} /></TableCell>
                          <TableCell><Input value={l.ean} placeholder="EAN" onChange={(e) => updateLine(i, { ean: e.target.value })} /></TableCell>
                          <TableCell><Input type="number" min={1} className="text-right" value={l.quantity} onChange={(e) => updateLine(i, { quantity: Math.max(1, Number(e.target.value) || 1) })} /></TableCell>
                          <TableCell><Input type="number" min={0} step="0.01" className="text-right" value={l.unitCost} placeholder="—" onChange={(e) => updateLine(i, { unitCost: e.target.value })} /></TableCell>
                          <TableCell className="text-right text-muted-foreground text-sm">{marginOf(l.unitPrice, l.unitCost)}</TableCell>
                          <TableCell><Input type="number" min={0} step="0.01" className="text-right" value={l.unitPrice} placeholder="On request" onChange={(e) => updateLine(i, { unitPrice: e.target.value })} /></TableCell>
                          <TableCell className="text-right font-medium">{l.unitPrice === "" ? "—" : money(Number(l.unitPrice) * l.quantity)}</TableCell>
                          <TableCell><Button variant="ghost" size="icon" onClick={() => removeLine(i)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex items-center justify-between border-t p-4">
                    <Button onClick={() => saveItems.mutate()} disabled={!dirty || saveItems.isPending}>{saveItems.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save prices</Button>
                    <div className="flex gap-6"><span className="text-muted-foreground">Estimated total</span><span className="text-lg font-bold">{money(liveTotal)}</span></div>
                  </div>
                </>
              ) : (
                <>
                  <Table>
                    <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>EAN</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Cost</TableHead><TableHead className="text-right">Margin</TableHead><TableHead className="text-right">Unit price</TableHead><TableHead className="text-right">Line total</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {roLines.length === 0 ? (<TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No line items.</TableCell></TableRow>) : roLines.map((l: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium max-w-[260px] truncate">{l.name}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{l.ean || "—"}</TableCell>
                          <TableCell className="text-right">{l.quantity}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{money(l.unitCost)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{l.marginApplied != null ? `${Number(l.marginApplied).toFixed(1)}%` : "—"}</TableCell>
                          <TableCell className="text-right">{l.unitPrice == null ? <Badge variant="outline">On request</Badge> : money(l.unitPrice)}</TableCell>
                          <TableCell className="text-right font-medium">{money(l.lineTotal)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex justify-end gap-8 border-t p-4"><span className="text-muted-foreground">{isOrder ? "Order total" : "Estimated total"}</span><span className="text-lg font-bold">{money(value)}</span></div>
                </>
              )}
            </CardContent>
          </Card>

          {/* E2: send / respond panel for editable quotes */}
          {editable && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Send & respond</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><label className="text-sm font-medium">Valid until</label><Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></div>
                </div>
                <div><label className="text-sm font-medium">Message to customer (sent with the quote)</label><Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g. Pleased to quote as below; prices held until the validity date." /></div>
                <div><label className="text-sm font-medium">Internal note (private)</label><Textarea value={internalNote} onChange={(e) => setInternalNote(e.target.value)} placeholder="Notes for the team — not shown to the customer." /></div>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => sendQuote.mutate()} disabled={sendQuote.isPending || dirty} title={dirty ? "Save prices first" : undefined}>{sendQuote.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />} {status === "quoted" ? "Re-send quote" : "Send quote"}</Button>
                  {status === "quoted" && (<>
                    <Button variant="outline" onClick={() => setStatus.mutate("accepted")} disabled={setStatus.isPending}><Check className="h-4 w-4 mr-2" /> Mark accepted</Button>
                    <Button variant="outline" onClick={() => setStatus.mutate("declined")} disabled={setStatus.isPending}><X className="h-4 w-4 mr-2" /> Mark declined</Button>
                  </>)}
                </div>
                {dirty && <p className="text-xs text-amber-600">You have unsaved price changes — save before sending.</p>}
              </CardContent>
            </Card>
          )}

          {!editable && (root.customerNotes || root.adminNotes || root.adminResponse) && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Notes</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {root.customerNotes && <div><div className="text-xs uppercase text-muted-foreground mb-1">From customer</div><p className="whitespace-pre-wrap">{root.customerNotes}</p></div>}
                {root.adminResponse && <div><div className="text-xs uppercase text-muted-foreground mb-1">Reply sent</div><p className="whitespace-pre-wrap">{root.adminResponse}</p></div>}
                {root.adminNotes && <div><div className="text-xs uppercase text-muted-foreground mb-1">Internal note</div><p className="whitespace-pre-wrap">{root.adminNotes}</p></div>}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Building2 className="h-5 w-5" /> Customer</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="font-medium">{customer?.companyName || "—"}</div>
              {customer?.primaryContactName && <div className="text-muted-foreground">{customer.primaryContactName}</div>}
              {customer?.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> <a className="hover:underline" href={`mailto:${customer.email}`}>{customer.email}</a></div>}
              {(customer?.phoneNumber || customer?.phone) && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> {customer.phoneNumber || customer.phone}</div>}
              {customer?.id && <Link href={`/admin/users?id=${customer.id}`}><Button variant="ghost" size="sm" className="px-0 mt-1">View account →</Button></Link>}
            </CardContent>
          </Card>
          {root.expiryDate && !editable && <Card><CardContent className="p-4 text-sm"><span className="text-muted-foreground">Valid until </span>{fmt(root.expiryDate)}</CardContent></Card>}
          <Card>
            <CardHeader><CardTitle className="text-lg">Activity</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {timeline.map((e, i) => (<div key={i} className="flex items-start gap-3 text-sm"><div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" /><div><div>{e.label}</div><div className="text-xs text-muted-foreground">{fmt(e.at)}</div></div></div>))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function BackLink() {
  return (<Link href="/admin/sales"><Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" /> Back to Sales</Button></Link>);
}
