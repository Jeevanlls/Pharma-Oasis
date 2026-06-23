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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";

interface PricingCategory {
  id: number; name: string; slug: string | null; isActive: boolean | null;
  sortOrder: number | null; notes: string | null;
}

export default function PricingCategoriesPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PricingCategory | null>(null);
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);

  const { data: cats = [], isLoading } = useQuery<PricingCategory[]>({
    queryKey: ["/api/admin/pricing-categories"],
  });

  const reset = () => { setEditing(null); setName(""); setSortOrder("0"); setIsActive(true); };
  const openEdit = (c: PricingCategory) => {
    setEditing(c); setName(c.name); setSortOrder(String(c.sortOrder ?? 0)); setIsActive(c.isActive ?? true); setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const body = { name, sortOrder: Number(sortOrder) || 0, isActive };
      if (editing) return apiRequest("PUT", `/api/admin/pricing-categories/${editing.id}`, body);
      return apiRequest("POST", "/api/admin/pricing-categories", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing-categories"] });
      setOpen(false); reset();
      toast({ title: editing ? "Category updated" : "Category created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/admin/pricing-categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing-categories"] });
      toast({ title: "Category deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Tag className="h-6 w-6" /> Pricing Categories
            </h1>
            <p className="text-muted-foreground">
              Standalone categories for the pricing side. Cost uploads auto-create these from the file's Category: blocks; add or tidy them here.
            </p>
          </div>
          <Button onClick={() => { reset(); setOpen(true); }} data-testid="button-add-category">
            <Plus className="h-4 w-4 mr-2" /> Add Category
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All pricing categories</CardTitle>
            <CardDescription>Used to filter the customer portal and scope downloads.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : cats.length === 0 ? (
              <p className="text-muted-foreground">No categories yet.</p>
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
                  {cats.map((c) => (
                    <TableRow key={c.id} data-testid={`row-category-${c.id}`}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.sortOrder ?? 0}</TableCell>
                      <TableCell>
                        <Badge variant={c.isActive ? "default" : "secondary"}>
                          {c.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(c)} data-testid={`button-edit-category-${c.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          if (confirm(`Delete category "${c.name}"?`)) del.mutate(c.id);
                        }} data-testid={`button-delete-category-${c.id}`}>
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
              <DialogTitle>{editing ? "Edit category" : "Add category"}</DialogTitle>
              <DialogDescription>Pricing categories are independent of the public catalogue.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="cat-name">Name</Label>
                <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sports & Fitness" data-testid="input-category-name" />
              </div>
              <div>
                <Label htmlFor="cat-order">Sort order</Label>
                <Input id="cat-order" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="cat-active" checked={isActive} onCheckedChange={setIsActive} />
                <Label htmlFor="cat-active">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => save.mutate()} disabled={!name.trim() || save.isPending} data-testid="button-save-category">
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
