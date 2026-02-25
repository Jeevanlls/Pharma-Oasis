import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/public-layout";
import { PageTracker } from "@/hooks/use-page-tracking";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuoteBasket } from "@/lib/quote-basket";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import type { Offer, OfferItem, Product } from "@shared/schema";
import {
  ShoppingCart,
  Lock,
  Clock,
  Percent,
  Tag,
  Flame,
  ChevronRight,
  ArrowRight,
  Package,
} from "lucide-react";
import placeholderImage from "@assets/generated_images/product_placeholder_coming_soon.png";

function CountdownTimer({ endDate }: { endDate: string | Date }) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(endDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(endDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  function getTimeLeft(end: string | Date) {
    const diff = new Date(end).getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    };
  }

  return (
    <div className="flex gap-3 justify-center" data-testid="countdown-timer">
      {[
        { value: timeLeft.days, label: "Days" },
        { value: timeLeft.hours, label: "Hours" },
        { value: timeLeft.minutes, label: "Mins" },
        { value: timeLeft.seconds, label: "Secs" },
      ].map(({ value, label }) => (
        <div key={label} className="flex flex-col items-center">
          <div className="bg-background/90 backdrop-blur-sm border rounded-lg w-16 h-16 flex items-center justify-center">
            <span className="text-2xl font-bold tabular-nums">{String(value).padStart(2, "0")}</span>
          </div>
          <span className="text-xs text-muted-foreground mt-1">{label}</span>
        </div>
      ))}
    </div>
  );
}

