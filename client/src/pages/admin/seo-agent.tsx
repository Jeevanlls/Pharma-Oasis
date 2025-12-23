import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { 
  Play, 
  Square, 
  RefreshCw, 
  Bot, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Tag,
  FolderOpen,
  Zap,
  Calendar,
  Activity
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface SeoAgentStatus {
  status: {
    isRunning: boolean;
    lastRunAt: string | null;
    nextScheduledRun: string | null;
    totalProductsOptimized: number;
    totalBrandsOptimized: number;
    totalCategoriesOptimized: number;
    totalPagesOptimized: number;
    currentTask: string;
    errorCount: number;
    lastError: string | null;
  };
  analysis: {
    totalProducts: number;
    totalBrands: number;
    totalCategories: number;
    productsWithSeo: number;
    brandsWithSeo: number;
    categoriesWithSeo: number;
    productsMissingSeo: number;
    brandsMissingSeo: number;
    categoriesMissingSeo: number;
    topKeywords: string[];
    recommendations: Array<{
      type: string;
      priority: string;
      title: string;
      description: string;
    }>;
  };
  recentActions: Array<{
    id: number;
    actionType: string;
    entityType: string;
    entityId: number;
    entityName: string;
    previousValue: string;
    newValue: string;
    aiReasoning: string;
    confidenceScore: string;
    status: string;
    errorMessage: string | null;
    createdAt: string;
  }>;
  pendingRecommendations: Array<{
    id: number;
    entityType: string;
    entityName: string;
    recommendationType: string;
    priority: string;
    title: string;
    description: string;
    suggestedAction: string;
    potentialImpact: string;
    status: string;
    createdAt: string;
  }>;
  actionsToday: number;
  isScheduled: boolean;
}

export default function SeoAgentPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: agentData, isLoading, refetch } = useQuery<SeoAgentStatus>({
    queryKey: ["/api/admin/seo-agent/status"],
    refetchInterval: 10000,
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/seo-agent/start");
    },
    onSuccess: () => {
      toast({ title: "SEO Agent Started", description: "Daily optimization schedule activated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seo-agent/status"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to start SEO agent", variant: "destructive" });
    },
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/seo-agent/stop");
    },
    onSuccess: () => {
      toast({ title: "SEO Agent Stopped", description: "Schedule deactivated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seo-agent/status"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to stop SEO agent", variant: "destructive" });
    },
  });

  const runNowMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/seo-agent/run-now");
    },
    onSuccess: () => {
      toast({ title: "Optimization Started", description: "Running SEO optimization now..." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/seo-agent/status"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to run optimization", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const status = agentData?.status;
  const analysis = agentData?.analysis;
  const recentActions = agentData?.recentActions || [];
  const recommendations = agentData?.pendingRecommendations || [];

  const productProgress = analysis 
    ? Math.round((analysis.productsWithSeo / Math.max(analysis.totalProducts, 1)) * 100) 
    : 0;
  const brandProgress = analysis 
    ? Math.round((analysis.brandsWithSeo / Math.max(analysis.totalBrands, 1)) * 100) 
    : 0;
  const categoryProgress = analysis 
    ? Math.round((analysis.categoriesWithSeo / Math.max(analysis.totalCategories, 1)) * 100) 
    : 0;
  const overallProgress = Math.round((productProgress + brandProgress + categoryProgress) / 3);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="w-6 h-6" />
            SEO AI Agent
          </h1>
          <p className="text-muted-foreground">
            Automated SEO optimization for products, brands, and categories
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            data-testid="button-refresh"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          {agentData?.isScheduled ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => stopMutation.mutate()}
              disabled={stopMutation.isPending}
              data-testid="button-stop-agent"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop Agent
            </Button>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              data-testid="button-start-agent"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Agent
            </Button>
          )}
          
          <Button
            variant="secondary"
            size="sm"
            onClick={() => runNowMutation.mutate()}
            disabled={runNowMutation.isPending || status?.isRunning}
            data-testid="button-run-now"
          >
            <Zap className="w-4 h-4 mr-2" />
            Run Now
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Agent Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {status?.isRunning ? (
                <Badge variant="default" className="bg-green-500">
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Running
                </Badge>
              ) : agentData?.isScheduled ? (
                <Badge variant="secondary">
                  <Clock className="w-3 h-3 mr-1" />
                  Scheduled
                </Badge>
              ) : (
                <Badge variant="outline">Stopped</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {status?.currentTask || "Idle"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Last Run
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {status?.lastRunAt 
                ? formatDistanceToNow(new Date(status.lastRunAt), { addSuffix: true })
                : "Never"}
            </p>
            {status?.nextScheduledRun && (
              <p className="text-xs text-muted-foreground mt-1">
                Next: {format(new Date(status.nextScheduledRun), "MMM d, h:mm a")}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              SEO Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{overallProgress}%</p>
            <Progress value={overallProgress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Actions Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{agentData?.actionsToday || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {(status?.totalProductsOptimized || 0) + (status?.totalBrandsOptimized || 0) + (status?.totalCategoriesOptimized || 0)} optimizations
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="actions" data-testid="tab-actions">Recent Actions</TabsTrigger>
          <TabsTrigger value="recommendations" data-testid="tab-recommendations">
            Recommendations
            {recommendations.length > 0 && (
              <Badge variant="secondary" className="ml-2">{recommendations.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Products
                </CardTitle>
                <CardDescription>
                  SEO optimization status for products
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Optimized</span>
                    <span className="font-medium">{analysis?.productsWithSeo || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Pending</span>
                    <span className="font-medium text-amber-600">{analysis?.productsMissingSeo || 0}</span>
                  </div>
                  <Progress value={productProgress} className="mt-2" />
                  <p className="text-xs text-muted-foreground text-center">{productProgress}% complete</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Brands
                </CardTitle>
                <CardDescription>
                  SEO optimization status for brands
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Optimized</span>
                    <span className="font-medium">{analysis?.brandsWithSeo || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Pending</span>
                    <span className="font-medium text-amber-600">{analysis?.brandsMissingSeo || 0}</span>
                  </div>
                  <Progress value={brandProgress} className="mt-2" />
                  <p className="text-xs text-muted-foreground text-center">{brandProgress}% complete</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" />
                  Categories
                </CardTitle>
                <CardDescription>
                  SEO optimization status for categories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Optimized</span>
                    <span className="font-medium">{analysis?.categoriesWithSeo || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Pending</span>
                    <span className="font-medium text-amber-600">{analysis?.categoriesMissingSeo || 0}</span>
                  </div>
                  <Progress value={categoryProgress} className="mt-2" />
                  <p className="text-xs text-muted-foreground text-center">{categoryProgress}% complete</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Target Keywords</CardTitle>
              <CardDescription>
                Keywords the AI agent focuses on for B2B pharmaceutical wholesale
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(analysis?.topKeywords || []).map((keyword, index) => (
                  <Badge key={index} variant="outline">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {(status?.errorCount ?? 0) > 0 && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  Recent Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{status?.errorCount ?? 0} errors occurred</p>
                {status?.lastError && (
                  <p className="text-xs text-muted-foreground mt-1">{status.lastError}</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="actions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent SEO Actions</CardTitle>
              <CardDescription>
                Latest optimizations performed by the AI agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {recentActions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No actions recorded yet. Start the agent to begin optimizing.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentActions.map((action) => (
                      <div 
                        key={action.id} 
                        className="border rounded-md p-3 space-y-2"
                        data-testid={`action-${action.id}`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {action.entityType}
                            </Badge>
                            <span className="font-medium text-sm truncate max-w-[300px]">
                              {action.entityName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={action.status === "completed" ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {action.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(action.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        
                        {action.aiReasoning && (
                          <p className="text-xs text-muted-foreground">
                            {action.aiReasoning}
                          </p>
                        )}
                        
                        {action.newValue && (
                          <div className="text-xs bg-muted p-2 rounded">
                            <pre className="whitespace-pre-wrap overflow-hidden">
                              {(() => {
                                try {
                                  const parsed = JSON.parse(action.newValue);
                                  return `Title: ${parsed.metaTitle || 'N/A'}\nDescription: ${parsed.metaDescription || 'N/A'}`;
                                } catch {
                                  return action.newValue;
                                }
                              })()}
                            </pre>
                          </div>
                        )}

                        {action.confidenceScore && (
                          <p className="text-xs text-muted-foreground">
                            Confidence: {Math.round(parseFloat(action.confidenceScore) * 100)}%
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SEO Recommendations</CardTitle>
              <CardDescription>
                AI-generated suggestions to improve your site's search ranking
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recommendations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No pending recommendations. The AI will generate suggestions during its next run.
                </p>
              ) : (
                <div className="space-y-3">
                  {recommendations.map((rec) => (
                    <div 
                      key={rec.id} 
                      className="border rounded-md p-3 space-y-2"
                      data-testid={`recommendation-${rec.id}`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="font-medium text-sm">{rec.title}</h4>
                        <Badge 
                          variant={
                            rec.priority === "high" ? "destructive" : 
                            rec.priority === "medium" ? "secondary" : "outline"
                          }
                        >
                          {rec.priority} priority
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                      {rec.suggestedAction && (
                        <p className="text-xs text-primary">{rec.suggestedAction}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
