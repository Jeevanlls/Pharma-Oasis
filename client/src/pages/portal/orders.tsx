import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface Order { id: number; status: string; totalAmount: string | null; customerNotes: string | null; adminResponse: string | null; createdAt: string; }
interface OrderItem { id: number; productId: number; productName: string | null; quantity: number; unitPrice: string | null; lineTotal: string | null; }

const statusColor: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-800",
  entered: "bg-blue-100 text-blue-800",
  confirmed: "bg-green-100 text-green-800",
  processing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-600",
};
const statusLabel: Record<string, string> = {
  submitted: "Received — awaiting confirmation",
  entered: "Being processed",
  confirmed: "Confirmed",
  processing: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
};

function OrderRow({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);
  const { data } = useQuery<{ order: Order; items: OrderItem[] }>({
    queryKey: ["/api/portal/orders", order.id],
    enabled: open,
  });
  const money = (n: string | null) => (n === null ? "—" : `£${Number(n).toFixed(2)}`);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="font-semibold">Order #{order.id}</div>
            <div className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-semibold">{money(order.totalAmount)}</span>
            <Badge className={statusColor[order.status] ?? ""}>{statusLabel[order.status] ?? order.status}</Badge>
            <Button variant="ghost" size="icon" onClick={() => setOpen((o) => !o)}>
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        {order.adminResponse && (
          <div className="mt-3 p-3 rounded text-sm bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900"><span className="font-medium text-emerald-800 dark:text-emerald-300">Our reply: </span>{order.adminResponse}</div>
        )}
        {open && data && (
          <div className="mt-3 border-t pt-3 space-y-1">
            <div className="text-xs font-medium text-muted-foreground pb-1">{data.items.length} item{data.items.length === 1 ? "" : "s"}</div>
            {data.items.map((it) => (
              <div key={it.id} className="flex justify-between gap-3 text-sm">
                <span className="min-w-0">{it.quantity} × {it.productName ?? `#${it.productId}`}</span>
                <span className="text-muted-foreground whitespace-nowrap shrink-0">{money(it.unitPrice)} ea · {money(it.lineTotal)}</span>
              </div>
            ))}
            {order.customerNotes && <div className="text-xs text-muted-foreground pt-2">Your notes: {order.customerNotes}</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PortalOrdersPage() {
  const { data: orders = [], isLoading } = useQuery<Order[]>({ queryKey: ["/api/portal/orders"] });

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">My Orders</h1>
        <p className="text-xs text-muted-foreground mt-1">Totals are per unit and exclude VAT, duty, customs and delivery (ex-works). We confirm stock and final pricing before dispatch.</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-muted-foreground">
          <ClipboardList className="h-12 w-12 mb-3" />
          <p>Your placed orders will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">{orders.map((o) => <OrderRow key={o.id} order={o} />)}</div>
      )}
    </div>
  );
}
