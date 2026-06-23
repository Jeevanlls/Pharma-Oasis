import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";

interface PricingBrand {
  id: number; name: string; slug: string | null; isActive: boolean | null;
  sortOrder: number | null; notes: string | null;
}

export default function PricingBrandsPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PricingBrand | null>(null);
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState("");

  const { data: brands = [], isLoading } = useQuery<PricingBrand[]>({
    queryKey: ["/api/admin/pricing-brands"],
  });

  const reset = () => { setEditing(null); setName(""); setSortOrder("0"); setIsActive(true); setNotes(""); };

  const openCreate = () => { reset(); setOpen(true); };
  const openEdit = (b: PricingBrand) => {
    setEditing(b); setName(b.name); setSortOrder(String(b.sortOrder ?? 0));
    setIsActive(b.isActive ?? true); setNotes(b.notes ?? ""); setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const body = { name, sortOrder: Number(sortOrder) || 0, isActive, notes };
      if (editing) return apiRequest("PUT", `/api/admin/pricing-brands/${editing.id}`, body);
      return apiRequest("POST", "/api/admin/pricing-brands", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing-brands"] });
      setOpen(false); reset();
      toast({ title: editing ? "Brand updated" : "Brand created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/admin/pricing-brands/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing-brands"] });
      toast({ title: "Brand deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6" /> Pricing Brands
            </h1>
            <p className="text-muted-foreground">
              Standalone brands for the customer-pricing side — separate from the public catalogue brands.
            </p>
          </div>
          <Button onClick={openCreate} data-testid="button-add-brand">
            <Plus className="h-4 w-4 mr-2" /> Add Brand
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All pricing brands</CardTitle>
            <CardDescription>Each brand holds one base cost upload and any number of price lists.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : brands.length === 0 ? (
              <p className="text-muted-foreground">No brands yet. Add your first pricing brand.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brands.map((b) => (
                    <TableRow key={b.id} data-testid={`row-brand-${b.id}`}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell>{b.sortOrder ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant={b.isActive ? "default" : "secondary"}>
                          {b.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(b)} data-testid={`button-edit-brand-${b.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          if (confirm(`Delete brand "${b.name}"? This does not delete its price lists automatically.`)) del.mutate(b.id);
                        }} data-testid={`button-delete-brand-${b.id}`}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit brand" : "Add brand"}</DialogTitle>
              <DialogDescription>Pricing brands are independent of the public catalogue.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="brand-name">Name</Label>
                <Input id="brand-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Applied Nutrition" data-testid="input-brand-name" />
              </div>
              <div>
                <Label htmlFor="brand-order">Sort order</Label>
                <Input id="brand-order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="brand-notes">Notes (internal)</Label>
                <Input id="brand-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="brand-active" checked={isActive} onCheckedChange={setIsActive} />
                <Label htmlFor="brand-active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => save.mutate()} disabled={!name.trim() || save.isPending} data-testid="button-save-brand">
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
