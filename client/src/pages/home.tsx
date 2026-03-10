import * as React from "react";
import { Link } from "wouter";
import { PageTracker } from "@/hooks/use-page-tracking";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PublicLayout } from "@/components/layout/public-layout";
import { useQuery } from "@tanstack/react-query";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import type { HeroSlide, Brand, HomeStat, HomeFeature, HomeCategory, HomeProcessStep, HomeSection, Offer, OfferItem, Product } from "@shared/schema";
import {
  Package,
  Shield,
  Truck,
  Award,
  Users,
  ArrowRight,
  CheckCircle2,
  Zap,
  Clock,
  Building2,
  ChevronLeft,
  ChevronRight,
  Globe,
  Handshake,
  Ship,
  FileCheck,
  Boxes,
  BadgeCheck,
  Pill,
  Stethoscope,
  Heart,
  Sparkles,
  Activity,
  Cross,
  Tag,
  Flame,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { OrganizationJsonLd, WebsiteJsonLd } from "@/components/seo/product-json-ld";

const iconMap: Record<string, LucideIcon> = {
  Package,
  Shield,
  Truck,
  Award,
  Users,
  ArrowRight,
  CheckCircle2,
  Zap,
  Clock,
  Building2,
  ChevronLeft,
  ChevronRight,
  Globe,
  Handshake,
  Ship,
  FileCheck,
  Boxes,
  BadgeCheck,
  Pill,
  Stethoscope,
  Heart,
  Sparkles,
  Activity,
  Cross,
};

function getIcon(iconName: string | null): LucideIcon {
  if (!iconName) return Package;
  return iconMap[iconName] || Package;
}

function HeroCarousel() {
  const { data: slides = [], isLoading } = useQuery<HeroSlide[]>({
    queryKey: ["/api/home/slides"],
  });

  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);

  React.useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    api.on("select", onSelect);
    onSelect();

    const autoplay = setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext();
      } else {
        api.scrollTo(0);
      }
    }, 5000);

    return () => {
      api.off("select", onSelect);
      clearInterval(autoplay);
    };
  }, [api]);

  if (isLoading || slides.length === 0) {
    return (
      <section className="relative overflow-hidden bg-gradient-to-br from-sidebar via-sidebar to-sidebar/95 min-h-[500px]">
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-6 bg-white/10 text-white border-white/20 backdrop-blur-sm">
              <Zap className="mr-1.5 h-3 w-3" />
              Trusted by 3,000+ UK Pharmacies
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Your Wholesale Partner for{" "}
              <span className="text-sidebar-primary">Healthcare Excellence</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-white/80 max-w-2xl mx-auto">
              Access 20,000+ healthcare products at competitive wholesale prices. 
              Pharma Oasis is a licensed distributor trusted by pharmacies across the United Kingdom.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="w-full sm:w-auto gap-2" data-testid="button-hero-register">
                  Register Your Business
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/products">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="w-full sm:w-auto bg-white/10 text-white border-white/20 backdrop-blur-sm"
                  data-testid="button-hero-browse"
                >
                  Browse Products
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative" data-testid="hero-carousel">
      <Carousel 
        opts={{ loop: true }} 
        setApi={setApi}
        className="w-full"
      >
        <CarouselContent className="ml-0">
          {slides.map((slide, index) => (
            <CarouselItem
              key={slide.id}
              className="pl-0 relative min-h-[500px] sm:min-h-[550px]"
            >
              {slide.imageUrl && (
                <img
                  src={slide.imageUrl}
                  alt={slide.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  width={1920}
                  height={550}
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  decoding={index === 0 ? "sync" : "async"}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
              <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 h-full flex items-center min-h-[500px] sm:min-h-[550px]">
                <div className="max-w-2xl">
                  <Badge variant="outline" className="mb-6 bg-white/10 text-white border-white/20 backdrop-blur-sm">
                    <Zap className="mr-1.5 h-3 w-3" />
                    Trusted by 3,000+ UK Pharmacies
                  </Badge>
                  <h1 
                    className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl mb-4" 
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                    data-testid={`hero-title-${slide.id}`}
                  >
                    {slide.title}
                  </h1>
                  {slide.subtitle && (
                    <p className="text-lg leading-8 text-white/90 mb-6" data-testid={`hero-subtitle-${slide.id}`}>
                      {slide.subtitle}
                    </p>
                  )}
                  {slide.ctaLabel && slide.ctaHref && (
                    <Link href={slide.ctaHref}>
                      <Button 
                        size="lg" 
                        className="gap-2"
                        data-testid={`hero-cta-${slide.id}`}
                      >
                        {slide.ctaLabel}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {slides.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 text-white backdrop-blur-sm z-10"
            onClick={() => api?.scrollPrev()}
            data-testid="button-hero-prev"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 text-white backdrop-blur-sm z-10"
            onClick={() => api?.scrollNext()}
            data-testid="button-hero-next"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === current 
                    ? "bg-white w-8" 
                    : "bg-white/50"
                }`}
                onClick={() => api?.scrollTo(index)}
                data-testid={`hero-dot-${index}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function BrandStrip() {
  const { data: brands = [], isLoading } = useQuery<Brand[]>({
    queryKey: ["/api/home/brands"],
  });

  if (isLoading || brands.length === 0) {
    return null;
  }

  return (
    <section className="py-10 bg-background border-y" data-testid="brand-strip">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-muted-foreground mb-8 uppercase tracking-wider font-medium" data-testid="text-brand-strip-title">
          Trusted Brands We Distribute
        </p>
        <div className="relative overflow-hidden">
          <div 
            className="flex gap-16 animate-marquee"
            style={{
              animation: "marquee 40s linear infinite",
            }}
          >
            {[...brands, ...brands].map((brand, index) => (
              <div
                key={`${brand.id}-${index}`}
                className="flex-shrink-0 flex flex-col items-center justify-center gap-2"
                data-testid={`brand-item-${index}`}
              >
                {brand.logoUrl ? (
                  <div className="h-14 w-36 flex items-center justify-center bg-card rounded-lg p-2 border shadow-sm">
                    <img
                      src={brand.logoUrl}
                      alt={brand.name}
                      className="max-h-10 max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-14 w-36 flex items-center justify-center bg-card rounded-lg p-2 border shadow-sm">
                    <span className="text-sm font-semibold text-foreground">
                      {brand.name}
                    </span>
                  </div>
                )}
                <span className="text-xs font-medium text-muted-foreground" data-testid={`brand-name-${index}`}>
                  {brand.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function OfferProductsSection() {
  const placeholderImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' fill='%23f1f5f9'%3E%3Crect width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-size='14'%3ENo Image%3C/text%3E%3C/svg%3E";

  const { data: offers = [] } = useQuery<Offer[]>({
    queryKey: ["/api/offers"],
  });

  const activeOfferIds = offers.filter(o => o.isActive).map(o => o.id);

  const { data: allItems = [] } = useQuery<(OfferItem & { product: Product })[]>({
    queryKey: ["/api/offers/items/all", activeOfferIds],
    queryFn: async () => {
      if (activeOfferIds.length === 0) return [];
      const results = await Promise.all(
        activeOfferIds.map(id =>
          fetch(`/api/offers/${id}/items`).then(r => r.json())
        )
      );
      return results.flat();
    },
    enabled: activeOfferIds.length > 0,
  });

  if (allItems.length === 0) return null;

  const offerMap = new Map(offers.map(o => [o.id, o]));

  return (
    <section className="py-12 bg-gradient-to-b from-background to-muted/30" data-testid="offer-products-section">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
              <Flame className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight" style={{ fontFamily: "DM Sans, sans-serif" }} data-testid="text-offers-title">
                Hot Offers
              </h2>
              <p className="text-sm text-muted-foreground">Limited time deals — first come, first served</p>
            </div>
          </div>
          <Link href="/offers">
            <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-view-all-offers">
              View All Offers <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="relative overflow-hidden">
          <div
            className="flex gap-5 animate-offer-scroll"
            style={{ animation: "offerScroll 45s linear infinite", width: "max-content" }}
          >
            {[...allItems, ...allItems].map((item, index) => {
              const offer = offerMap.get(item.offerId);
              const offerPrice = item.offerPrice ? parseFloat(item.offerPrice) : null;
              const originalPrice = item.originalPrice ? parseFloat(item.originalPrice) : null;
              const discount = originalPrice && offerPrice ? Math.round(((originalPrice - offerPrice) / originalPrice) * 100) : null;

              return (
                <Link key={`${item.id}-${index}`} href={`/products/${item.product?.slug || item.product?.id}`}>
                  <Card
                    className="w-[200px] shrink-0 overflow-hidden group cursor-pointer border"
                    data-testid={`card-home-offer-${item.productId}-${index}`}
                  >
                    <div className="relative aspect-square bg-muted overflow-hidden">
                      <img
                        src={item.product?.imageUrl || placeholderImage}
                        alt={item.product?.productName}
                        className="w-full h-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      {discount && discount > 0 && (
                        <Badge className="absolute top-2 left-2 bg-red-500 text-white border-0 text-xs px-1.5 py-0.5">
                          -{discount}%
                        </Badge>
                      )}
                      {offer && (
                        <Badge variant="secondary" className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 max-w-[100px] truncate">
                          <Tag className="h-2.5 w-2.5 mr-0.5 shrink-0" />
                          {offer.title?.split(' ').slice(0, 2).join(' ')}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-3 space-y-1.5">
                      <h3 className="text-xs font-semibold line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                        {item.product?.productName}
                      </h3>
                      <div className="flex items-baseline gap-1.5">
                        {offerPrice ? (
                          <>
                            <span className="text-sm font-bold text-green-600">£{offerPrice.toFixed(2)}</span>
                            {originalPrice && originalPrice > offerPrice && (
                              <span className="text-xs text-muted-foreground line-through">£{originalPrice.toFixed(2)}</span>
                            )}
                          </>
                        ) : (
                          <span className="text-sm font-bold text-amber-600">POA</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsBar() {
  const { data: stats = [], isLoading } = useQuery<HomeStat[]>({
    queryKey: ["/api/home/stats"],
  });

  if (isLoading || stats.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-sidebar" data-testid="stats-bar">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-8">
          {stats.map((stat, index) => (
            <div key={stat.id} className="text-center" data-testid={`stat-item-${index}`}>
              {stat.type === "badge" ? (
                <>
                  <Badge variant="outline" className="bg-sidebar-primary/20 text-sidebar-primary border-sidebar-primary/40 px-3 py-1 text-lg font-bold">
                    {stat.value}
                  </Badge>
                  <p className="mt-2 text-sm text-sidebar-foreground/70" data-testid={`stat-label-${index}`}>{stat.label}</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold sm:text-4xl text-sidebar-foreground" style={{ fontFamily: "DM Sans, sans-serif" }} data-testid={`stat-value-${index}`}>
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-sidebar-foreground/70" data-testid={`stat-label-${index}`}>{stat.label}</p>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DynamicPartnerSection({ section }: { section: HomeSection }) {
  const bulletPoints = section.bulletPoints ? JSON.parse(section.bulletPoints) : [];
  const cardItems = section.cardItems ? JSON.parse(section.cardItems) : [];
  const BadgeIconComponent = getIcon(section.badgeIcon);
  const PrimaryCtaIcon = getIcon(section.primaryCtaIcon);
  const CardIconComponent = getIcon(section.cardIcon);

  return (
    <section className="py-16 sm:py-20 bg-gradient-to-br from-primary/5 via-background to-accent/5" data-testid={`section-${section.sectionKey}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center">
          <div>
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              <BadgeIconComponent className="mr-1.5 h-3 w-3" />
              {section.badgeText}
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4" style={{ fontFamily: "DM Sans, sans-serif" }}>
              {section.title}
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              {section.subtitle}
            </p>
            {section.description && (
              <p className="text-muted-foreground mb-6">
                {section.description}
              </p>
            )}
            {bulletPoints.length > 0 && (
              <ul className="space-y-3 mb-8">
                {bulletPoints.map((item: string) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-foreground font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-col sm:flex-row gap-4">
              {section.primaryCtaLabel && section.primaryCtaHref && (
                <Link href={section.primaryCtaHref}>
                  <Button size="lg" className="w-full sm:w-auto gap-2" data-testid={`button-${section.sectionKey}-primary`}>
                    <PrimaryCtaIcon className="h-4 w-4" />
                    {section.primaryCtaLabel}
                  </Button>
                </Link>
              )}
              {section.secondaryCtaLabel && section.secondaryCtaHref && (
                <Link href={section.secondaryCtaHref}>
                  <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2" data-testid={`button-${section.sectionKey}-secondary`}>
                    {section.secondaryCtaLabel}
                  </Button>
                </Link>
              )}
            </div>
          </div>
          <div className="relative">
            <Card className="p-8 bg-card border shadow-lg">
              <div className="text-center mb-6">
                <CardIconComponent className="h-12 w-12 mx-auto text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{section.cardTitle}</h3>
                <p className="text-sm text-muted-foreground">{section.cardSubtitle}</p>
              </div>
              <div className="space-y-4">
                {cardItems.map((item: { icon: string; title?: string; description?: string; value?: string; label?: string }, idx: number) => {
                  const ItemIcon = getIcon(item.icon);
                  if (item.title && item.description) {
                    return (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <ItemIcon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

function DynamicExportSection({ section }: { section: HomeSection }) {
  const bulletPoints = section.bulletPoints ? JSON.parse(section.bulletPoints) : [];
  const cardItems = section.cardItems ? JSON.parse(section.cardItems) : [];
  const BadgeIconComponent = getIcon(section.badgeIcon);
  const PrimaryCtaIcon = getIcon(section.primaryCtaIcon);
  const CardIconComponent = getIcon(section.cardIcon);

  return (
    <section className="py-16 sm:py-20 bg-muted/30" data-testid={`section-${section.sectionKey}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center">
          <div className="order-2 lg:order-1">
            <Card className="p-8 bg-card border shadow-lg">
              <div className="text-center mb-6">
                <CardIconComponent className="h-12 w-12 mx-auto text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">{section.cardTitle}</h3>
                <p className="text-sm text-muted-foreground">{section.cardSubtitle}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {cardItems.map((item: { icon: string; value?: string; label?: string }, idx: number) => {
                  const ItemIcon = getIcon(item.icon);
                  if (item.value && item.label) {
                    return (
                      <div key={idx} className="text-center p-4 rounded-lg bg-muted/50">
                        <ItemIcon className="h-8 w-8 mx-auto mb-2 text-primary" />
                        <p className="font-semibold">{item.value}</p>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </Card>
          </div>
          <div className="order-1 lg:order-2">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
              <BadgeIconComponent className="mr-1.5 h-3 w-3" />
              {section.badgeText}
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4" style={{ fontFamily: "DM Sans, sans-serif" }}>
              {section.title}
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              {section.subtitle}
            </p>
            {section.description && (
              <p className="text-muted-foreground mb-6">
                {section.description}
              </p>
            )}
            {bulletPoints.length > 0 && (
              <ul className="space-y-3 mb-8">
                {bulletPoints.map((item: string) => (
                  <li key={item} className="flex items-center gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-foreground font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-col sm:flex-row gap-4">
              {section.primaryCtaLabel && section.primaryCtaHref && (
                <Link href={section.primaryCtaHref}>
                  <Button size="lg" className="w-full sm:w-auto gap-2" data-testid={`button-${section.sectionKey}-primary`}>
                    <PrimaryCtaIcon className="h-4 w-4" />
                    {section.primaryCtaLabel}
                  </Button>
                </Link>
              )}
              {section.secondaryCtaLabel && section.secondaryCtaHref && (
                <Link href={section.secondaryCtaHref}>
                  <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2" data-testid={`button-${section.sectionKey}-secondary`}>
                    {section.secondaryCtaLabel}
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HomeSectionsRenderer() {
  const { data: sections = [], isLoading } = useQuery<HomeSection[]>({
    queryKey: ["/api/home/sections"],
  });

  if (isLoading || sections.length === 0) {
    return null;
  }

  return (
    <>
      {sections.map((section) => {
        if (section.sectionKey === "partner_with_us") {
          return <DynamicPartnerSection key={section.id} section={section} />;
        }
        if (section.sectionKey === "export_services") {
          return <DynamicExportSection key={section.id} section={section} />;
        }
        return null;
      })}
    </>
  );
}

function FeaturesSection() {
  const { data: features = [], isLoading } = useQuery<HomeFeature[]>({
    queryKey: ["/api/home/features"],
  });

  if (isLoading || features.length === 0) {
    return null;
  }

  return (
    <section className="py-16 sm:py-24 bg-muted/30" data-testid="features-section">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">Why Choose Us</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ fontFamily: "DM Sans, sans-serif" }}>
            A Partner You Can Trust
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            We combine regulatory excellence with exceptional service to support your pharmacy's success.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const IconComponent = getIcon(feature.iconName);
            return (
              <Card key={feature.id} className="group relative overflow-visible">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <IconComponent className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CategoriesSection() {
  const { data: categories = [], isLoading } = useQuery<HomeCategory[]>({
    queryKey: ["/api/home/categories"],
  });

  if (isLoading || categories.length === 0) {
    return null;
  }

  return (
    <section className="py-16 sm:py-24" data-testid="categories-section">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">Product Categories</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ fontFamily: "DM Sans, sans-serif" }}>
            Comprehensive Healthcare Range
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            From pharmaceuticals to wellness products, we've got your pharmacy covered.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => {
            const IconComponent = getIcon(category.iconName);
            return (
              <Link key={category.id} href={category.linkHref || "/products"}>
                <Card className="group cursor-pointer hover-elevate">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">{category.name}</h3>
                        <p className="text-sm text-muted-foreground">{category.productCount}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Link href="/products">
            <Button variant="outline" size="lg" className="gap-2">
              View Full Catalogue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function ProcessSection() {
  const { data: steps = [], isLoading } = useQuery<HomeProcessStep[]>({
    queryKey: ["/api/home/process-steps"],
  });

  if (isLoading || steps.length === 0) {
    return null;
  }

  return (
    <section className="py-16 sm:py-24 bg-muted/30" data-testid="process-section">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">How It Works</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ fontFamily: "DM Sans, sans-serif" }}>
            Simple Quote-Based Ordering
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Our streamlined process makes ordering healthcare products easy and transparent.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((item, index) => (
            <div key={item.id} className="relative">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
                  {item.stepNumber}
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-6 left-[60%] w-[80%] border-t-2 border-dashed border-muted-foreground/30" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/how-to-order">
            <Button variant="outline" size="lg" className="gap-2">
              Learn More
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function SupplierSection() {
  return (
    <section className="py-16 sm:py-24" data-testid="supplier-section">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 items-center">
          <div>
            <Badge variant="secondary" className="mb-4">For Suppliers</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Partner With Us
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Are you a manufacturer or supplier looking to expand your distribution in the UK healthcare market? 
              Partner with Pharma Oasis and reach thousands of pharmacies nationwide.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                "Access to 3,000+ UK pharmacies",
                "Established distribution network",
                "Marketing support and brand visibility",
                "Dedicated partnership management",
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/supplier-registration">
              <Button size="lg" className="gap-2" data-testid="button-supplier-register">
                <Building2 className="h-4 w-4" />
                Register as Supplier
              </Button>
            </Link>
          </div>
          <div className="relative">
            <Card className="p-8 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-4">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="font-semibold text-2xl">24-48h</p>
                  <p className="text-sm text-muted-foreground">Application Review</p>
                </div>
                <div className="text-center p-4">
                  <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="font-semibold text-2xl">500+</p>
                  <p className="text-sm text-muted-foreground">Brand Partners</p>
                </div>
                <div className="text-center p-4">
                  <Truck className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="font-semibold text-2xl">UK-Wide</p>
                  <p className="text-sm text-muted-foreground">Distribution</p>
                </div>
                <div className="text-center p-4">
                  <Award className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="font-semibold text-2xl">GDP</p>
                  <p className="text-sm text-muted-foreground">Certified</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-16 sm:py-24 bg-muted" data-testid="cta-section">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6 text-foreground" style={{ fontFamily: "DM Sans, sans-serif" }}>
          Ready to Get Started?
        </h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Join thousands of UK pharmacies who trust Pharma Oasis for their wholesale healthcare needs.
          Register today and get access to competitive pricing.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register">
            <Button 
              size="lg" 
              className="w-full sm:w-auto gap-2"
              data-testid="button-cta-register"
            >
              Register Now
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/contact">
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full sm:w-auto"
            >
              Contact Sales
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <PublicLayout>
      <PageTracker title="Home" />
      <OrganizationJsonLd />
      <WebsiteJsonLd />
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          width: max-content;
        }
        @keyframes offerScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-offer-scroll:hover {
          animation-play-state: paused !important;
        }
      `}</style>

      <HeroCarousel />
      <BrandStrip />
      <OfferProductsSection />
      <StatsBar />
      <HomeSectionsRenderer />
      <FeaturesSection />
      <CategoriesSection />
      <ProcessSection />
      <SupplierSection />
      <CTASection />
    </PublicLayout>
  );
}
