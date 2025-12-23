import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Bot, 
  Play, 
  Pause, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AiCategoryStats {
  status: {
    id: number;
    isRunning: boolean;
    lastRunAt: string | null;
    totalProductsProcessed: number;
    totalChanges: number;
    lastProductId: number;
    errorCount: number;
    lastError: string | null;
    updatedAt: string;
  } | null;
  totalProducts: number;
  reviewedProducts: number;
  changesApplied: number;
  recentChanges: Array<{
    productId: number;
    productName: string;
    previousCategory: string;
    newCategory: string;
    confidence: string;
    reviewedAt: string;
  }>;
}

export default function AdminAiCategoriesPage() {
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isRunningBatch, setIsRunningBatch] = useState(false);
  const { toast } = useToast();

  const { data: stats, isLoading, refetch } = useQuery<AiCategoryStats>({
    queryKey: ["/api/admin/ai-categories/status"],
    refetchInterval: 10000,
  });

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await apiRequest("POST", "/api/admin/ai-categories/start", { intervalMinutes: 30 });
      toast({ title: "AI Category Processor Started", description: "The agent will run every 30 minutes" });
      refetch();
    } catch (error) {
      toast({ title: "Failed to start processor", variant: "destructive" });
    } finally {
      setIsStarting(false);
    }
  };

  const handleStop = async () => {
    setIsStopping(true);
    try {
      await apiRequest("POST", "/api/admin/ai-categories/stop");
      toast({ title: "AI Category Processor Stopped" });
      refetch();
    } catch (error) {
      toast({ title: "Failed to stop processor", variant: "destructive" });
    } finally {
      setIsStopping(false);
    }
  };

  const handleRunBatch = async () => {
    setIsRunningBatch(true);
    try {
      const response = await apiRequest("POST", "/api/admin/ai-categories/run-batch");
      const result = await response.json();
      toast({ 
        title: "Batch Complete", 
        description: `Processed ${result.processed} products, made ${result.changes} changes` 
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    } catch (error) {
      toast({ title: "Failed to run batch", variant: "destructive" });
    } finally {
      setIsRunningBatch(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const progress = stats?.totalProducts 
    ? Math.round((stats.reviewedProducts / stats.totalProducts) * 100) 
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            AI Category Agent
          </h1>
          <p className="text-muted-foreground">
            Automatically corrects product categories and merges duplicates
          </p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {stats?.status?.isRunning ? (
            <Button 
              variant="destructive" 
              onClick={handleStop}
              disabled={isStopping}
              data-testid="button-stop-agent"
            >
              {isStopping ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
              Stop Agent
            </Button>
          ) : (
            <Button 
              onClick={handleStart}
              disabled={isStarting}
              data-testid="button-start-agent"
            >
              {isStarting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Start Agent
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={handleRunBatch}
            disabled={isRunningBatch}
            data-testid="button-run-batch"
          >
            {isRunningBatch ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Run Batch Now
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            {stats?.status?.isRunning ? (
              <Badge variant="default" className="bg-green-500">Running</Badge>
            ) : (
              <Badge variant="secondary">Stopped</Badge>
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.status?.isRunning ? "Active" : "Idle"}
            </div>
            {stats?.status?.lastRunAt && (
              <p className="text-xs text-muted-foreground">
                Last run: {formatDistanceToNow(new Date(stats.status.lastRunAt), { addSuffix: true })}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress}%</div>
            <Progress value={progress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {stats?.reviewedProducts || 0} / {stats?.totalProducts || 0} reviewed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Changes Made</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.changesApplied || 0}</div>
            <p className="text-xs text-muted-foreground">
              Products recategorized
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.status?.errorCount || 0}</div>
            {stats?.status?.lastError && (
              <p className="text-xs text-destructive truncate" title={stats.status.lastError}>
                {stats.status.lastError.substring(0, 50)}...
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Changes</CardTitle>
          <CardDescription>
            Products that have been recategorized by the AI agent
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.recentChanges && stats.recentChanges.length > 0 ? (
            <div className="space-y-4">
              {stats.recentChanges.map((change, index) => (
                <div 
                  key={`${change.productId}-${index}`}
                  className="flex items-start justify-between gap-4 p-3 rounded-md bg-muted/50"
                  data-testid={`change-row-${change.productId}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{change.productName}</p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                      <span className="line-through">{change.previousCategory}</span>
                      <span>→</span>
                      <span className="text-foreground font-medium">{change.newCategory}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {(parseFloat(change.confidence) * 100).toFixed(0)}% confident
                    </Badge>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No category changes have been made yet</p>
              <p className="text-sm">Start the agent or run a batch to begin processing</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h3 className="font-medium flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">1</span>
                Analyze Products
              </h3>
              <p className="text-sm text-muted-foreground">
                The AI examines each product name and description to understand what it is.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">2</span>
                Match Categories
              </h3>
              <p className="text-sm text-muted-foreground">
                It compares against your existing categories and finds the best match.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">3</span>
                Auto-Correct
              </h3>
              <p className="text-sm text-muted-foreground">
                Products are automatically moved to the correct category if confidence is high.
              </p>
            </div>
          </div>
          <div className="p-4 bg-muted rounded-md">
            <p className="text-sm">
              <strong>Note:</strong> The agent processes 3 products every 30 minutes to conserve API usage. 
              It remembers which products have been reviewed and won&apos;t repeat work.
              Categories like &quot;Skin Care&quot; and &quot;Skincare&quot; are treated as variants and merged automatically.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
