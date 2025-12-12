import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import type { Brand, InsertBrand } from "@shared/schema";
import { 
  Search, 
  Building2, 
  Plus, 
  Pencil,
  Trash2,
  Loader2,
  Award,
  EyeOff,
} from "lucide-react";
import { ImageUpload } from "@/components/admin/ImageUpload";

export default function AdminBrandsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const { toast } = useToast();

  const { data: brands, isLoading } = useQuery<Brand[]>({
    queryKey: ["/api/admin/brands"],
  });

  const form = useForm<InsertBrand>({
    defaultValues: {
      name: "",
      description: "",
      logoUrl: "",
      isActive: true,
      isDirectDistributor: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertBrand) => {
      return apiRequest("POST", "/api/admin/brands", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/brands"] });
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      toast({ title: "Brand created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create brand", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertBrand> }) => {
      return apiRequest("PATCH", `/api/admin/brands/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/brands"] });
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      toast({ title: "Brand updated successfully" });
      setIsDialogOpen(false);
      setEditingBrand(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to update brand", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/brands/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/brands"] });
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      toast({ title: "Brand deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete brand", variant: "destructive" });
    },
  });

  const filteredBrands = brands?.filter(brand =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    form.reset({
      name: brand.name,
      description: brand.description || "",
      logoUrl: brand.logoUrl || "",
      isActive: brand.isActive,
      isDirectDistributor: brand.isDirectDistributor,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingBrand(null);
    form.reset({
      name: "",
      description: "",
      logoUrl: "",
      isActive: true,
      isDirectDistributor: false,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: InsertBrand) => {
    if (editingBrand) {
      updateMutation.mutate({ id: editingBrand.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
            Brand Management
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage product brands ({brands?.length || 0} brands)
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Brand
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search brands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredBrands && filteredBrands.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBrands.map((brand) => (
            <Card key={brand.id} data-testid={`card-admin-brand-${brand.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-muted flex items-center justify-center">
                    {brand.logoUrl ? (
                      <img
                        src={brand.logoUrl}
                        alt={brand.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Building2 className="h-6 w-6 text-muted-foreground/50" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium truncate">{brand.name}</h3>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {brand.isDirectDistributor && (
                        <Badge variant="default" className="gap-1">
                          <Award className="h-3 w-3" /> Direct
                        </Badge>
                      )}
                      {!brand.isActive && (
                        <Badge variant="secondary" className="gap-1">
                          <EyeOff className="h-3 w-3" /> Inactive
                        </Badge>
                      )}
                    </div>
                    {brand.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {brand.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleEdit(brand)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this brand?")) {
                        deleteMutation.mutate(brand.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No brands found</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "DM Sans, sans-serif" }}>
              {editingBrand ? "Edit Brand" : "Add Brand"}
            </DialogTitle>
            <DialogDescription>
              {editingBrand ? "Update brand details" : "Create a new brand"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Brand name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Brand description..." {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand Logo</FormLabel>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <ImageUpload
                          category="brand"
                          currentImageUrl={field.value || undefined}
                          onImageUploaded={(url) => field.onChange(url)}
                          label="Upload Logo"
                        />
                        <span className="text-xs text-muted-foreground">or</span>
                      </div>
                      <FormControl>
                        <Input placeholder="Enter logo URL..." {...field} value={field.value || ""} />
                      </FormControl>
                      {field.value && (
                        <div className="mt-2">
                          <img 
                            src={field.value} 
                            alt="Logo preview" 
                            className="h-12 w-auto object-contain rounded border p-1"
                          />
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-6">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">Active</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isDirectDistributor"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">Direct Distributor</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingBrand ? "Save Changes" : "Create Brand"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
