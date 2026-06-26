import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ArrowLeft, FileText, ClipboardList, Download, Printer, Building2, Mail, Phone, ListChecks } from "lucide-react";

// E1 — Deal Workspace (visibility). One screen for a quote OR an order opened from
// the Sales worklist. Shows the customer + the requested line items + totals + a
// basic activity timeline. Pricing/send/documents actions arrive in E2/E3.

const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  submitted: { label: "New order", variant: "secondary" },
  confirmed: { label: "To fulfil", variant: "default" },
  processing: { label: "Processing", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
  entered: { label: "Entered ✓", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  pending: { label: "Quote: to price", variant: "secondary" },
  quoted: { label: "Quote: sent", variant: "default" },
  accepted: { label: "Quote: accepted", variant: "default" },
  declined: { label: "Quote: declined", variant: "destructive" },
  closed: { label: "Quote: closed", variant: "outline" },
};

const money = (v: any) => (v == null || v === "" ? "—" : `£${Number(v).toFixed(2)}`);
const fmt = (d: any) => (d ? format(new Date(d), "d MMM yyyy, HH:mm") : null);

interface Line { name: string; ean: string | null; quantity: number; unitCost: any; marginApplied: any; unitPrice: any; lineTotal: any }

export default function DealWorkspacePage() {
  const params = useParams();
  const kind = (params.kind === "order" ? "order" : "quote") as "order" | "quote";
  const id = Number(params.id);

  const { data, isLoading, error } = useQuery<any>({
    queryKey: [kind === "order" ? `/api/admin/orders/${id}` : `/api/admin/quotes/${id}`],
  });

  if (isLoading) return <div className="space-y-6"><div className="h-40 animate-pulse rounded-lg bg-muted/40" /></div>;
  if (error || !data) return (
    <div className="space-y-6">
      <BackLink />
      <Card><CardContent className="py-10 text-center text-muted-foreground">Couldn't load this {kind}.</CardContent></Card>
    </div>
  );

  // Normalise quote vs order into one view model.
  const isOrder = kind === "order";
  const root = isOrder ? data.order : data;
  const customer = data.customer;
  const ref = `${isOrder ? "O" : "Q"}-${root.id}`;
  const status = root.status as string;
  const value = isOrder ? root.totalAmount : root.totalEstimate;
  const lines: Line[] = (data.items || []).map((it: any) => ({
    name: isOrder ? (it.productName || it.description || it.ean || "Item") : (it.description || it.product?.productName || it.ean || "Item"),
    ean: it.ean ?? null,
    quantity: it.quantity,
    unitCost: it.unitCost,
    marginApplied: it.marginApplied,
    unitPrice: it.unitPrice,
    lineTotal: it.lineTotal,
  }));
  const badge = statusBadge[status] || { label: status, variant: "secondary" as const };

  const timeline: { label: string; at: any }[] = [
    { label: isOrder ? "Order created" : "Quote requested", at: root.createdAt },
    ...(root.respondedAt ? [{ label: "Responded to customer", at: root.respondedAt }] : []),
    ...(root.enteredToInventoryAt ? [{ label: "Entered into inventory", at: root.enteredToInventoryAt }] : []),
    ...(root.archivedAt ? [{ label: "Archived", at: root.archivedAt }] : []),
  ].filter((e) => e.at);

  return (
    <div className="space-y-6">
      <BackLink />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>{ref}</h1>
            <Badge variant="outline" className="gap-1">
              {isOrder ? <ClipboardList className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
              {isOrder ? "Sales order" : "Quote"}
            </Badge>
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
            <Button variant="outline" onClick={() => window.open(`/api/admin/orders/${root.id}/export`, "_blank")}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
          ) : (
            <Link href={`/quotes/${root.id}/print`}>
              <Button variant="outline"><Printer className="h-4 w-4 mr-2" /> Print / PDF</Button>
            </Link>
          )}
          {/* Temporary bridge until E2 brings pricing/respond into this workspace. */}
          <Link href={isOrder ? "/admin/orders" : "/admin/quotes"}>
            <Button variant="ghost" size="sm">Price / respond (classic)</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main: line items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><ListChecks className="h-5 w-5" /> Requested items ({lines.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>EAN</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">Unit price</TableHead>
                    <TableHead className="text-right">Line total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No line items.</TableCell></TableRow>
                  ) : lines.map((l, i) => (
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
              <div className="flex justify-end gap-8 border-t p-4">
                <span className="text-muted-foreground">{isOrder ? "Order total" : "Estimated total"}</span>
                <span className="text-lg font-bold">{money(value)}</span>
              </div>
            </CardContent>
          </Card>

          {(root.customerNotes || root.adminNotes || root.adminResponse) && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Notes</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {root.customerNotes && <div><div className="text-xs uppercase text-muted-foreground mb-1">From customer</div><p className="whitespace-pre-wrap">{root.customerNotes}</p></div>}
                {root.adminResponse && <div><div className="text-xs uppercase text-muted-foreground mb-1">Reply sent to customer</div><p className="whitespace-pre-wrap">{root.adminResponse}</p></div>}
                {root.adminNotes && <div><div className="text-xs uppercase text-muted-foreground mb-1">Internal note</div><p className="whitespace-pre-wrap">{root.adminNotes}</p></div>}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar: customer + timeline */}
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

          <Card>
            <CardHeader><CardTitle className="text-lg">Activity</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {timeline.map((e, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                  <div><div>{e.label}</div><div className="text-xs text-muted-foreground">{fmt(e.at)}</div></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/admin/sales">
      <Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" /> Back to Sales</Button>
    </Link>
  );
}
