import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { PageTracker } from "@/hooks/use-page-tracking";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuoteBasket } from "@/lib/quote-basket";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import type { Product, Brand, Category } from "@shared/schema";
import { 
  Search, 
  Package, 
  ShoppingCart, 
  Filter,
  X,
  Building2,
  Tag,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Lock,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import placeholderImage from "@assets/generated_images/product_placeholder_coming_soon.png";
import { ProductListJsonLd } from "@/components/seo/product-json-ld";

interface PaginatedResponse {
  products: Product[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

function LazyImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={className}>
      {isInView ? (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-contain transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setIsLoaded(true)}
          onError={(e) => {
            (e.target as HTMLImageElement).src = placeholderImage;
            setIsLoaded(true);
          }}
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-muted animate-pulse" />
      )}
    </div>
  );
}

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [brandPopoverOpen, setBrandPopoverOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const { addItem } = useQuoteBasket();
  const { isAuthenticated, isCustomer, isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedBrand]);

  const buildProductsUrl = () => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.append("search", debouncedSearch);
    if (selectedCategory) params.append("category", selectedCategory);
    if (selectedBrand) params.append("brand", selectedBrand);
    params.append("page", String(currentPage));
    params.append("limit", "24");
    return `/api/products?${params.toString()}`;
  };

  const { data, isLoading: productsLoading } = useQuery<PaginatedResponse>({
    queryKey: ["/api/products", debouncedSearch, selectedCategory, selectedBrand, currentPage],
    queryFn: async () => {
      const res = await fetch(buildProductsUrl(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
    staleTime: 30000,
  });

  const products = data?.products || [];
  const pagination = data?.pagination;

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    staleTime: 60000,
  });

  const { data: brands } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
    staleTime: 60000,
  });

  const topLevelCategories = categories?.filter(c => !c.parentId) || [];

  const handleQuantityChange = (productId: number, newQuantity: number) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(1, newQuantity),
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
    setDebouncedSearch("");
    setSelectedCategory("");
    setSelectedBrand("");
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || selectedCategory || selectedBrand;

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null;

    const { page, totalPages, total } = pagination;
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
        <p className="text-sm text-muted-foreground">
          Showing {((page - 1) * pagination.pageSize) + 1} - {Math.min(page * pagination.pageSize, total)} of {total.toLocaleString()} products
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            disabled={page === 1}
            onClick={() => goToPage(page - 1)}
            aria-label="Previous page"
            data-testid="button-prev-page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {pages.map((p, i) => (
            typeof p === 'number' ? (
              <Button
                key={i}
                variant={p === page ? "default" : "outline"}
                size="sm"
                onClick={() => goToPage(p)}
                data-testid={`button-page-${p}`}
              >
                {p}
              </Button>
            ) : (
              <span key={i} className="px-2 text-muted-foreground">...</span>
            )
          ))}
          <Button
            variant="outline"
            size="icon"
            disabled={page === totalPages}
            onClick={() => goToPage(page + 1)}
            aria-label="Next page"
            data-testid="button-next-page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <PublicLayout>
      <PageTracker title="Products" />
      {products && products.length > 0 && (
        <ProductListJsonLd products={products} brands={brands} />
      )}
      <div className="py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Product Catalogue
            </h1>
            <p className="mt-2 text-muted-foreground">
              Browse our extensive range of healthcare, wellness and beauty products
              {pagination && ` (${pagination.total.toLocaleString()} products)`}
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
              <Popover open={brandPopoverOpen} onOpenChange={setBrandPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={brandPopoverOpen}
                    className="w-full sm:w-[200px] justify-between"
                    data-testid="select-brand"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {selectedBrand
                          ? brands?.find((b) => String(b.id) === selectedBrand)?.name
                          : "All Brands"}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search brands..." />
                    <CommandList>
                      <CommandEmpty>No brand found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="all-brands"
                          onSelect={() => {
                            setSelectedBrand("");
                            setBrandPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${!selectedBrand ? "opacity-100" : "opacity-0"}`}
                          />
                          All Brands
                        </CommandItem>
                        {brands?.map((brand) => (
                          <CommandItem
                            key={brand.id}
                            value={brand.name}
                            onSelect={() => {
                              setSelectedBrand(String(brand.id));
                              setBrandPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${selectedBrand === String(brand.id) ? "opacity-100" : "opacity-0"}`}
                            />
                            {brand.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
                    Category: {topLevelCategories.find(c => String(c.id) === selectedCategory)?.name}
                    <button onClick={() => setSelectedCategory("")} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {selectedBrand && (
                  <Badge variant="secondary" className="gap-1">
                    Brand: {brands?.find(b => String(b.id) === selectedBrand)?.name}
                    <button onClick={() => setSelectedBrand("")} className="ml-1">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                  Clear all
                </Button>
              </div>
            )}
          </div>

          {productsLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="aspect-square w-full mb-4" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No products found</h3>
              <p className="text-muted-foreground mb-4">
                {hasActiveFilters 
                  ? "Try adjusting your filters or search terms"
                  : "Check back later for new products"
                }
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <Card key={product.id} className="overflow-hidden" data-testid={`card-product-${product.id}`}>
                    <Link href={`/products/${product.slug || product.id}`}>
                      <div className="aspect-square bg-muted overflow-hidden">
                        <LazyImage
                          src={product.imageUrl || placeholderImage}
                          alt={product.productName}
                          className="w-full h-full"
                        />
                      </div>
                    </Link>
                    <CardContent className="p-4">
                      <Link href={`/products/${product.slug || product.id}`}>
                        <h3 className="font-medium line-clamp-2 hover:text-primary transition-colors mb-1">
                          {product.productName}
                        </h3>
                      </Link>
                      <p className="text-sm text-muted-foreground mb-2">{product.sku}</p>
                      {product.packSize && (
                        <p className="text-sm text-muted-foreground mb-3">{product.packSize}</p>
                      )}
                      
                      <div className="flex items-center gap-2 mb-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuantityChange(product.id, (quantities[product.id] || 1) - 1)}
                          disabled={!isAuthenticated || (!isCustomer && !isAdmin)}
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          value={quantities[product.id] || 1}
                          onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 1)}
                          className="w-16 text-center"
                          disabled={!isAuthenticated || (!isCustomer && !isAdmin)}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuantityChange(product.id, (quantities[product.id] || 1) + 1)}
                          disabled={!isAuthenticated || (!isCustomer && !isAdmin)}
                        >
                          +
                        </Button>
                      </div>

                      {(!isAuthenticated || (!isCustomer && !isAdmin)) ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href="/register">
                              <Button 
                                className="w-full gap-2" 
                                variant="secondary"
                                data-testid={`button-add-quote-${product.id}`}
                              >
                                <Lock className="h-4 w-4" />
                                Register to Quote
                              </Button>
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p>To request quotes and view wholesale prices, please register as an approved customer.</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Button 
                          className="w-full gap-2" 
                          onClick={() => handleAddToQuote(product)}
                          data-testid={`button-add-quote-${product.id}`}
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Add to Quote
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              {renderPagination()}
            </>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
