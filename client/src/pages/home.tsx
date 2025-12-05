import * as React from "react";
import { Link } from "wouter";
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
import type { HeroSlide, Brand } from "@shared/schema";
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
} from "lucide-react";

const stats = [
  { value: "3,000+", label: "UK Pharmacies Served" },
  { value: "500+", label: "Premium Brands" },
  { value: "20K+", label: "Products Available" },
  { value: "98%", label: "Order Accuracy" },
];

const features = [
  {
    icon: Shield,
    title: "MHRA Licensed",
    description: "Fully licensed WDA(H) holder ensuring regulatory compliance for all pharmaceutical products.",
  },
  {
    icon: Award,
    title: "GDP Compliant",
    description: "Good Distribution Practice certified supply chain from warehouse to delivery.",
  },
  {
    icon: Truck,
    title: "UK-Wide Delivery",
    description: "Fast, reliable next-day delivery across the United Kingdom with temperature control.",
  },
  {
    icon: Users,
    title: "Dedicated Support",
    description: "Expert account managers providing personalized service and competitive pricing.",
  },
];

const categories = [
  { name: "Pharmaceuticals", count: "5,000+ products" },
  { name: "OTC Medicines", count: "3,500+ products" },
  { name: "Health & Wellness", count: "4,000+ products" },
  { name: "Beauty & Skincare", count: "3,000+ products" },
  { name: "Medical Devices", count: "2,500+ products" },
  { name: "First Aid", count: "1,500+ products" },
];

const processSteps = [
  { step: 1, title: "Register & Get Approved", description: "Complete our simple registration form. Our team reviews and approves qualified healthcare businesses." },
  { step: 2, title: "Browse Products", description: "Access our full catalogue with wholesale pricing on 20,000+ healthcare products." },
  { step: 3, title: "Request a Quote", description: "Add products to your basket and submit a quote request for competitive pricing." },
  { step: 4, title: "Receive & Order", description: "Our team reviews your request and provides a formal quote. Accept and place your order." },
];

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
          {slides.map((slide) => (
            <CarouselItem
              key={slide.id}
              className="pl-0 relative min-h-[500px] sm:min-h-[550px]"
            >
              {slide.imageUrl && (
                <img
                  src={slide.imageUrl}
                  alt={slide.title}
                  className="absolute inset-0 w-full h-full object-cover"
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
    <section className="py-8 bg-muted/50 border-y" data-testid="brand-strip">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-muted-foreground mb-6 uppercase tracking-wider font-medium" data-testid="text-brand-strip-title">
          Trusted Brands We Distribute
        </p>
        <div className="relative overflow-hidden">
          <div 
            className="flex gap-12 animate-marquee"
            style={{
              animation: "marquee 30s linear infinite",
            }}
          >
            {[...brands, ...brands].map((brand, index) => (
              <div
                key={`${brand.id}-${index}`}
                className="flex-shrink-0 flex items-center justify-center h-16 w-32"
                data-testid={`brand-item-${index}`}
              >
                {brand.logoUrl ? (
                  <img
                    src={brand.logoUrl}
                    alt={brand.name}
                    className="max-h-12 max-w-full object-contain grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                  />
                ) : (
                  <span className="text-lg font-semibold text-muted-foreground/60" data-testid={`brand-name-${index}`}>
                    {brand.name}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsBar() {
  return (
    <section className="py-12 bg-sidebar" data-testid="stats-bar">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {stats.map((stat, index) => (
            <div key={stat.label} className="text-center" data-testid={`stat-item-${index}`}>
              <p className="text-3xl font-bold sm:text-4xl text-sidebar-foreground" style={{ fontFamily: "DM Sans, sans-serif" }} data-testid={`stat-value-${index}`}>
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-sidebar-foreground/70" data-testid={`stat-label-${index}`}>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <PublicLayout>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          width: max-content;
        }
      `}</style>

      <HeroCarousel />
      <BrandStrip />
      <StatsBar />

      <section className="py-16 sm:py-24 bg-muted/30">
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
            {features.map((feature) => (
              <Card key={feature.title} className="group relative overflow-visible">
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-24">
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
            {categories.map((category) => (
              <Link key={category.name} href="/products">
                <Card className="group cursor-pointer hover-elevate">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">{category.name}</h3>
                        <p className="text-sm text-muted-foreground">{category.count}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </CardContent>
                </Card>
              </Link>
            ))}
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

      <section className="py-16 sm:py-24 bg-muted/30">
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
            {processSteps.map((item) => (
              <div key={item.step} className="relative">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
                {item.step < 4 && (
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

      <section className="py-16 sm:py-24">
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

      <section className="py-16 sm:py-24 bg-muted">
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
    </PublicLayout>
  );
}
