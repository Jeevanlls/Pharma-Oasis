import { useEffect, useRef, useState } from "react";
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
  MapPin,
  Stethoscope
} from "lucide-react";

function useInView(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isVisible };
}

const hubs = [
  { name: "London DC", location: "Sutton, UK", flag: "🇬🇧", primary: true },
  { name: "Cheshire DC", location: "Nantwich, UK", flag: "🇬🇧", primary: true },
  { name: "European DC", location: "Rotterdam, NL", flag: "🇳🇱", primary: false },
  { name: "Asia DC", location: "Delhi, India", flag: "🇮🇳", primary: false },
];

const sources = [
  { icon: Factory, label: "Direct Manufacturers" },
  { icon: Building2, label: "Brand Owners" },
  { icon: Truck, label: "Approved Wholesalers" },
];

const customers = [
  { icon: Pill, label: "Pharmacies" },
  { icon: ShoppingCart, label: "Grocery & Convenience" },
  { icon: Stethoscope, label: "Healthcare Stores" },
  { icon: Building, label: "Supermarkets" },
  { icon: Heart, label: "Care Homes & Institutions" },
  { icon: Package, label: "Cash & Carry / Wholesalers" },
];

export function DistributionNetwork() {
  const { ref, isVisible } = useInView();

  return (
    <div ref={ref} className="w-full">
      <style>{`
        @keyframes flowRight {
          0% { stroke-dashoffset: 24; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes flowDown {
          0% { stroke-dashoffset: 24; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); }
        }
        .animate-flow { animation: flowRight 0.8s linear infinite; }
        .animate-flow-down { animation: flowDown 0.8s linear infinite; }
        .hub-pulse { animation: pulse-glow 2s ease-in-out infinite; }
      `}</style>

      <div className={`transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        
        {/* Desktop Layout */}
        <div className="hidden lg:block">
          <div className="relative">
            {/* Main Flow Container */}
            <div className="flex items-stretch justify-between gap-4">
              
              {/* LEFT: Supply Sources */}
              <div className="w-64 shrink-0">
                <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Supply Sources</h3>
                  </div>
                  <p className="mb-5 text-xs text-muted-foreground">Direct relationships only</p>
                  <div className="space-y-3">
                    {sources.map((item, i) => (
                      <div
                        key={item.label}
                        className={`flex items-center gap-3 rounded-xl bg-background border p-3 transition-all duration-500 hover:border-primary/50 hover:shadow-md ${
                          isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                        }`}
                        style={{ transitionDelay: `${i * 100}ms` }}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <item.icon className="h-5 w-5 text-primary" />
                        </div>
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Arrow 1: Sources to Hub */}
              <div className="flex items-center">
                <svg width="80" height="40" viewBox="0 0 80 40" className="shrink-0">
                  <defs>
                    <linearGradient id="arrowGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 20 H65"
                    stroke="url(#arrowGrad1)"
                    strokeWidth="3"
                    strokeDasharray="8 4"
                    className="animate-flow"
                    fill="none"
                  />
                  <polygon points="65,12 80,20 65,28" fill="hsl(var(--primary))" opacity="0.8" />
                </svg>
              </div>

              {/* CENTER: Distribution Hub */}
              <div className="flex-1 max-w-xl">
                <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-background to-primary/5 p-6 shadow-lg">
                  <div className="mb-5 text-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">
                      <Globe className="h-3.5 w-3.5" />
                      Pharma Oasis Distribution Network
                    </div>
                  </div>

                  {/* Hub Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {hubs.map((hub, i) => (
                      <div
                        key={hub.name}
                        className={`relative rounded-xl border-2 ${hub.primary ? "border-primary/40 bg-primary/5" : "border-border bg-background"} p-4 transition-all duration-500 hover:shadow-lg ${
                          isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"
                        }`}
                        style={{ transitionDelay: `${300 + i * 100}ms` }}
                      >
                        <div className={`absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full ${hub.primary ? "bg-green-500 hub-pulse" : "bg-blue-400"}`} />
                        <div className="flex items-start gap-3">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg ${hub.primary ? "bg-primary/20" : "bg-muted"}`}>
                            {hub.flag}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm">{hub.name}</h4>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <MapPin className="h-3 w-3" />
                              {hub.location}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* UK to India Flow Indicator */}
                  <div className="rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 p-3">
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-lg">🇬🇧</span>
                      <div className="flex-1 h-1 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-flow" style={{ backgroundSize: "50% 100%" }} />
                      </div>
                      <span className="text-lg">🇮🇳</span>
                      <span className="text-xs font-medium text-amber-700 dark:text-amber-400">UK brands to India</span>
                    </div>
                  </div>

                  {/* Sales Channels */}
                  <div className="mt-5 pt-4 border-t border-border/50">
                    <p className="text-xs font-medium text-muted-foreground text-center mb-3">Sales Channels</p>
                    <div className="flex gap-3 justify-center">
                      <div className="flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Users className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-medium">Field Sales</span>
                      </div>
                      <div className="flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Phone className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-medium">Telesales</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Arrow 2: Hub to Customers */}
              <div className="flex items-center">
                <svg width="80" height="40" viewBox="0 0 80 40" className="shrink-0">
                  <defs>
                    <linearGradient id="arrowGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 20 H65"
                    stroke="url(#arrowGrad2)"
                    strokeWidth="3"
                    strokeDasharray="8 4"
                    className="animate-flow"
                    fill="none"
                  />
                  <polygon points="65,12 80,20 65,28" fill="hsl(var(--primary))" opacity="0.6" />
                </svg>
              </div>

              {/* RIGHT: Customer Sectors */}
              <div className="w-72 shrink-0">
                <div className="rounded-2xl border-2 border-accent/30 bg-gradient-to-bl from-accent/10 to-transparent p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-accent-foreground" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Customer Sectors</h3>
                  </div>
                  <p className="mb-5 text-xs text-muted-foreground">Serving diverse markets</p>
                  <div className="grid grid-cols-1 gap-2">
                    {customers.map((item, i) => (
                      <div
                        key={item.label}
                        className={`flex items-center gap-3 rounded-xl bg-background border p-2.5 transition-all duration-500 hover:border-primary/50 hover:shadow-md ${
                          isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
                        }`}
                        style={{ transitionDelay: `${600 + i * 80}ms` }}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/50">
                          <item.icon className="h-4 w-4 text-accent-foreground" />
                        </div>
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Global Export Footer */}
            <div className="mt-6 flex justify-end">
              <div className="inline-flex items-center gap-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 px-6 py-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20">
                  <Globe className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-bold text-blue-700 dark:text-blue-400">Global Export</p>
                  <p className="text-sm text-muted-foreground">Exporting worldwide from UK & Netherlands</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="lg:hidden space-y-6">
          {/* Sources */}
          <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Supply Sources</h3>
            </div>
            <div className="space-y-3">
              {sources.map((item) => (
                <div key={item.label} className="flex items-center gap-3 rounded-xl bg-background border p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Arrow Down */}
          <div className="flex justify-center">
            <svg width="40" height="50" viewBox="0 0 40 50">
              <path d="M20 0 V35" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray="8 4" className="animate-flow-down" fill="none" />
              <polygon points="12,35 20,50 28,35" fill="hsl(var(--primary))" opacity="0.8" />
            </svg>
          </div>

          {/* Distribution Hub */}
          <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-background to-primary/5 p-5">
            <div className="mb-4 text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">
                <Globe className="h-3.5 w-3.5" />
                Pharma Oasis Network
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {hubs.map((hub) => (
                <div key={hub.name} className={`relative rounded-xl border-2 ${hub.primary ? "border-primary/40 bg-primary/5" : "border-border bg-background"} p-3`}>
                  <div className={`absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full ${hub.primary ? "bg-green-500" : "bg-blue-400"}`} />
                  <div className="text-center">
                    <div className="text-xl mb-1">{hub.flag}</div>
                    <h4 className="font-bold text-xs">{hub.name}</h4>
                    <p className="text-xs text-muted-foreground">{hub.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Arrow Down */}
          <div className="flex justify-center">
            <svg width="40" height="50" viewBox="0 0 40 50">
              <path d="M20 0 V35" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray="8 4" className="animate-flow-down" fill="none" />
              <polygon points="12,35 20,50 28,35" fill="hsl(var(--primary))" opacity="0.8" />
            </svg>
          </div>

          {/* Customers */}
          <div className="rounded-2xl border-2 border-accent/30 bg-gradient-to-bl from-accent/10 to-transparent p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent-foreground" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Customer Sectors</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {customers.map((item) => (
                <div key={item.label} className="flex items-center gap-2 rounded-xl bg-background border p-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/50">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Global Export */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-3 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 px-5 py-3">
              <Globe className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-bold text-sm text-blue-700 dark:text-blue-400">Global Export</p>
                <p className="text-xs text-muted-foreground">UK & Netherlands</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}