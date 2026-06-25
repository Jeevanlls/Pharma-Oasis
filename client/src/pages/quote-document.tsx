import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";

// A clean, print-optimised quotation document. "Print / Save as PDF" uses the
// browser's print dialog (Save as PDF) — no server-side PDF library needed.
export default function QuoteDocumentPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAdmin, isAuthenticated } = useAuth();

  const { data, isLoading, error } = useQuery<any>({
    queryKey: [isAdmin ? `/api/admin/quotes/${id}` : `/api/quotes/${id}`],
    enabled: isAuthenticated && !!id,
  });

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <p className="mb-4">Please sign in to view this quotation.</p>
        <Link href="/login"><Button>Sign in</Button></Link>
      </div>
    );
  }
  if (isLoading) return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (error || !data) return <div className="max-w-lg mx-auto py-20 text-center text-muted-foreground">Quotation not found.</div>;

  const quote = data;
  const items: any[] = quote.items || [];
  const cust = quote.customer || user || {};
  const money = (n: any) => (n == null ? "—" : `£${Number(n).toFixed(2)}`);
  const total = quote.totalEstimate != null
    ? Number(quote.totalEstimate)
    : items.reduce((s, it) => s + (it.lineTotal != null ? Number(it.lineTotal) : 0), 0);

  return (
    <div className="min-h-screen bg-muted/30 py-6 print:bg-white print:py-0">
      <style>{`@media print { .no-print { display: none !important; } @page { margin: 16mm; } }`}</style>

      {/* Toolbar (hidden when printing) */}
      <div className="no-print mx-auto max-w-3xl px-4 mb-4 flex items-center justify-between">
        <Link href={isAdmin ? "/admin/quotes" : "/portal/quotes"}>
          <Button variant="ghost" className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button>
        </Link>
        <Button onClick={() => window.print()} className="gap-2" data-testid="button-print-quote">
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </Button>
      </div>

      {/* Document */}
      <div className="mx-auto max-w-3xl bg-white text-black shadow-sm print:shadow-none p-8 sm:p-10" data-testid="quote-document">
        <div className="flex items-start justify-between border-b pb-6">
          <div>
            <div className="text-2xl font-bold" style={{ color: "#047857" }}>Pharma Oasis</div>
            <div className="text-sm text-gray-500">Your Trusted Wholesale Partner</div>
          </div>
          <div className="text-right">
            <div className="text-xl font-semibold tracking-wide">QUOTATION</div>
            <div className="text-sm text-gray-600 mt-1">Quote #{quote.id}{quote.version > 1 ? ` (v${quote.version})` : ""}</div>
            <div className="text-sm text-gray-600">Date: {format(new Date(quote.createdAt), "d MMM yyyy")}</div>
            {quote.expiryDate && (
              <div className="text-sm text-gray-600">Valid until: {format(new Date(quote.expiryDate), "d MMM yyyy")}</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 py-6">
          <div>
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Prepared for</div>
            <div className="font-medium">{cust.companyName || cust.primaryContactName || "Customer"}</div>
            {cust.primaryContactName && cust.companyName && <div className="text-sm text-gray-600">{cust.primaryContactName}</div>}
            {cust.email && <div className="text-sm text-gray-600">{cust.email}</div>}
            {cust.billingAddressLine1 && (
              <div className="text-sm text-gray-600 mt-1">
                {cust.billingAddressLine1}{cust.billingCity ? `, ${cust.billingCity}` : ""}{cust.billingPostcode ? `, ${cust.billingPostcode}` : ""}
              </div>
            )}
          </div>
          <div className="text-right text-sm text-gray-600">
            <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Status</div>
            <div className="font-medium capitalize">{quote.status}</div>
          </div>
        </div>

        <table className="w-full text-sm border-t">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-2 w-8">#</th>
              <th className="py-2">Description</th>
              <th className="py-2">EAN</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Unit price</th>
              <th className="py-2 text-right">Line total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={it.id ?? i} className="border-b">
                <td className="py-2 text-gray-400">{i + 1}</td>
                <td className="py-2">{it.product?.productName || it.description || "Item"}</td>
                <td className="py-2 text-gray-600">{it.ean || "—"}</td>
                <td className="py-2 text-right">{it.quantity}</td>
                <td className="py-2 text-right">{money(it.unitPrice)}</td>
                <td className="py-2 text-right">{money(it.lineTotal)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-gray-400">No items.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="py-3 text-right font-semibold">Total</td>
              <td className="py-3 text-right font-bold text-lg">{money(total)}</td>
            </tr>
          </tfoot>
        </table>

        {quote.adminNotes && (
          <div className="mt-6 text-sm">
            <div className="font-medium mb-1">Notes</div>
            <div className="text-gray-700 whitespace-pre-wrap">{quote.adminNotes}</div>
          </div>
        )}

        <div className="mt-8 pt-4 border-t text-xs text-gray-500">
          <p>{quote.expiryDate ? `This quotation is valid until ${format(new Date(quote.expiryDate), "d MMMM yyyy")}.` : "Prices are subject to confirmation."} Prices exclude VAT unless stated. E&amp;OE.</p>
          <p className="mt-1">Pharma Oasis — Your Trusted Wholesale Partner</p>
        </div>
      </div>
    </div>
  );
}
