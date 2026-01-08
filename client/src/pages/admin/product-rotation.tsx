import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  RefreshCw, 
  Calendar,
  Package,
  Building2,
  CheckCircle,
  AlertCircle,
  Shuffle,
  TrendingUp
} from "lucide-react";
import { format } from "date-fns";

interface RotationStatus {
  hasRotation: boolean;
  rotationDate: string | null;
  productCount: number;
  directDistributorBrandCount: number;
  criteria: {
    directDistributorBrands: number;
    totalSelected: number;
    generatedAt: string;
  } | null;
}

export default function ProductRotationPage() {
  const { toast } = useToast();

  const { data: status, isLoading, refetch } = useQuery<RotationStatus>({
    queryKey: ["/api/admin/product-rotation/status"],
    refetchInterval: 30000,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/product-rotation/generate");
    },
    onSuccess: () => {
      toast({ title: "Rotation Generated", description: "Daily product rotation has been regenerated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/product-rotation/status"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate rotation", variant: "destructive" });
    },
  });

  if (isLoading || !status) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Product Rotation</h1>
          <p className="text-muted-foreground">
            Manage daily featured product rotation on page 1 of the catalogue
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            data-testid="button-refresh-status"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            data-testid="button-generate-rotation"
          >
            {generateMutation.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Shuffle className="w-4 h-4 mr-2" />
            )}
            Regenerate Today's Rotation
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rotation Status</CardTitle>
            {status?.hasRotation ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-rotation-status">
              {status?.hasRotation ? "Active" : "Not Generated"}
            </div>
            <p className="text-xs text-muted-foreground">
              {status?.hasRotation ? "Products are being rotated daily" : "Using default sorting"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rotation Date</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-rotation-date">
              {status?.rotationDate ? format(new Date(status.rotationDate), "MMM d") : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {status?.rotationDate ? format(new Date(status.rotationDate), "yyyy") : "No rotation set"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Featured Products</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-product-count">
              {status?.productCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Products in today's rotation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Direct Distributor Brands</CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-brand-count">
              {status?.directDistributorBrandCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Prioritized brands in system
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              How It Works
            </CardTitle>
            <CardDescription>
              Intelligent product sorting for maximum visibility
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">1</Badge>
                <div>
                  <p className="font-medium">Daily Rotation (Page 1)</p>
                  <p className="text-sm text-muted-foreground">
                    50 products are randomly selected each day from direct distributor brands with images
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">2</Badge>
                <div>
                  <p className="font-medium">Priority Sorting (Pages 2+)</p>
                  <p className="text-sm text-muted-foreground">
                    Remaining pages show: direct distributor products first, then products with images, then alphabetically
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Badge variant="outline" className="mt-0.5">3</Badge>
                <div>
                  <p className="font-medium">Automatic Generation</p>
                  <p className="text-sm text-muted-foreground">
                    Rotation is automatically generated on the first page 1 request each day
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shuffle className="w-5 h-5" />
              Current Rotation Details
            </CardTitle>
            <CardDescription>
              Information about today's product selection
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status?.criteria ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Direct Distributor Products</p>
                    <p className="text-lg font-semibold" data-testid="text-direct-count">
                      {status.criteria.directDistributorBrands}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Selected</p>
                    <p className="text-lg font-semibold" data-testid="text-total-selected">
                      {status.criteria.totalSelected}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Generated At</p>
                  <p className="font-medium" data-testid="text-generated-at">
                    {format(new Date(status.criteria.generatedAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Shuffle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No rotation data available</p>
                <p className="text-sm">Click "Regenerate Today's Rotation" to create one</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
