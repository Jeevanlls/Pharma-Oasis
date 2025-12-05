import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/public-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Brand } from "@shared/schema";
import { Building2, ArrowRight, Award } from "lucide-react";

export default function BrandsPage() {
  const { data: brands, isLoading } = useQuery<Brand[]>({
    queryKey: ["/api/brands"],
  });

  const directDistributors = brands?.filter(b => b.isDirectDistributor) || [];
  const otherBrands = brands?.filter(b => !b.isDirectDistributor) || [];

  return (
    <PublicLayout>
      <div className="py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Our Brands
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              We partner with leading manufacturers and distributors to bring you 
              the finest healthcare, wellness and beauty products.
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-12">
              <div>
                <Skeleton className="h-8 w-48 mb-6" />
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <Skeleton className="h-16 w-16 rounded-lg mb-4" />
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-12">
              {directDistributors.length > 0 && (
                <section>
                  <div className="mb-6 flex items-center gap-2">
                    <Award className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-semibold" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      Direct Distribution Partners
                    </h2>
                  </div>
                  <p className="mb-6 text-muted-foreground">
                    We are proud to be an authorized direct distributor for these premium brands.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {directDistributors.map((brand) => (
                      <BrandCard key={brand.id} brand={brand} isPartner />
                    ))}
                  </div>
                </section>
              )}

              {otherBrands.length > 0 && (
                <section>
                  <div className="mb-6 flex items-center gap-2">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                    <h2 className="text-2xl font-semibold" style={{ fontFamily: "DM Sans, sans-serif" }}>
                      All Brands
                    </h2>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {otherBrands.map((brand) => (
                      <BrandCard key={brand.id} brand={brand} />
                    ))}
                  </div>
                </section>
              )}

              {brands?.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Building2 className="mb-4 h-16 w-16 text-muted-foreground/50" />
                  <h2 className="text-xl font-semibold">No brands available</h2>
                  <p className="mt-2 text-muted-foreground">
                    Check back soon for our brand catalog
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

function BrandCard({ brand, isPartner }: { brand: Brand; isPartner?: boolean }) {
  return (
    <Link href={`/products?brand=${brand.id}`}>
      <Card 
        className="group cursor-pointer h-full hover-elevate"
        data-testid={`card-brand-${brand.id}`}
      >
        <CardContent className="flex h-full flex-col p-6">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
            {brand.logoUrl ? (
              <img
                src={brand.logoUrl}
                alt={brand.name}
                className="h-12 w-12 object-contain"
              />
            ) : (
              <Building2 className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold">{brand.name}</h3>
            {isPartner && (
              <Badge variant="default" className="shrink-0">
                Direct Partner
              </Badge>
            )}
          </div>
          
          {brand.description && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {brand.description}
            </p>
          )}
          
          <div className="mt-auto pt-4 flex items-center text-sm text-primary">
            <span>View products</span>
            <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
