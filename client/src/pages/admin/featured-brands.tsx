import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Brand } from "@shared/schema";
import { 
  Search, 
  Building2, 
  Loader2,
  Award,
  Star,
  Home,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

export default function AdminFeaturedBrandsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: brands, isLoading } = useQuery<Brand[]>({
    queryKey: ["/api/admin/brands"],
  });

  const updateFeaturedMutation = useMutation({
    mutationFn: async ({ id, isHomeFeatured, homePosition }: { id: number; isHomeFeatured: boolean; homePosition?: number }) => {
      return apiRequest("PATCH", `/api/admin/brands/${id}/home-featured`, { isHomeFeatured, homePosition });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/brands"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home/brands"] });
      toast({ title: "Brand homepage status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update brand", variant: "destructive" });
    },
  });

  const filteredBrands = brands?.filter(brand =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const featuredBrands = filteredBrands?.filter(b => b.isHomeFeatured).sort((a, b) => (a.homePosition || 999) - (b.homePosition || 999)) || [];
  const availableBrands = filteredBrands?.filter(b => !b.isHomeFeatured && b.isActive) || [];

  const handleToggleFeatured = (brand: Brand) => {
    const newPosition = !brand.isHomeFeatured ? (featuredBrands.length) : undefined;
    updateFeaturedMutation.mutate({
      id: brand.id,
      isHomeFeatured: !brand.isHomeFeatured,
      homePosition: newPosition,
    });
  };

  const handleMoveUp = (brand: Brand, currentIndex: number) => {
    if (currentIndex === 0) return;
    const swapBrand = featuredBrands[currentIndex - 1];
    Promise.all([
      apiRequest("PATCH", `/api/admin/brands/${brand.id}/home-featured`, { isHomeFeatured: true, homePosition: currentIndex - 1 }),
      apiRequest("PATCH", `/api/admin/brands/${swapBrand.id}/home-featured`, { isHomeFeatured: true, homePosition: currentIndex }),
    ]).then(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/brands"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home/brands"] });
      toast({ title: "Brand order updated" });
    });
  };

  const handleMoveDown = (brand: Brand, currentIndex: number) => {
    if (currentIndex === featuredBrands.length - 1) return;
    const swapBrand = featuredBrands[currentIndex + 1];
    Promise.all([
      apiRequest("PATCH", `/api/admin/brands/${brand.id}/home-featured`, { isHomeFeatured: true, homePosition: currentIndex + 1 }),
      apiRequest("PATCH", `/api/admin/brands/${swapBrand.id}/home-featured`, { isHomeFeatured: true, homePosition: currentIndex }),
    ]).then(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/brands"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home/brands"] });
      toast({ title: "Brand order updated" });
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
          Featured Brands
        </h1>
        <p className="mt-2 text-muted-foreground">
          Select which brands appear in the homepage logo carousel
        </p>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search brands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-brands"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Featured on Homepage ({featuredBrands.length})
            </h2>
            {featuredBrands.length > 0 ? (
              <div className="space-y-2">
                {featuredBrands.map((brand, index) => (
                  <Card key={brand.id} data-testid={`card-featured-brand-${brand.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleMoveUp(brand, index)}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleMoveDown(brand, index)}
                            disabled={index === featuredBrands.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-muted flex items-center justify-center">
                          {brand.logoUrl ? (
                            <img
                              src={brand.logoUrl}
                              alt={brand.name}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <Building2 className="h-6 w-6 text-muted-foreground/50" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">{brand.name}</h3>
                            {brand.isDirectDistributor && (
                              <Badge variant="default" className="gap-1">
                                <Award className="h-3 w-3" /> Direct
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">Position: {index + 1}</p>
                        </div>

                        <Switch
                          checked={brand.isHomeFeatured ?? false}
                          onCheckedChange={() => handleToggleFeatured(brand)}
                          disabled={updateFeaturedMutation.isPending}
                          data-testid={`switch-featured-${brand.id}`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-8">
                <CardContent>
                  <Home className="mx-auto h-10 w-10 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No brands featured yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Toggle brands from the list on the right
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Available Brands ({availableBrands.length})
            </h2>
            {availableBrands.length > 0 ? (
              <div className="space-y-2">
                {availableBrands.map((brand) => (
                  <Card key={brand.id} data-testid={`card-available-brand-${brand.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-muted flex items-center justify-center">
                          {brand.logoUrl ? (
                            <img
                              src={brand.logoUrl}
                              alt={brand.name}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <Building2 className="h-6 w-6 text-muted-foreground/50" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium truncate">{brand.name}</h3>
                            {brand.isDirectDistributor && (
                              <Badge variant="default" className="gap-1">
                                <Award className="h-3 w-3" /> Direct
                              </Badge>
                            )}
                          </div>
                        </div>

                        <Switch
                          checked={false}
                          onCheckedChange={() => handleToggleFeatured(brand)}
                          disabled={updateFeaturedMutation.isPending}
                          data-testid={`switch-add-featured-${brand.id}`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-8">
                <CardContent>
                  <Building2 className="mx-auto h-10 w-10 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? "No brands match your search" : "All active brands are already featured"}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
