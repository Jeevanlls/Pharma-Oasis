import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Factory, 
  Building2, 
  Truck,
  Globe,
  Phone,
  Users,
  Pill,
  ShoppingCart,
  Store,
  Building,
  Heart,
  Package,
  ArrowRight,
  MapPin
} from "lucide-react";

interface HubCardProps {
  title: string;
  location: string;
  country: string;
  isPrimary?: boolean;
  delay?: number;
}

function HubCard({ title, location, country, isPrimary, delay = 0 }: HubCardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <Card className={`relative overflow-visible ${isPrimary ? "ring-2 ring-primary/50" : ""}`}>
        <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 animate-pulse" />
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              isPrimary ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-sm leading-tight">{title}</h4>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{location}</span>
              </div>
              <Badge variant="outline" className="mt-2 text-xs">
                {country}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface SourceItemProps {
  icon: React.ElementType;
  label: string;
  delay?: number;
}

function SourceItem({ icon: Icon, label, delay = 0 }: SourceItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`flex items-center gap-3 rounded-xl bg-card border p-3 transition-all duration-500 hover-elevate ${
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
      }`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

interface CustomerItemProps {
  icon: React.ElementType;
  label: string;
  delay?: number;
}

function CustomerItem({ icon: Icon, label, delay = 0 }: CustomerItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`flex items-center gap-3 rounded-xl bg-card border p-3 transition-all duration-500 hover-elevate ${
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
      }`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function AnimatedConnector({ direction = "right", className = "" }: { direction?: "right" | "down"; className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      {direction === "right" ? (
        <svg width="60" height="24" viewBox="0 0 60 24" className="text-primary/40">
          <path
            d="M0 12 H60"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="6 4"
            className="animate-dash"
            fill="none"
          />
          <polygon points="55,6 60,12 55,18" fill="currentColor" className="text-primary/60" />
        </svg>
      ) : (
        <svg width="24" height="40" viewBox="0 0 24 40" className="text-primary/40">
          <path
            d="M12 0 V40"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="6 4"
            className="animate-dash"
            fill="none"
          />
          <polygon points="6,35 12,40 18,35" fill="currentColor" className="text-primary/60" />
        </svg>
      )}
    </div>
  );
}

function SalesTeamCard({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 p-3 cursor-pointer transition-all hover:border-primary/40 hover:shadow-md">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">{title}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-sm">{description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function DistributionNetwork() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sectionRef} className="w-full">
      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -20;
          }
        }
        .animate-dash {
          animation: dash 1s linear infinite;
        }
        @keyframes flow-right {
          0% { transform: translateX(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        .animate-flow-right {
          animation: flow-right 2s ease-in-out infinite;
        }
      `}</style>

      <div className={`transition-all duration-1000 ${isVisible ? "opacity-100" : "opacity-0"}`}>
        <div className="grid gap-8 lg:grid-cols-[1fr_2fr_1fr] lg:gap-6">
          
          <div className="space-y-4">
            <div className="text-center lg:text-left">
              <h3 className="text-lg font-semibold text-primary" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Supply Sources
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">Direct relationships only</p>
            </div>
            <div className="space-y-3">
              <SourceItem icon={Factory} label="Direct Manufacturers" delay={100} />
              <SourceItem icon={Building2} label="Brand Owners" delay={200} />
              <SourceItem icon={Truck} label="Approved Wholesalers" delay={300} />
            </div>
          </div>

          <div className="hidden lg:flex items-center justify-center">
            <AnimatedConnector direction="right" />
          </div>
          <div className="lg:hidden flex justify-center py-2">
            <AnimatedConnector direction="down" />
          </div>

          <div className="lg:col-span-1 lg:row-span-1">
            <Card className="bg-gradient-to-br from-background to-muted/30 border-2">
              <CardContent className="p-6">
                <div className="mb-6 text-center">
                  <Badge variant="default" className="mb-2">Distribution Network</Badge>
                  <h3 className="text-xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    Pharma Oasis
                  </h3>
                  <p className="text-sm text-muted-foreground">Global Distribution Hubs</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <HubCard
                    title="London Distribution Centre"
                    location="Sutton"
                    country="United Kingdom"
                    isPrimary
                    delay={400}
                  />
                  <HubCard
                    title="Cheshire Distribution Centre"
                    location="Nantwich"
                    country="United Kingdom"
                    isPrimary
                    delay={500}
                  />
                  <HubCard
                    title="European Distribution Centre"
                    location="Rotterdam"
                    country="Netherlands"
                    delay={600}
                  />
                  <HubCard
                    title="Asia Distribution Centre"
                    location="Delhi"
                    country="India"
                    delay={700}
                  />
                </div>

                <div className="mt-6 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-3 w-12 overflow-hidden rounded-full bg-amber-500/20">
                        <div className="h-full w-3 rounded-full bg-amber-500 animate-flow-right" />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      UK brands distributed in India
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="mb-3 text-xs font-medium text-muted-foreground text-center">Sales Channels</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SalesTeamCard
                      icon={Users}
                      title="On-Road Sales Team"
                      description="Our dedicated field sales representatives visit pharmacies and retailers across the UK, building strong relationships and providing personalized service."
                    />
                    <SalesTeamCard
                      icon={Phone}
                      title="Telesales Team"
                      description="Expert telesales professionals serving all retail sectors including pharmacies, convenience stores, supermarkets, and healthcare institutions."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="hidden lg:flex items-center justify-center">
            <AnimatedConnector direction="right" />
          </div>
          <div className="lg:hidden flex justify-center py-2">
            <AnimatedConnector direction="down" />
          </div>

          <div className="space-y-4">
            <div className="text-center lg:text-left">
              <h3 className="text-lg font-semibold text-primary" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Customer Sectors
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">Serving diverse markets</p>
            </div>
            <div className="space-y-2">
              <CustomerItem icon={Pill} label="Pharmacies" delay={800} />
              <CustomerItem icon={ShoppingCart} label="Grocery & Convenience" delay={900} />
              <CustomerItem icon={Store} label="Mini Markets" delay={1000} />
              <CustomerItem icon={Building} label="Supermarkets" delay={1100} />
              <CustomerItem icon={Heart} label="Care Homes & Institutions" delay={1200} />
              <CustomerItem icon={Package} label="Cash & Carry / Wholesalers" delay={1300} />
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-center lg:justify-end">
          <Card className="bg-gradient-to-r from-blue-500/5 to-indigo-500/10 border-blue-500/20">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Globe className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-blue-700 dark:text-blue-400">Global Export</p>
                <p className="text-sm text-muted-foreground">Exporting worldwide from UK & Netherlands</p>
              </div>
              <ArrowRight className="h-5 w-5 text-blue-500 animate-pulse" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}