function OfferProductCard({
  item,
  quantities,
  onQuantityChange,
  onAddToQuote,
  isAuthenticated,
  isCustomer,
  isAdmin,
}: {
  item: OfferItem & { product: Product };
  quantities: Record<number, number>;
  onQuantityChange: (id: number, qty: number) => void;
  onAddToQuote: (item: OfferItem & { product: Product }) => void;
  isAuthenticated: boolean;
  isCustomer: boolean;
  isAdmin: boolean;
}) {
  const originalPrice = item.originalPrice ? parseFloat(item.originalPrice) : null;
  const offerPrice = parseFloat(item.offerPrice);
  const discount = originalPrice ? Math.round(((originalPrice - offerPrice) / originalPrice) * 100) : null;

  return (
    <Card className="overflow-hidden group relative" data-testid={`card-offer-product-${item.productId}`}>
      {discount && discount > 0 && (
        <div className="absolute top-3 left-3 z-10">
          <Badge className="bg-red-500 text-white border-0 font-bold text-sm px-2.5 py-1" data-testid={`badge-discount-${item.productId}`}>
            -{discount}%
          </Badge>
        </div>
      )}
      {item.discountLabel && (
        <div className="absolute top-3 right-3 z-10">
          <Badge variant="secondary" className="font-semibold" data-testid={`badge-label-${item.productId}`}>
            {item.discountLabel}
          </Badge>
        </div>
      )}

      <Link href={`/products/${item.product.slug || item.product.id}`}>
        <div className="aspect-square bg-muted overflow-hidden">
          <img
            src={item.product.imageUrl || placeholderImage}
            alt={item.product.productName}
            className="w-full h-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      </Link>

      <CardContent className="p-4 space-y-3">
        <Link href={`/products/${item.product.slug || item.product.id}`}>
          <h3 className="font-semibold line-clamp-2 hover:text-primary transition-colors text-sm" data-testid={`text-product-name-${item.productId}`}>
            {item.product.productName}
          </h3>
        </Link>

        <p className="text-xs text-muted-foreground">SKU: {item.product.sku}</p>

        {item.product.packSize && (
          <p className="text-xs text-muted-foreground">{item.product.packSize}</p>
        )}

        {isAuthenticated && (isCustomer || isAdmin) && (
          <div className="flex items-baseline gap-2" data-testid={`text-pricing-${item.productId}`}>
            <span className="text-lg font-bold text-green-600">
              £{offerPrice.toFixed(2)}
            </span>
            {originalPrice && originalPrice > offerPrice && (
              <span className="text-sm text-muted-foreground line-through">
                £{originalPrice.toFixed(2)}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onQuantityChange(item.productId, (quantities[item.productId] || 1) - 1)}
            disabled={!isAuthenticated || (!isCustomer && !isAdmin)}
            data-testid={`button-qty-minus-${item.productId}`}
          >
            -
          </Button>
          <Input
            type="number"
            min="1"
            value={quantities[item.productId] || 1}
            onChange={(e) => onQuantityChange(item.productId, parseInt(e.target.value) || 1)}
            className="w-16 text-center"
            disabled={!isAuthenticated || (!isCustomer && !isAdmin)}
            data-testid={`input-quantity-${item.productId}`}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => onQuantityChange(item.productId, (quantities[item.productId] || 1) + 1)}
            disabled={!isAuthenticated || (!isCustomer && !isAdmin)}
            data-testid={`button-qty-plus-${item.productId}`}
          >
            +
          </Button>
        </div>

        {(!isAuthenticated || (!isCustomer && !isAdmin)) ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/register">
                <Button className="w-full gap-2" variant="secondary" data-testid={`button-register-quote-${item.productId}`}>
                  <Lock className="h-4 w-4" />
                  Register to Quote
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p>Register as an approved customer to request quotes at offer prices.</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            className="w-full gap-2"
            onClick={() => onAddToQuote(item)}
            data-testid={`button-add-quote-${item.productId}`}
          >
            <ShoppingCart className="h-4 w-4" />
            Add to Quote
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function OffersPage() {
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const { addItem } = useQuoteBasket();
  const { isAuthenticated, isCustomer, isAdmin } = useAuth();
  const { toast } = useToast();

  const { data: activeOffers = [], isLoading: offersLoading } = useQuery<Offer[]>({
    queryKey: ["/api/offers"],
  });

  const handleQuantityChange = (productId: number, qty: number) => {
    if (qty < 1) qty = 1;
    setQuantities(prev => ({ ...prev, [productId]: qty }));
  };

  const handleAddToQuote = (item: OfferItem & { product: Product }) => {
    const qty = quantities[item.productId] || 1;
    addItem(item.product, qty);
    toast({
      title: "Added to quote basket",
      description: `${qty}x ${item.product.productName} at offer price`,
    });
  };

  if (offersLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-12 max-w-7xl">
          <Skeleton className="h-64 w-full rounded-2xl mb-8" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="aspect-square w-full mb-4 rounded-lg" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (activeOffers.length === 0) {
    return (
      <PublicLayout>
        <PageTracker title="Offers | Pharma Oasis" description="Current wholesale pharmaceutical offers and deals" />
        <div className="container mx-auto px-4 py-16 text-center max-w-4xl">
          <div className="bg-gradient-to-br from-muted/50 to-muted rounded-3xl p-12">
            <Tag className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
            <h1 className="text-3xl font-bold mb-3" data-testid="text-no-offers">No Active Offers</h1>
            <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
              We're preparing new wholesale offers. Check back soon for exclusive deals on pharmaceutical products.
            </p>
            <Link href="/products">
              <Button size="lg" data-testid="button-browse-products">
                Browse All Products
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <PageTracker title="Offers | Pharma Oasis" description="Current wholesale pharmaceutical offers and deals" />

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6" data-testid="nav-breadcrumb">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">Offers</span>
        </nav>

        {activeOffers.map((offer) => (
          <OfferSection
            key={offer.id}
            offer={offer}
            quantities={quantities}
            onQuantityChange={handleQuantityChange}
            onAddToQuote={handleAddToQuote}
            isAuthenticated={isAuthenticated}
            isCustomer={isCustomer}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    </PublicLayout>
  );
}

function OfferSection({
  offer,
  quantities,
  onQuantityChange,
  onAddToQuote,
  isAuthenticated,
  isCustomer,
  isAdmin,
}: {
  offer: Offer;
  quantities: Record<number, number>;
  onQuantityChange: (id: number, qty: number) => void;
  onAddToQuote: (item: OfferItem & { product: Product }) => void;
  isAuthenticated: boolean;
  isCustomer: boolean;
  isAdmin: boolean;
}) {
  const { data: offerItems = [], isLoading } = useQuery<(OfferItem & { product: Product })[]>({
    queryKey: ["/api/offers", offer.id, "items"],
    queryFn: async () => {
      const res = await fetch(`/api/offers/${offer.id}/items`);
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
  });

  const badgeColorMap: Record<string, string> = {
    red: "bg-red-500",
    green: "bg-green-500",
    blue: "bg-blue-500",
    orange: "bg-orange-500",
    purple: "bg-purple-500",
    yellow: "bg-yellow-500",
  };

  return (
    <section className="mb-16" data-testid={`section-offer-${offer.id}`}>
      {offer.heroImageUrl ? (
        <div className="relative rounded-2xl overflow-hidden mb-8">
          <img
            src={offer.heroImageUrl}
            alt={offer.heroTitle || offer.title}
            className="w-full h-64 md:h-80 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Badge className={`${badgeColorMap[offer.badgeColor || "red"] || "bg-red-500"} text-white border-0 font-bold`}>
                <Flame className="h-3 w-3 mr-1" />
                {offer.badgeText || "OFFER"}
              </Badge>
            </div>
            <h2 className="text-2xl md:text-4xl font-bold mb-2" data-testid={`text-offer-title-${offer.id}`}>
              {offer.heroTitle || offer.title}
            </h2>
            {offer.heroSubtitle && (
              <p className="text-sm md:text-lg text-white/80 max-w-2xl">{offer.heroSubtitle}</p>
            )}
            <div className="mt-4">
              <CountdownTimer endDate={offer.endDate} />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl p-6 md:p-10 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge className={`${badgeColorMap[offer.badgeColor || "red"] || "bg-red-500"} text-white border-0 font-bold`}>
                  <Flame className="h-3 w-3 mr-1" />
                  {offer.badgeText || "OFFER"}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  Limited Time
                </Badge>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2" data-testid={`text-offer-title-${offer.id}`}>
                {offer.title}
              </h2>
              {offer.description && (
                <p className="text-muted-foreground max-w-2xl">{offer.description}</p>
              )}
            </div>
            <CountdownTimer endDate={offer.endDate} />
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="aspect-square w-full mb-4 rounded-lg" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : offerItems.length === 0 ? (
        <div className="text-center py-8">
          <Package className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Products coming soon for this offer.</p>
        </div>
      ) : offer.displayStyle === "featured" ? (
        <div className="space-y-6">
          {offerItems.length > 0 && (
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="aspect-square bg-muted rounded-xl overflow-hidden border">
                <img
                  src={offerItems[0].product.imageUrl || placeholderImage}
                  alt={offerItems[0].product.productName}
                  className="w-full h-full object-contain p-8"
                />
              </div>
              <div className="flex flex-col justify-center space-y-4 p-4">
                <Badge className="w-fit bg-red-500 text-white border-0 font-bold text-lg px-4 py-2">
                  <Percent className="h-4 w-4 mr-2" />
                  FEATURED DEAL
                </Badge>
                <h3 className="text-2xl font-bold">{offerItems[0].product.productName}</h3>
                {offerItems[0].product.shortDescription && (
                  <p className="text-muted-foreground">{offerItems[0].product.shortDescription}</p>
                )}
                {isAuthenticated && (isCustomer || isAdmin) && (
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold text-green-600">£{parseFloat(offerItems[0].offerPrice).toFixed(2)}</span>
                    {offerItems[0].originalPrice && (
                      <span className="text-xl text-muted-foreground line-through">£{parseFloat(offerItems[0].originalPrice).toFixed(2)}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          {offerItems.length > 1 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {offerItems.slice(1).map((item) => (
                <OfferProductCard
                  key={item.id}
                  item={item}
                  quantities={quantities}
                  onQuantityChange={onQuantityChange}
                  onAddToQuote={onAddToQuote}
                  isAuthenticated={isAuthenticated}
                  isCustomer={isCustomer}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          )}
        </div>
      ) : offer.displayStyle === "list" ? (
        <div className="space-y-4">
          {offerItems.map((item) => {
            const originalPrice = item.originalPrice ? parseFloat(item.originalPrice) : null;
            const offerPrice = parseFloat(item.offerPrice);
            const discount = originalPrice ? Math.round(((originalPrice - offerPrice) / originalPrice) * 100) : null;
            return (
              <Card key={item.id} className="overflow-hidden" data-testid={`card-offer-list-${item.productId}`}>
                <div className="flex flex-col sm:flex-row">
                  <Link href={`/products/${item.product.slug || item.product.id}`}>
                    <div className="w-full sm:w-40 h-40 bg-muted shrink-0">
                      <img
                        src={item.product.imageUrl || placeholderImage}
                        alt={item.product.productName}
                        className="w-full h-full object-contain p-3"
                        loading="lazy"
                      />
                    </div>
                  </Link>
                  <CardContent className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {discount && discount > 0 && (
                          <Badge className="bg-red-500 text-white border-0 text-xs">-{discount}%</Badge>
                        )}
                        {item.discountLabel && <Badge variant="secondary" className="text-xs">{item.discountLabel}</Badge>}
                      </div>
                      <Link href={`/products/${item.product.slug || item.product.id}`}>
                        <h3 className="font-semibold hover:text-primary transition-colors">{item.product.productName}</h3>
                      </Link>
                      <p className="text-xs text-muted-foreground mt-1">SKU: {item.product.sku}</p>
                      {isAuthenticated && (isCustomer || isAdmin) && (
                        <div className="flex items-baseline gap-2 mt-2">
                          <span className="text-lg font-bold text-green-600">£{offerPrice.toFixed(2)}</span>
                          {originalPrice && originalPrice > offerPrice && (
                            <span className="text-sm text-muted-foreground line-through">£{originalPrice.toFixed(2)}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(!isAuthenticated || (!isCustomer && !isAdmin)) ? (
                        <Link href="/register">
                          <Button variant="secondary" className="gap-2">
                            <Lock className="h-4 w-4" />
                            Register
                          </Button>
                        </Link>
                      ) : (
                        <Button onClick={() => onAddToQuote(item)} className="gap-2" data-testid={`button-add-quote-list-${item.productId}`}>
                          <ShoppingCart className="h-4 w-4" />
                          Add to Quote
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {offerItems.map((item) => (
            <OfferProductCard
              key={item.id}
              item={item}
              quantities={quantities}
              onQuantityChange={onQuantityChange}
              onAddToQuote={onAddToQuote}
              isAuthenticated={isAuthenticated}
              isCustomer={isCustomer}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </section>
  );
}
