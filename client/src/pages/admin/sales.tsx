import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { Search, FileText, ClipboardList, PackageCheck, Download, Inbox, Truck, CheckCircle2 } from "lucide-react";

type Tab = "active" | "archived";
type Kind = "order" | "quote";
interface Row {
  kind: Kind;
  id: number;
  ref: string;
  customer: string;
  value: number | null;
  status: string;
  date: string;
  archived: boolean;
  fromQuoteId?: number | null;
}

const statusBadge: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  // orders
  submitted: { label: "New order", variant: "secondary" },
  confirmed: { label: "To fulfil", variant: "default" },
  processing: { label: "Processing", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
  entered: { label: "Entered ✓", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  // quotes
  pending: { label: "Quote: to price", variant: "secondary" },
  quoted: { label: "Quote: sent", variant: "default" },
  accepted: { label: "Quote: accepted", variant: "default" },
  declined: { label: "Quote: declined", variant: "destructive" },
  closed: { label: "Quote: closed", variant: "outline" },
};

const QUOTE_ACTIVE = ["pending", "quoted"];

export default function AdminSalesPage() {
  const [tab, setTab] = useState<Tab>("active");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "order" | "quote">("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const { data: stats } = useQuery<{ newCount: number; toFulfil: number; doneThisWeek: number; activeTotal: number }>({
    queryKey: ["/api/admin/orders/stats"],
  });
  const { data: orders } = useQuery<any[]>({
    queryKey: [`/api/admin/orders?archived=${tab === "archived"}`],
  });
  const { data: quotes } = useQuery<any[]>({ queryKey: ["/api/admin/quotes"] });
  const { data: users } = useQuery<any[]>({ queryKey: ["/api/admin/users"] });

  const userMap = useMemo(() => {
    const m = new Map<number, any>();
    (users || []).forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  const enterMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("POST", `/api/admin/orders/${id}/enter`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/orders?archived=${tab === "archived"}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders/stats"] });
      toast({ title: "Marked as entered into inventory" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e?.message, variant: "destructive" }),
  });

  const bulkEnterMutation = useMutation({
    mutationFn: async (ids: number[]) => apiRequest("POST", "/api/admin/orders/bulk", { ids, action: "enter" }),
    onSuccess: async (res) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: [`/api/admin/orders?archived=${tab === "archived"}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders/stats"] });
      setSelected(new Set());
      toast({ title: `Marked ${data.updated} of ${data.requested} entered into inventory` });
    },
    onError: (e: any) => toast({ title: "Bulk action failed", description: e?.message, variant: "destructive" }),
  });

  const rows: Row[] = useMemo(() => {
    const orderRows: Row[] = (orders || []).map((o) => ({
      kind: "order" as const,
      id: o.id,
      ref: `O-${o.id}`,
      customer: o.companyName || o.email || `User #${o.userId}`,
      value: o.totalAmount != null ? Number(o.totalAmount) : null,
      status: o.status,
      date: o.createdAt,
      archived: !!o.archivedAt,
      fromQuoteId: o.quoteId ?? null,
    }));
    const quoteRows: Row[] = (quotes || [])
      .filter((q) => (tab === "active" ? QUOTE_ACTIVE.includes(q.status) : !QUOTE_ACTIVE.includes(q.status)))
      .map((q) => {
        const u = userMap.get(q.userId);
        return {
          kind: "quote" as const,
          id: q.id,
          ref: `Q-${q.id}`,
          customer: u?.companyName || u?.email || `User #${q.userId}`,
          value: q.totalEstimate != null ? Number(q.totalEstimate) : null,
          status: q.status,
          date: q.createdAt,
          archived: !QUOTE_ACTIVE.includes(q.status),
        };
      });
    let all = [...orderRows, ...quoteRows];
    if (typeFilter !== "all") all = all.filter((r) => r.kind === typeFilter);
    const q = search.trim().toLowerCase();
    if (q) all = all.filter((r) => r.ref.toLowerCase().includes(q) || r.customer.toLowerCase().includes(q));
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, quotes, userMap, tab, typeFilter, search]);

  // Only active orders are selectable for the bulk "entered" handoff.
  const selectableIds = rows.filter((r) => r.kind === "order" && !r.archived && r.status !== "cancelled").map((r) => r.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectableIds));
  const toggleOne = (id: number) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const money = (v: number | null) => (v == null ? "—" : `£${v.toFixed(2)}`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>Sales</h1>
        <p className="mt-2 text-muted-foreground">Quotes and orders in one worklist. Mark an order "entered into inventory" once you've keyed it into your inventory system — it then moves to Archived.</p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Inbox} label="New orders" value={stats?.newCount} tint="amber" />
        <Kpi icon={Truck} label="To fulfil" value={stats?.toFulfil} tint="blue" />
        <Kpi icon={FileText} label="Quotes to price" value={(quotes || []).filter((q) => q.status === "pending").length} tint="violet" />
        <Kpi icon={CheckCircle2} label="Entered this week" value={stats?.doneThisWeek} tint="emerald" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => { setTab(v as Tab); setSelected(new Set()); }}>
          <TabsList>
            <TabsTrigger value="active" data-testid="tab-active">Active</TabsTrigger>
            <TabsTrigger value="archived" data-testid="tab-archived">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-1 gap-2 sm:max-w-md sm:ml-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search ref or customer…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" data-testid="input-sales-search" />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
            <SelectTrigger className="w-32" data-testid="select-type-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="order">Orders</SelectItem>
              <SelectItem value="quote">Quotes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
          <span className="text-sm font-medium">{selected.size} order(s) selected</span>
          <Button
            size="sm"
            onClick={() => {
              if (confirm(`Mark ${selected.size} order(s) as entered into your inventory system? They'll move to Archived.`)) {
                bulkEnterMutation.mutate(Array.from(selected));
              }
            }}
            disabled={bulkEnterMutation.isPending}
            data-testid="button-bulk-enter"
          >
            <PackageCheck className="h-4 w-4 mr-2" /> Mark entered into inventory
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  {tab === "active" && selectableIds.length > 0 && (
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} data-testid="checkbox-select-all" />
                  )}
                </TableHead>
                <TableHead>Ref</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">Nothing here.</TableCell></TableRow>
              ) : rows.map((r) => {
                const badge = statusBadge[r.status] || { label: r.status, variant: "secondary" as const };
                const selectable = r.kind === "order" && !r.archived && r.status !== "cancelled";
                return (
                  <TableRow key={`${r.kind}-${r.id}`} data-testid={`row-${r.ref}`}>
                    <TableCell>
                      {selectable && <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleOne(r.id)} data-testid={`checkbox-${r.ref}`} />}
                    </TableCell>
                    <TableCell className="font-medium">
                      {r.ref}
                      {r.fromQuoteId ? <span className="block text-xs font-normal text-muted-foreground">↳ from Q-{r.fromQuoteId}</span> : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        {r.kind === "order" ? <ClipboardList className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                        {r.kind === "order" ? "Order" : "Quote"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.customer}</TableCell>
                    <TableCell className="text-right">{money(r.value)}</TableCell>
                    <TableCell><Badge variant={badge.variant}>{badge.label}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.date ? format(new Date(r.date), "d MMM yyyy") : "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {r.kind === "order" && (
                          <Button size="sm" variant="ghost" title="Export CSV for your inventory system" onClick={() => window.open(`/api/admin/orders/${r.id}/export`, "_blank")} data-testid={`button-export-${r.ref}`}>
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {selectable && (
                          <Button size="sm" variant="outline" onClick={() => enterMutation.mutate(r.id)} disabled={enterMutation.isPending} data-testid={`button-enter-${r.ref}`}>
                            <PackageCheck className="h-4 w-4 mr-1" /> Entered
                          </Button>
                        )}
                        <Link href={`/admin/sales/${r.kind}/${r.id}`}>
                          <Button size="sm" variant="ghost" data-testid={`button-open-${r.ref}`}>Open</Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tint }: { icon: any; label: string; value: number | undefined; tint: string }) {
  const tints: Record<string, string> = {
    amber: "text-amber-600", blue: "text-blue-600", violet: "text-violet-600", emerald: "text-emerald-600",
  };
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`h-8 w-8 ${tints[tint] || ""}`} />
        <div>
          <div className="text-2xl font-bold" data-testid={`kpi-${label}`}>{value ?? "—"}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
