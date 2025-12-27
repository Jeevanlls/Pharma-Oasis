import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product, Brand, Category } from "@shared/schema";
import { 
  Search, 
  Globe, 
  Package, 
  Tag,
  Folder,
  Pencil,
  Loader2,
  Check,
  ExternalLink,
} from "lucide-react";

interface SEOData {
  slug?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

interface EditingSEO {
  type: 'product' | 'brand' | 'category';
  id: number;
  name: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
}

export default function AdminSeoPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("products");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSeo, setEditingSeo] = useState<EditingSEO | null>(null);
  const { toast } = useToast();

  const { data: productsData, isLoading: productsLoading } = useQuery<{ products: Product[] }>({
    queryKey: ["/api/products"],
  });
  const products = productsData?.products;

  const { data: brands, isLoading: brandsLoading } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const updateProductSeoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: SEOData }) => {
      return apiRequest("PATCH", `/api/admin/products/${id}/seo`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Product SEO updated successfully" });
      setIsDialogOpen(false);
      setEditingSeo(null);
    },
    onError: () => {
      toast({ title: "Failed to update product SEO", variant: "destructive" });
    },
  });

  const updateBrandSeoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: SEOData }) => {
      return apiRequest("PATCH", `/api/admin/brands/${id}/seo`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/brands"] });
      toast({ title: "Brand SEO updated successfully" });
      setIsDialogOpen(false);
      setEditingSeo(null);
    },
    onError: () => {
      toast({ title: "Failed to update brand SEO", variant: "destructive" });
    },
  });

  const updateCategorySeoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: SEOData }) => {
      return apiRequest("PATCH", `/api/admin/categories/${id}/seo`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Category SEO updated successfully" });
      setIsDialogOpen(false);
      setEditingSeo(null);
    },
    onError: () => {
      toast({ title: "Failed to update category SEO", variant: "destructive" });
    },
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleEdit = (type: 'product' | 'brand' | 'category', item: Product | Brand | Category) => {
    const name = type === 'product' ? (item as Product).productName : (item as Brand | Category).name;
    setEditingSeo({
      type,
      id: item.id,
      name,
      slug: (item as any).slug || generateSlug(name),
      metaTitle: (item as any).metaTitle || "",
      metaDescription: (item as any).metaDescription || "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingSeo) return;

    const data: SEOData = {
      slug: editingSeo.slug || null,
      metaTitle: editingSeo.metaTitle || null,
      metaDescription: editingSeo.metaDescription || null,
    };

    if (editingSeo.type === 'product') {
      updateProductSeoMutation.mutate({ id: editingSeo.id, data });
    } else if (editingSeo.type === 'brand') {
      updateBrandSeoMutation.mutate({ id: editingSeo.id, data });
    } else {
      updateCategorySeoMutation.mutate({ id: editingSeo.id, data });
    }
  };

  const isSaving = updateProductSeoMutation.isPending || updateBrandSeoMutation.isPending || updateCategorySeoMutation.isPending;

  const filteredProducts = products?.filter(p =>
    p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBrands = brands?.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCategories = categories?.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const parentCategories = filteredCategories?.filter(c => !c.parentId);

  const getSeoStatus = (item: any) => {
    const hasSlug = !!item.slug;
    const hasTitle = !!item.metaTitle;
    const hasDesc = !!item.metaDescription;
    
    if (hasSlug && hasTitle && hasDesc) {
      return { label: "Complete", color: "text-green-600" };
    } else if (hasSlug || hasTitle || hasDesc) {
      return { label: "Partial", color: "text-yellow-600" };
    }
    return { label: "Missing", color: "text-muted-foreground" };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="w-6 h-6" />
            SEO Management
          </h1>
          <p className="text-muted-foreground">
            Manage meta titles, descriptions, and slugs for search engine optimization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a 
            href="/feeds/sitemap.xml" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1"
            data-testid="link-sitemap"
          >
            View Sitemap <ExternalLink className="w-3 h-3" />
          </a>
          <a 
            href="/feeds/google-shopping.xml" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1"
            data-testid="link-google-shopping"
          >
            Google Shopping Feed <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search products, brands, or categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-seo-search"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="products" className="flex items-center gap-2" data-testid="tab-products">
            <Package className="w-4 h-4" />
            Products ({products?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="brands" className="flex items-center gap-2" data-testid="tab-brands">
            <Tag className="w-4 h-4" />
            Brands ({brands?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2" data-testid="tab-categories">
            <Folder className="w-4 h-4" />
            Categories ({parentCategories?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4 mt-4">
          {productsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {filteredProducts?.map((product) => {
                    const status = getSeoStatus(product);
                    return (
                      <div 
                        key={product.id} 
                        className="flex items-center justify-between p-4 hover-elevate cursor-pointer"
                        onClick={() => handleEdit('product', product)}
                        data-testid={`row-product-${product.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{product.productName}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <span>SKU: {product.sku}</span>
                            <span className={status.color}>{status.label}</span>
                          </div>
                          {product.slug && (
                            <div className="text-xs text-muted-foreground">/products/{product.slug}</div>
                          )}
                        </div>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); handleEdit('product', product); }}
                          data-testid={`button-edit-product-${product.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="brands" className="space-y-4 mt-4">
          {brandsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {filteredBrands?.map((brand) => {
                    const status = getSeoStatus(brand);
                    return (
                      <div 
                        key={brand.id} 
                        className="flex items-center justify-between p-4 hover-elevate cursor-pointer"
                        onClick={() => handleEdit('brand', brand)}
                        data-testid={`row-brand-${brand.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{brand.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className={status.color}>{status.label}</span>
                          </div>
                          {brand.slug && (
                            <div className="text-xs text-muted-foreground">/brands/{brand.slug}</div>
                          )}
                        </div>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); handleEdit('brand', brand); }}
                          data-testid={`button-edit-brand-${brand.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-4 mt-4">
          {categoriesLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {parentCategories?.map((category) => {
                    const status = getSeoStatus(category);
                    return (
                      <div 
                        key={category.id} 
                        className="flex items-center justify-between p-4 hover-elevate cursor-pointer"
                        onClick={() => handleEdit('category', category)}
                        data-testid={`row-category-${category.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{category.name}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className={status.color}>{status.label}</span>
                          </div>
                          {category.slug && (
                            <div className="text-xs text-muted-foreground">/categories/{category.slug}</div>
                          )}
                        </div>
                        <Button 
                          size="icon" 
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); handleEdit('category', category); }}
                          data-testid={`button-edit-category-${category.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit SEO for {editingSeo?.name}</DialogTitle>
          </DialogHeader>
          
          {editingSeo && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/{editingSeo.type}s/</span>
                  <Input
                    id="slug"
                    value={editingSeo.slug}
                    onChange={(e) => setEditingSeo({ ...editingSeo, slug: e.target.value })}
                    placeholder="url-friendly-slug"
                    data-testid="input-seo-slug"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Used in the URL. Only lowercase letters, numbers, and hyphens.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="metaTitle">Meta Title</Label>
                <Input
                  id="metaTitle"
                  value={editingSeo.metaTitle}
                  onChange={(e) => setEditingSeo({ ...editingSeo, metaTitle: e.target.value })}
                  placeholder="Page title for search engines"
                  maxLength={60}
                  data-testid="input-seo-meta-title"
                />
                <p className="text-xs text-muted-foreground">
                  {editingSeo.metaTitle.length}/60 characters. Optimal length is 50-60 characters.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  value={editingSeo.metaDescription}
                  onChange={(e) => setEditingSeo({ ...editingSeo, metaDescription: e.target.value })}
                  placeholder="Brief description for search engine results"
                  maxLength={160}
                  rows={3}
                  data-testid="input-seo-meta-description"
                />
                <p className="text-xs text-muted-foreground">
                  {editingSeo.metaDescription.length}/160 characters. Optimal length is 120-160 characters.
                </p>
              </div>

              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Search Engine Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="text-blue-600 text-lg hover:underline cursor-pointer truncate">
                    {editingSeo.metaTitle || editingSeo.name} | Pharma Oasis
                  </div>
                  <div className="text-green-700 text-sm">
                    pharmaoasis.com/{editingSeo.type}s/{editingSeo.slug || '...'}
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-2">
                    {editingSeo.metaDescription || `View ${editingSeo.name} at Pharma Oasis - UK's leading pharmaceutical wholesale distributor.`}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel-seo">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving} data-testid="button-save-seo">
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save SEO
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
