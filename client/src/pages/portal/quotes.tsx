import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, ArrowRight, PackageCheck } from "lucide-react";

interface Quote { id: number; status: string; totalEstimate: string | null; customerNotes: string | null; adminNotes: string | null; createdAt: string; }
interface Order { id: number; quoteId: number | null; }

const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  quoted: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-gray-100 text-gray-600",
  closed: "bg-gray-100 text-gray-600",
  expired: "bg-gray-100 text-gray-600",
};
const statusLabel: Record<string, string> = {
  pending: "Pending review",
  quoted: "Quote ready — respond",
  accepted: "Accepted",
  declined: "Declined",
  closed: "Closed",
};

export default function PortalQuotesPage() {
  const { data: quotes = [], isLoading } = useQuery<Quote[]>({ queryKey: ["/api/quotes"] });
  const { data: orders = [] } = useQuery<Order[]>({ queryKey: ["/api/portal/orders"] });
  const money = (n: string | null) => (n === null ? "—" : `£${Number(n).toFixed(2)}`);
  const orderForQuote = (quoteId: number) => orders.find((o) => o.quoteId === quoteId);

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold">My Quotes</h1>
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : quotes.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-muted-foreground">
          <FileText className="h-12 w-12 mb-3" />
          <p>Your quote &amp; availability requests will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map((q) => {
            const linkedOrder = orderForQuote(q.id);
            return (
              <Card key={q.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">Quote #{q.id}</div>
                      <div className="text-xs text-muted-foreground">{new Date(q.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{money(q.totalEstimate)}</span>
                      <Badge className={statusColor[q.status] ?? ""}>{statusLabel[q.status] ?? q.status}</Badge>
                    </div>
                  </div>
                  {q.adminNotes && <div className="mt-3 p-3 bg-muted rounded text-sm"><span className="font-medium">Response: </span>{q.adminNotes}</div>}
                  {q.customerNotes && <div className="text-xs text-muted-foreground mt-2">Your notes: {q.customerNotes}</div>}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {q.status === "quoted" && (
                      <Link href={`/my-quotes/${q.id}`}>
                        <Button size="sm" className="gap-1" data-testid={`button-respond-${q.id}`}>
                          Review &amp; respond <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                    {q.status !== "quoted" && (
                      <Link href={`/my-quotes/${q.id}`}>
                        <Button size="sm" variant="outline" data-testid={`button-view-${q.id}`}>View details</Button>
                      </Link>
                    )}
                    {linkedOrder && (
                      <Link href="/portal/orders">
                        <Button size="sm" variant="ghost" className="gap-1 text-emerald-700" data-testid={`link-order-${q.id}`}>
                          <PackageCheck className="h-4 w-4" /> Order #{linkedOrder.id}
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
