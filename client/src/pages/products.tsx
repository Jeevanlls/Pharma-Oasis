import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuoteBasket } from "@/lib/quote-basket";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import type { Product, Brand, Category } from "@shared/schema";
import { 
  Search, 
  Package, 
  Plus, 
  Minus, 
  ShoppingCart, 
  Filter,
  X,
  Building2,
  Tag,
  Loader2,
} from "lucide-react";

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const { addItem } = useQuoteBasket();
  const { isAuthenticated, isCustomer, isAdmin } = useAuth();
  const { toast } = useToast();

  const buildProductsUrl = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.append("search", searchQuery);
    if (selectedCategory) params.append("category", selectedCategory);
    if (selectedBrand) params.append("brand", selectedBrand);
    const queryString = params.toString();
    return queryString ? `/api/products?${queryString}` : "/api/products";
  };

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products", searchQuery, selectedCategory, selectedBrand],
    queryFn: async () => {
      const res = await fetch(buildProductsUrl(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: brands } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  const topLevelCategories = categories?.filter(c => !c.parentId) || [];

  const handleQuantityChange = (productId: number, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(1, (prev[productId] || 1) + delta),
    }));
  };

  const handleAddToQuote = (product: Product) => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please login or register to request quotes.",
        variant: "destructive",
      });
      return;
    }

    if (!isCustomer && !isAdmin) {
      toast({
        title: "Account Pending",
        description: "Your account is pending approval. Please wait for our team to review your application.",
        variant: "destructive",
      });
      return;
    }

    const quantity = quantities[product.id] || 1;
    addItem(product, quantity);
    setQuantities(prev => ({ ...prev, [product.id]: 1 }));
    toast({
      title: "Added to Quote",
      description: `${quantity}x ${product.productName} added to your quote basket.`,
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedBrand("");
  };

  const hasActiveFilters = searchQuery || selectedCategory || selectedBrand;

  return (
    <PublicLayout>
      <div className="py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Product Catalogue
            </h1>
            <p className="mt-2 text-muted-foreground">
              Browse our extensive range of healthcare, wellness and beauty products
            </p>
          </div>

          <div className="mb-8 space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row">
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
              <Select value={selectedCategory || "all"} onValueChange={(val) => setSelectedCategory(val === "all" ? "" : val)}>
                <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-category">
                  <Tag className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {topLevelCategories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedBrand || "all"} onValueChange={(val) => setSelectedBrand(val === "all" ? "" : val)}>
                <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-brand">
                  <Building2 className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="All Brands" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Brands</SelectItem>
                  {brands?.map((brand) => (
                    <SelectItem key={brand.id} value={String(brand.id)}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1">
                    Search: {searchQuery}
                    <button onClick={() => setSearchQuery("")} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {selectedCategory && (
                  <Badge variant="secondary" className="gap-1">
                    Category: {categories?.find(c => c.id === Number(selectedCategory))?.name}
                    <button onClick={() => setSelectedCategory("")} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {selectedBrand && (
                  <Badge variant="secondary" className="gap-1">
                    Brand: {brands?.find(b => b.id === Number(selectedBrand))?.name}
                    <button onClick={() => setSelectedBrand("")} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear all
                </Button>
              </div>
            )}
          </div>

          {productsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="mb-4 h-40 w-full rounded-md" />
                    <Skeleton className="mb-2 h-4 w-20" />
                    <Skeleton className="mb-2 h-5 w-full" />
                    <Skeleton className="mb-4 h-4 w-3/4" />
                    <Skeleton className="h-9 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : products && products.length > 0 ? (
            <>
              <p className="mb-4 text-sm text-muted-foreground">
                Showing {products.length} product{products.length !== 1 ? "s" : ""}
              </p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    brands={brands}
                    quantity={quantities[product.id] || 1}
                    onQuantityChange={(delta) => handleQuantityChange(product.id, delta)}
                    onAddToQuote={() => handleAddToQuote(product)}
                    isAuthenticated={isAuthenticated}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="mb-4 h-16 w-16 text-muted-foreground/50" />
              <h2 className="text-xl font-semibold">No products found</h2>
              <p className="mt-2 text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  Clear all filters
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

interface ProductCardProps {
  product: Product;
  brands?: Brand[];
  quantity: number;
  onQuantityChange: (delta: number) => void;
  onAddToQuote: () => void;
  isAuthenticated: boolean;
}

function ProductCard({ product, brands, quantity, onQuantityChange, onAddToQuote, isAuthenticated }: ProductCardProps) {
  const brand = brands?.find(b => b.id === product.brandId);
  
  return (
    <Card className="group flex flex-col overflow-visible" data-testid={`card-product-${product.id}`}>
      <CardContent className="flex flex-1 flex-col p-4">
        <div className="relative mb-4 aspect-square overflow-hidden rounded-md bg-muted">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.productName}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Package className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
          {product.isFeatured && (
            <Badge className="absolute top-2 left-2" variant="default">
              Featured
            </Badge>
          )}
        </div>

        <div className="mb-1 flex items-center gap-2">
          {brand && (
            <Badge variant="outline" className="text-xs">
              {brand.name}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">{product.sku}</span>
        </div>

        <h3 className="mb-1 font-medium leading-tight line-clamp-2" title={product.productName}>
          {product.productName}
        </h3>

        {product.packSize && (
          <p className="mb-2 text-sm text-muted-foreground">{product.packSize}</p>
        )}

        <div className="mt-auto space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <p className="text-lg font-semibold">
                £{Number(product.wholesalePrice).toFixed(2)}
              </p>
              {product.rrp && (
                <p className="text-xs text-muted-foreground">
                  RRP: £{Number(product.rrp).toFixed(2)}
                </p>
              )}
            </div>
            {product.moq && product.moq > 1 && (
              <Badge variant="secondary" className="text-xs">
                MOQ: {product.moq}
              </Badge>
            )}
          </div>

          {isAuthenticated ? (
            <div className="flex gap-2">
              <div className="flex items-center rounded-md border">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-r-none"
                  onClick={() => onQuantityChange(-1)}
                  disabled={quantity <= 1}
                  data-testid={`button-decrease-qty-${product.id}`}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-10 text-center text-sm" data-testid={`text-qty-${product.id}`}>
                  {quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-l-none"
                  onClick={() => onQuantityChange(1)}
                  data-testid={`button-increase-qty-${product.id}`}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <Button
                className="flex-1 gap-1"
                size="sm"
                onClick={onAddToQuote}
                data-testid={`button-add-to-quote-${product.id}`}
              >
                <ShoppingCart className="h-4 w-4" />
                Add
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button variant="outline" className="w-full" size="sm">
                Login to Order
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
