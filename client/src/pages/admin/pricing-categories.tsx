import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  const [, setLocation] = useLocation();
  const { data: catBrands = {} } = useQuery<Record<string, { id: number; name: string; items: number }[]>>({
    queryKey: ["/api/admin/pricing-categories-brands"],
  });
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
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <Tag className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Pricing Categories</h1>
              <p className="text-muted-foreground">
                <b>Step 2 (optional).</b> Groups for your products. Cost uploads create these automatically from the file's Category: blocks — add or tidy them here.
              </p>
            </div>
          </div>
          <Button onClick={() => { reset(); setOpen(true); }} data-testid="button-add-category" className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className="h-4 w-4 mr-2" /> Add Category
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              All pricing categories
              {cats.length > 0 && <Badge variant="outline">{cats.length}</Badge>}
            </CardTitle>
            <CardDescription>Used to filter the customer portal and scope downloads.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : cats.length === 0 ? (
              <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
                No categories yet.
              </div>
            ) : (
              <div className="space-y-2">
                {cats.map((c) => (
                  <div key={c.id} data-testid={`row-category-${c.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3.5 hover:bg-muted/40 transition-colors">
                    <div className="min-w-0">
                      <div className="font-semibold truncate flex items-center gap-2">
                        {c.name}
                        <Badge variant={c.isActive ? "default" : "secondary"} className={c.isActive ? "bg-emerald-600" : ""}>
                          {c.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">Sort order {c.sortOrder ?? 0}</div>
                      {(() => {
                        const sup = (catBrands as any)[c.id] as { id: number; name: string; items: number }[] | undefined;
                        if (!sup || sup.length === 0) {
                          return <div className="mt-1.5 text-[11px] text-muted-foreground">No suppliers have costs in this category yet.</div>;
                        }
                        return (
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] text-muted-foreground mr-0.5">Suppliers:</span>
                            {sup.map((b) => (
                              <button key={b.id} type="button"
                                onClick={() => setLocation(`/admin/current-costs?brand=${b.id}`)}
                                title={`Open ${b.name} current costs (${b.items} item(s) in this category)`}
                                className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                {b.name}
                                <span className="text-emerald-600/80 dark:text-emerald-400/80">{b.items}</span>
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(c)} data-testid={`button-edit-category-${c.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => {
                        if (confirm(`Delete category "${c.name}"?`)) del.mutate(c.id);
                      }} data-testid={`button-delete-category-${c.id}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
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
  );
}
