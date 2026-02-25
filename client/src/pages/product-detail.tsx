import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { PublicLayout } from "@/components/layout/public-layout";
import { PageTracker } from "@/hooks/use-page-tracking";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SingleProductJsonLd } from "@/components/seo/product-json-ld";
import { useQuoteBasket } from "@/lib/quote-basket";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import type { Product, Brand, Category } from "@shared/schema";
import {
  ArrowLeft,
  ShoppingCart,
  Package,
  Lock,
  Building2,
  Tag,
  Barcode,
  Layers,
  Box,
  Ruler,
  MapPin,
  Thermometer,
  ChevronRight,
} from "lucide-react";
import placeholderImage from "@assets/generated_images/product_placeholder_coming_soon.png";

export default function ProductDetailPage() {
  const [, params] = useRoute("/products/:idOrSlug");
  const idOrSlug = params?.idOrSlug || "";
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useQuoteBasket();
  const { isAuthenticated, isCustomer, isAdmin } = useAuth();
  const { toast } = useToast();

  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: ["/api/products", idOrSlug],
    queryFn: async () => {
      const res = await fetch(`/api/products/${encodeURIComponent(idOrSlug)}`);
      if (!res.ok) throw new Error("Product not found");
      return res.json();
    },
    enabled: !!idOrSlug,
  });

  const { data: brands } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
    enabled: !!product?.brandId,
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    enabled: !!product?.categoryId,
  });

  const brand = brands?.find(b => b.id === product?.brandId);
  const category = categories?.find(c => c.id === product?.categoryId);

  const handleAddToQuote = () => {
    if (!product) return;
    addItem({
      productId: product.id,
      productName: product.productName,
      sku: product.sku,
      quantity,
    });
    toast({
      title: "Added to quote basket",
      description: `${quantity}x ${product.productName}`,
    });
  };

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Skeleton className="h-6 w-48 mb-6" />
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (error || !product) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 text-center max-w-6xl">
          <Package className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2" data-testid="text-product-not-found">Product Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The product you're looking for doesn't exist or may have been removed.
          </p>
          <Link href="/products">
            <Button data-testid="button-back-to-products">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
          </Link>
        </div>
      </PublicLayout>
    );
  }

  const pageTitle = product.metaTitle || `${product.productName} | Pharma Oasis`;
  const pageDescription = product.metaDescription || product.shortDescription || `Buy ${product.productName} wholesale from Pharma Oasis - MHRA licensed pharmaceutical wholesaler`;

  return (
    <PublicLayout>
      <PageTracker
        title={pageTitle}
        description={pageDescription}
      />
      <SingleProductJsonLd
        product={product}
        brandName={brand?.name}
        categoryName={category?.name}
      />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6" data-testid="nav-breadcrumb">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <Link href="/products" className="hover:text-foreground transition-colors">Products</Link>
          {category && (
            <>
              <ChevronRight className="h-3 w-3" />
              <Link href={`/products?category=${category.id}`} className="hover:text-foreground transition-colors">
                {category.name}
              </Link>
            </>
          )}
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{product.productName}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <div className="space-y-4">
            <div className="aspect-square bg-muted rounded-lg overflow-hidden border" data-testid="img-product-main">
              <img
                src={product.imageUrl || placeholderImage}
                alt={product.productName}
                className="w-full h-full object-contain p-4"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              {brand && (
                <Link href={`/products?brand=${brand.id}`}>
                  <Badge variant="secondary" className="mb-3" data-testid="badge-brand">
                    <Building2 className="h-3 w-3 mr-1" />
                    {brand.name}
                  </Badge>
                </Link>
              )}
              <h1 className="text-2xl lg:text-3xl font-bold mb-2" data-testid="text-product-name">
                {product.productName}
              </h1>
              <p className="text-sm text-muted-foreground" data-testid="text-product-sku">SKU: {product.sku}</p>
              {product.ean && (
                <p className="text-sm text-muted-foreground" data-testid="text-product-ean">EAN: {product.ean}</p>
              )}
            </div>

            {product.shortDescription && (
              <p className="text-muted-foreground" data-testid="text-product-description">
                {product.shortDescription}
              </p>
            )}

            <Card>
              <CardContent className="p-4 space-y-3">
                {product.packSize && (
                  <div className="flex items-center gap-3 text-sm">
                    <Box className="h-4 w-4 text-foreground/80 shrink-0" />
                    <span className="text-muted-foreground">Pack Size:</span>
                    <span className="font-medium" data-testid="text-pack-size">{product.packSize}</span>
                  </div>
                )}
                {product.caseSize && (
                  <div className="flex items-center gap-3 text-sm">
                    <Layers className="h-4 w-4 text-foreground/80 shrink-0" />
                    <span className="text-muted-foreground">Case Size:</span>
                    <span className="font-medium" data-testid="text-case-size">{product.caseSize}</span>
                  </div>
                )}
                {product.uom && (
                  <div className="flex items-center gap-3 text-sm">
                    <Ruler className="h-4 w-4 text-foreground/80 shrink-0" />
                    <span className="text-muted-foreground">Unit of Measure:</span>
                    <span className="font-medium" data-testid="text-uom">{product.uom}</span>
                  </div>
                )}
                {product.moq && product.moq > 1 && (
                  <div className="flex items-center gap-3 text-sm">
                    <Tag className="h-4 w-4 text-foreground/80 shrink-0" />
                    <span className="text-muted-foreground">Min. Order Qty:</span>
                    <span className="font-medium" data-testid="text-moq">{product.moq}</span>
                  </div>
                )}
                {product.countryOfOrigin && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-foreground/80 shrink-0" />
                    <span className="text-muted-foreground">Origin:</span>
                    <span className="font-medium" data-testid="text-origin">{product.countryOfOrigin}</span>
                  </div>
                )}
                {product.storageConditions && (
                  <div className="flex items-center gap-3 text-sm">
                    <Thermometer className="h-4 w-4 text-foreground/80 shrink-0" />
                    <span className="text-muted-foreground">Storage:</span>
                    <span className="font-medium" data-testid="text-storage">{product.storageConditions}</span>
                  </div>
                )}
                {category && (
                  <div className="flex items-center gap-3 text-sm">
                    <Barcode className="h-4 w-4 text-foreground/80 shrink-0" />
                    <span className="text-muted-foreground">Category:</span>
                    <Link href={`/products?category=${category.id}`}>
                      <span className="font-medium hover:text-primary transition-colors" data-testid="text-category">
                        {category.name}
                      </span>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                {(!isAuthenticated || (!isCustomer && !isAdmin)) ? (
                  <div className="text-center space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Register as an approved customer to request quotes and view wholesale pricing.
                    </p>
                    <Link href="/register">
                      <Button className="w-full gap-2" variant="secondary" data-testid="button-register-to-quote">
                        <Lock className="h-4 w-4" />
                        Register to Request a Quote
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        data-testid="button-quantity-decrease"
                      >
                        -
                      </Button>
                      <Input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 text-center"
                        data-testid="input-quantity"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setQuantity(quantity + 1)}
                        data-testid="button-quantity-increase"
                      >
                        +
                      </Button>
                    </div>
                    <Button
                      className="w-full gap-2"
                      onClick={handleAddToQuote}
                      data-testid="button-add-to-quote"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Add to Quote Basket
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {product.longDescription && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold mb-4" data-testid="text-full-description-heading">
              Product Details
            </h2>
            <div className="prose prose-sm max-w-none text-muted-foreground" data-testid="text-full-description">
              {product.longDescription.split('\n').map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t">
          <Link href="/products">
            <Button variant="outline" data-testid="button-back-to-catalogue">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Catalogue
            </Button>
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
