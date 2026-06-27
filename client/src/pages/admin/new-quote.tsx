import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Plus, Trash2, FileText, Loader2 } from "lucide-react";

// E4 — salesman-initiated quote. Pick a customer, add starter lines, create a
// pending quote, then land in the Deal Workspace to price + send it.

interface NewLine { description: string; ean: string; quantity: number; unitPrice: string; unitCost: string }
const blank = (): NewLine => ({ description: "", ean: "", quantity: 1, unitPrice: "", unitCost: "" });
const money = (v: any) => (v == null || v === "" ? "—" : `£${Number(v).toFixed(2)}`);

export default function NewQuotePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: users } = useQuery<any[]>({ queryKey: ["/api/admin/users"] });

  const [userId, setUserId] = useState<string>("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [lines, setLines] = useState<NewLine[]>([blank()]);

  const sorted = useMemo(
    () => (users || []).slice().sort((a, b) => (a.companyName || a.email || "").localeCompare(b.companyName || b.email || "")),
    [users],
  );

  const total = lines.reduce((s, l) => s + (l.unitPrice === "" ? 0 : Number(l.unitPrice) * l.quantity), 0);
  const update = (i: number, patch: Partial<NewLine>) => setLines((p) => p.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((p) => [...p, blank()]);
  const removeLine = (i: number) => setLines((p) => (p.length === 1 ? p : p.filter((_, idx) => idx !== i)));

  const create = useMutation({
    mutationFn: async () => {
      const items = lines
        .filter((l) => l.description.trim() || l.ean.trim())
        .map((l) => ({
          description: l.description.trim() || null,
          ean: l.ean.trim() || null,
          quantity: l.quantity,
          unitPrice: l.unitPrice === "" ? null : Number(l.unitPrice),
          unitCost: l.unitCost === "" ? null : Number(l.unitCost),
        }));
      if (!userId) throw new Error("Select a customer.");
      if (items.length === 0) throw new Error("Add at least one line with a description or EAN.");
      const res = await apiRequest("POST", "/api/admin/quotes", { userId: Number(userId), customerNotes: customerNotes || null, items });
      return res.json();
    },
    onSuccess: (quote: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/quotes"] });
      toast({ title: `Quote Q-${quote.id} created — price & send it` });
      navigate(`/admin/sales/quote/${quote.id}`);
    },
    onError: (e: any) => toast({ title: "Couldn't create quote", description: e?.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <Link href="/admin/sales"><Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" /> Back to Sales</Button></Link>

      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>New quote</h1>
        <p className="mt-1 text-muted-foreground">Create a quote for a customer. You'll price and send it on the next screen.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-lg">Lines ({lines.length})</CardTitle>
              <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-4 w-4 mr-1" /> Add line</Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Item</TableHead><TableHead className="w-28">EAN</TableHead><TableHead className="w-16 text-right">Qty</TableHead>
                  <TableHead className="w-24 text-right">Cost</TableHead><TableHead className="w-24 text-right">Unit price</TableHead>
                  <TableHead className="w-24 text-right">Line</TableHead><TableHead className="w-8" />
                </TableRow></TableHeader>
                <TableBody>
                  {lines.map((l, i) => (
                    <TableRow key={i}>
                      <TableCell><Input value={l.description} placeholder="Description" onChange={(e) => update(i, { description: e.target.value })} /></TableCell>
                      <TableCell><Input value={l.ean} placeholder="EAN" onChange={(e) => update(i, { ean: e.target.value })} /></TableCell>
                      <TableCell><Input type="number" min={1} className="text-right" value={l.quantity} onChange={(e) => update(i, { quantity: Math.max(1, Number(e.target.value) || 1) })} /></TableCell>
                      <TableCell><Input type="number" min={0} step="0.01" className="text-right" value={l.unitCost} placeholder="—" onChange={(e) => update(i, { unitCost: e.target.value })} /></TableCell>
                      <TableCell><Input type="number" min={0} step="0.01" className="text-right" value={l.unitPrice} placeholder="On request" onChange={(e) => update(i, { unitPrice: e.target.value })} /></TableCell>
                      <TableCell className="text-right font-medium">{l.unitPrice === "" ? "—" : money(Number(l.unitPrice) * l.quantity)}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => removeLine(i)} disabled={lines.length === 1}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end gap-8 border-t p-4"><span className="text-muted-foreground">Estimated total</span><span className="text-lg font-bold">{money(total)}</span></div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Customer</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger data-testid="select-customer"><SelectValue placeholder="Select a customer…" /></SelectTrigger>
                <SelectContent>
                  {sorted.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>{u.companyName || u.email || `User #${u.id}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div>
                <label className="text-sm font-medium">Note from / about the customer (optional)</label>
                <Textarea value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} placeholder="e.g. what the customer asked for." />
              </div>
              <Button className="w-full" onClick={() => create.mutate()} disabled={create.isPending || !userId}>
                {create.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />} Create quote
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
