import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, ClipboardList } from "lucide-react";

interface Order { id: number; userId: number; status: string; totalAmount: string | null; companyName: string | null; email: string | null; customerNotes: string | null; adminResponse: string | null; adminNotes: string | null; createdAt: string; }
interface OrderItem { id: number; productId: number; productName: string | null; quantity: number; unitCost: string | null; unitPrice: string | null; marginApplied: string | null; lineTotal: string | null; }

const STATUSES = ["submitted", "confirmed", "processing", "completed", "cancelled"];
const statusColor: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-800", confirmed: "bg-green-100 text-green-800",
  processing: "bg-blue-100 text-blue-800", completed: "bg-green-100 text-green-800", cancelled: "bg-gray-100 text-gray-600",
};
const money = (n: string | null) => (n === null ? "—" : `£${Number(n).toFixed(2)}`);

export default function AdminOrdersPage() {
  const { toast } = useToast();
  const [active, setActive] = useState<Order | null>(null);
  const [status, setStatus] = useState("submitted");
  const [response, setResponse] = useState("");
  const [emailCustomer, setEmailCustomer] = useState(true);

  const { data: orders = [], isLoading } = useQuery<Order[]>({ queryKey: ["/api/admin/orders"] });
  const { data: detail } = useQuery<{ order: Order; items: OrderItem[] }>({
    queryKey: ["/api/admin/orders", active?.id],
    enabled: !!active,
  });

  const open = (o: Order) => { setActive(o); setStatus(o.status); setResponse(o.adminResponse ?? ""); setEmailCustomer(true); };

  const respondMut = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/admin/orders/${active!.id}/respond`, { status, adminResponse: response, sendEmail: emailCustomer }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({ title: "Order updated", description: emailCustomer ? "Customer emailed." : "Saved." });
      setActive(null);
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Orders</h1>
        <p className="text-muted-foreground">Orders placed from the customer portal. Respond in-system and optionally email the customer.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> All orders</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {orders.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No orders yet</TableCell></TableRow>}
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>#{o.id}</TableCell>
                    <TableCell className="text-xs">{new Date(o.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{o.companyName ?? o.email}</TableCell>
                    <TableCell className="text-right font-medium">{money(o.totalAmount)}</TableCell>
                    <TableCell><Badge className={statusColor[o.status] ?? ""}>{o.status}</Badge></TableCell>
                    <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => open(o)}>View / Respond</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!active} onOpenChange={(v) => !v && setActive(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Order #{active?.id} — {active?.companyName ?? active?.email}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="border rounded divide-y max-h-64 overflow-auto">
                {detail.items.map((it) => (
                  <div key={it.id} className="flex justify-between text-sm p-2">
                    <span>{it.quantity} × {it.productName ?? `#${it.productId}`}</span>
                    <span className="text-muted-foreground">cost {money(it.unitCost)} · price {money(it.unitPrice)} · {money(it.lineTotal)}</span>
                  </div>
                ))}
              </div>
              {active?.customerNotes && <div className="text-sm"><span className="font-medium">Customer notes: </span>{active.customerNotes}</div>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Response to customer</Label>
                <Textarea value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Confirmed pricing / availability / delivery details…" />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="emailc" checked={emailCustomer} onCheckedChange={(v) => setEmailCustomer(!!v)} />
                <Label htmlFor="emailc" className="cursor-pointer">Also email this response to the customer</Label>
              </div>
              <Button onClick={() => respondMut.mutate()} disabled={respondMut.isPending}>
                {respondMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Save &amp; respond
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
