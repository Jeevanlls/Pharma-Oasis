import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema, type Product, type Brand, type Category, type InsertProduct } from "@shared/schema";
import { 
  Search, 
  Package, 
  Plus, 
  Pencil,
  Trash2,
  Loader2,
  Star,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { ImageUpload } from "@/components/admin/ImageUpload";

export default function AdminProductsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const { toast } = useToast();

  const { data: productsResponse, isLoading } = useQuery<{ products: Product[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>({
    queryKey: ["/api/products"],
  });
  
  const products = productsResponse?.products;

  const { data: brands } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const form = useForm<InsertProduct>({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      sku: "",
      productName: "",
      brandId: 0,
      categoryId: 0,
      wholesalePrice: "",
      rrp: "",
      googleFeedPrice: "",
      packSize: "",
      caseSize: "",
      moq: 1,
      isActive: true,
      isFeatured: false,
      shortDescription: "",
      imageUrl: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertProduct) => {
      return apiRequest("POST", "/api/admin/products", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create product", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertProduct> }) => {
      return apiRequest("PATCH", `/api/admin/products/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product updated successfully" });
      setIsDialogOpen(false);
      setEditingProduct(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to update product", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete product", variant: "destructive" });
    },
  });

  const generateDescription = async () => {
    const productName = form.getValues("productName");
    if (!productName) {
      toast({ title: "Please enter a product name first", variant: "destructive" });
      return;
    }

    const brandId = form.getValues("brandId");
    const categoryId = form.getValues("categoryId");
    const packSize = form.getValues("packSize");
    
    const brand = brands?.find(b => b.id === brandId);
    const category = categories?.find(c => c.id === categoryId);

    setIsGeneratingDescription(true);
    try {
      const res = await apiRequest("POST", "/api/admin/ai/generate-product-description", {
        productName,
        brand: brand?.name,
        category: category?.name,
        packSize,
      });
      const data = await res.json();
      if (data.description) {
        form.setValue("shortDescription", data.description);
        toast({ title: "Description generated" });
      }
    } catch (error) {
      toast({ title: "Failed to generate description", variant: "destructive" });
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const filteredProducts = products?.filter(product =>
    product.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      sku: product.sku,
      productName: product.productName,
      brandId: product.brandId,
      categoryId: product.categoryId,
      subcategoryId: product.subcategoryId || undefined,
      wholesalePrice: product.wholesalePrice,
      rrp: product.rrp || "",
      googleFeedPrice: (product as any).googleFeedPrice || "",
      packSize: product.packSize || "",
      caseSize: product.caseSize || "",
      moq: product.moq || 1,
      isActive: product.isActive,
      isFeatured: product.isFeatured,
      shortDescription: product.shortDescription || "",
      imageUrl: product.imageUrl || "",
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingProduct(null);
    form.reset({
      sku: "",
      productName: "",
      brandId: 0,
      categoryId: 0,
      wholesalePrice: "",
      rrp: "",
      googleFeedPrice: "",
      packSize: "",
      caseSize: "",
      moq: 1,
      isActive: true,
      isFeatured: false,
      shortDescription: "",
      imageUrl: "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: InsertProduct) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const topLevelCategories = categories?.filter(c => !c.parentId) || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
            Product Management
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage your product catalogue ({products?.length || 0} products)
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products by name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-product-search"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProducts && filteredProducts.length > 0 ? (
        <div className="space-y-4">
          {filteredProducts.map((product) => {
            const brand = brands?.find(b => b.id === product.brandId);
            return (
              <Card key={product.id} data-testid={`card-admin-product-${product.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.productName}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">{product.productName}</h3>
                        {product.isFeatured && (
                          <Badge variant="default" className="gap-1">
                            <Star className="h-3 w-3" /> Featured
                          </Badge>
                        )}
                        {!product.isActive && (
                          <Badge variant="secondary" className="gap-1">
                            <EyeOff className="h-3 w-3" /> Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span>SKU: {product.sku}</span>
                        {brand && <span>Brand: {brand.name}</span>}
                        {product.packSize && <span>{product.packSize}</span>}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-medium">£{Number(product.wholesalePrice).toFixed(2)}</p>
                      {product.rrp && (
                        <p className="text-xs text-muted-foreground">RRP: £{Number(product.rrp).toFixed(2)}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(product)}
                        data-testid={`button-edit-product-${product.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this product?")) {
                            deleteMutation.mutate(product.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <Package className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No products found</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "DM Sans, sans-serif" }}>
              {editingProduct ? "Edit Product" : "Add Product"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct ? "Update product details" : "Create a new product"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. PROD-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="productName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Product name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="brandId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand *</FormLabel>
                    <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value || "")}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select brand" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {brands?.map((brand) => (
                          <SelectItem key={brand.id} value={String(brand.id)}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select 
                        onValueChange={(v) => {
                          field.onChange(Number(v));
                          form.setValue('subcategoryId', undefined);
                        }} 
                        value={String(field.value || "")}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {topLevelCategories.map((category) => (
                            <SelectItem key={category.id} value={String(category.id)}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="subcategoryId"
                  render={({ field }) => {
                    const selectedCategoryId = form.watch('categoryId');
                    const subcategories = categories?.filter(c => c.parentId === selectedCategoryId) || [];
                    
                    return (
                      <FormItem>
                        <FormLabel>Subcategory</FormLabel>
                        <Select 
                          onValueChange={(v) => field.onChange(v ? Number(v) : undefined)} 
                          value={field.value ? String(field.value) : ""}
                          disabled={!selectedCategoryId || subcategories.length === 0}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={subcategories.length === 0 ? "No subcategories" : "Select subcategory"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {subcategories.map((subcategory) => (
                              <SelectItem key={subcategory.id} value={String(subcategory.id)}>
                                {subcategory.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="wholesalePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Wholesale Price (internal)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rrp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RRP (internal)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="googleFeedPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Google Shopping Price</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value || ""} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">Only used in Google Shopping feed (not shown on website)</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="moq"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MOQ</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="1" {...field} value={field.value ?? 1} onChange={(e) => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="packSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pack Size</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 100 tablets" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="caseSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Case Size</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 12" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="shortDescription"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Description</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={generateDescription}
                        disabled={isGeneratingDescription}
                        className="gap-1 h-7 text-xs"
                        data-testid="button-ai-description"
                      >
                        {isGeneratingDescription ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        AI Generate
                      </Button>
                    </div>
                    <FormControl>
                      <Textarea placeholder="Product description (max 2 lines)..." {...field} value={field.value || ""} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Image</FormLabel>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <ImageUpload
                          category="product"
                          currentImageUrl={field.value || undefined}
                          onImageUploaded={(url) => field.onChange(url)}
                          label="Upload Image"
                        />
                        <span className="text-xs text-muted-foreground">or</span>
                      </div>
                      <FormControl>
                        <Input placeholder="Enter image URL..." {...field} value={field.value || ""} />
                      </FormControl>
                      {field.value && (
                        <div className="mt-2">
                          <img 
                            src={field.value} 
                            alt="Product preview" 
                            className="h-16 w-16 object-contain rounded border p-1"
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
                  name="isFeatured"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                      </FormControl>
                      <FormLabel className="!mt-0">Featured</FormLabel>
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
                  {editingProduct ? "Save Changes" : "Create Product"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
