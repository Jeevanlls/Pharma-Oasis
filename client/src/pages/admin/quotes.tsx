import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Quote } from "@shared/schema";
import { format, addDays, formatDistanceToNow } from "date-fns";
import { 
  Search, 
  FileText, 
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Calendar,
  GitBranch,
  CheckSquare,
  Plus,
  History,
} from "lucide-react";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  pending: { label: "Pending", variant: "secondary", icon: Clock },
  quoted: { label: "Quoted", variant: "default", icon: FileText },
  accepted: { label: "Accepted", variant: "default", icon: CheckCircle2 },
  declined: { label: "Declined", variant: "destructive", icon: XCircle },
  closed: { label: "Closed", variant: "outline", icon: AlertCircle },
};

export default function AdminQuotesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [expiryDays, setExpiryDays] = useState("30");
  const [selectedQuoteIds, setSelectedQuoteIds] = useState<number[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const { toast } = useToast();

  const { data: quotes, isLoading } = useQuery<Quote[]>({
    queryKey: ["/api/admin/quotes"],
  });

  const selectedQuoteId = selectedQuote?.id;
  const { data: versionHistory, isLoading: isLoadingVersions, refetch: refetchVersions } = useQuery<Quote[]>({
    queryKey: selectedQuoteId ? ["/api/admin/quotes", selectedQuoteId, "versions"] : ["versions-placeholder"],
    queryFn: async () => {
      if (!selectedQuoteId) return [];
      const res = await fetch(`/api/admin/quotes/${selectedQuoteId}/versions`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch version history");
      return res.json();
    },
    enabled: !!selectedQuoteId && showVersionHistory,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Quote> }) => {
      const res = await apiRequest("PATCH", `/api/admin/quotes/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Quote updated successfully" });
      setSelectedQuote(null);
    },
    onError: () => {
      toast({ title: "Failed to update quote", variant: "destructive" });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ quoteIds, updates }: { quoteIds: number[]; updates: Partial<Quote> }) => {
      const res = await apiRequest("POST", "/api/admin/quotes/bulk-update", { quoteIds, updates });
      return res.json();
    },
    onSuccess: (data: { updated: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: `${data.updated} quote(s) updated successfully` });
      setSelectedQuoteIds([]);
    },
    onError: (error: Error) => {
      const errorMessage = error.message.includes("Invalid status transition")
        ? "Some quotes cannot be updated due to invalid status transitions"
        : error.message.includes("Expiry date")
        ? "Expiry date is required when approving quotes"
        : "Failed to bulk update quotes";
      toast({ title: errorMessage, variant: "destructive" });
    },
  });

  const createVersionMutation = useMutation({
    mutationFn: async (quoteId: number) => {
      const res = await apiRequest("POST", `/api/admin/quotes/${quoteId}/version`, {});
      return res.json();
    },
    onSuccess: (newQuote: Quote) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/quotes"] });
      if (selectedQuoteId) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/quotes", selectedQuoteId, "versions"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/quotes", newQuote.parentQuoteId, "versions"] });
      toast({ title: `Created new version (v${newQuote.version})` });
      setSelectedQuote(newQuote);
      setShowVersionHistory(true);
    },
    onError: () => {
      toast({ title: "Failed to create new version", variant: "destructive" });
    },
  });

  const filteredQuotes = quotes?.filter(quote => {
    const matchesSearch = !searchQuery || 
      String(quote.id).includes(searchQuery) ||
      quote.customerNotes?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = !statusFilter || quote.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (quoteId: number, newStatus: string) => {
    const updates: Partial<Quote> = { 
      status: newStatus, 
      adminNotes: adminNotes || undefined 
    };
    
    if (newStatus === "quoted") {
      updates.expiryDate = addDays(new Date(), parseInt(expiryDays));
    }
    
    updateMutation.mutate({ id: quoteId, updates });
  };

  const handleBulkStatusChange = (newStatus: string) => {
    if (selectedQuoteIds.length === 0) return;
    
    const pendingQuoteIds = quotes
      ?.filter(q => selectedQuoteIds.includes(q.id) && q.status === "pending")
      .map(q => q.id) || [];
    
    if (newStatus === "quoted") {
      if (pendingQuoteIds.length === 0) {
        toast({ title: "No pending quotes selected for approval", variant: "destructive" });
        return;
      }
      
      const updates: Partial<Quote> = { 
        status: newStatus,
        expiryDate: addDays(new Date(), parseInt(expiryDays))
      };
      
      bulkUpdateMutation.mutate({ quoteIds: pendingQuoteIds, updates });
    } else {
      const updates: Partial<Quote> = { status: newStatus };
      bulkUpdateMutation.mutate({ quoteIds: selectedQuoteIds, updates });
    }
  };

  const toggleQuoteSelection = (quoteId: number) => {
    setSelectedQuoteIds(prev => 
      prev.includes(quoteId) 
        ? prev.filter(id => id !== quoteId)
        : [...prev, quoteId]
    );
  };

  const toggleSelectAll = () => {
    if (!filteredQuotes) return;
    
    if (selectedQuoteIds.length === filteredQuotes.length) {
      setSelectedQuoteIds([]);
    } else {
      setSelectedQuoteIds(filteredQuotes.map(q => q.id));
    }
  };

  const pendingSelected = quotes?.filter(
    q => selectedQuoteIds.includes(q.id) && q.status === "pending"
  ).length || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }} data-testid="heading-quote-management">
          Quote Management
        </h1>
        <p className="mt-2 text-muted-foreground">
          Review and manage customer quote requests
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by quote ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-quotes"
          />
        </div>
        <Select value={statusFilter || "all"} onValueChange={(val) => setStatusFilter(val === "all" ? "" : val)}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(statusConfig).map(([value, config]) => (
              <SelectItem key={value} value={value}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedQuoteIds.length > 0 && (
        <Card className="bg-muted/50" data-testid="card-bulk-actions">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                <span className="font-medium">{selectedQuoteIds.length} quote(s) selected</span>
                {pendingSelected > 0 && (
                  <Badge variant="secondary">{pendingSelected} pending</Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="bulk-expiry" className="text-sm whitespace-nowrap">Expiry:</Label>
                  <Select value={expiryDays} onValueChange={setExpiryDays}>
                    <SelectTrigger className="w-[100px]" id="bulk-expiry" data-testid="select-bulk-expiry">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleBulkStatusChange("quoted")}
                  disabled={bulkUpdateMutation.isPending || pendingSelected === 0}
                  data-testid="button-bulk-approve"
                >
                  {bulkUpdateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                  )}
                  Mark as Quoted ({pendingSelected})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedQuoteIds([])}
                  data-testid="button-clear-selection"
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredQuotes && filteredQuotes.length > 0 ? (
        <div className="space-y-4">
          {filteredQuotes.length > 1 && (
            <div className="flex items-center gap-2 px-2">
              <Checkbox
                id="select-all"
                checked={selectedQuoteIds.length === filteredQuotes.length}
                onCheckedChange={toggleSelectAll}
                data-testid="checkbox-select-all"
              />
              <Label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
                Select all ({filteredQuotes.length})
              </Label>
            </div>
          )}
          
          {filteredQuotes.map((quote) => {
            const status = statusConfig[quote.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            const isSelected = selectedQuoteIds.includes(quote.id);
            const isExpired = quote.expiryDate && new Date(quote.expiryDate) < new Date();

            return (
              <Card 
                key={quote.id} 
                data-testid={`card-admin-quote-${quote.id}`}
                className={isSelected ? "ring-2 ring-primary" : ""}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleQuoteSelection(quote.id)}
                        className="mt-1"
                        data-testid={`checkbox-quote-${quote.id}`}
                      />
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-medium" data-testid={`text-quote-id-${quote.id}`}>Quote #{quote.id}</h3>
                          <Badge variant={status.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                          {quote.version && quote.version > 1 && (
                            <Badge variant="outline" className="gap-1">
                              <GitBranch className="h-3 w-3" />
                              v{quote.version}
                            </Badge>
                          )}
                          {isExpired && quote.status === "quoted" && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Expired
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>User ID: {quote.userId}</p>
                          <p>Submitted: {format(new Date(quote.createdAt), "PPp")}</p>
                          {quote.expiryDate && (
                            <p className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {isExpired 
                                ? `Expired ${formatDistanceToNow(new Date(quote.expiryDate))} ago`
                                : `Expires ${formatDistanceToNow(new Date(quote.expiryDate), { addSuffix: true })}`
                              }
                            </p>
                          )}
                          {quote.totalEstimate && (
                            <p>Estimated Total: £{Number(quote.totalEstimate).toFixed(2)}</p>
                          )}
                          {quote.customerNotes && (
                            <p className="line-clamp-1">Notes: {quote.customerNotes}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedQuote(quote);
                          setAdminNotes(quote.adminNotes || "");
                        }}
                        data-testid={`button-view-quote-${quote.id}`}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {quote.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(quote.id, "quoted")}
                          disabled={updateMutation.isPending}
                          data-testid={`button-approve-quote-${quote.id}`}
                        >
                          {updateMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Mark as Quoted"
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="text-center py-12" data-testid="card-no-quotes">
          <CardContent>
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No quotes found</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedQuote} onOpenChange={() => { setSelectedQuote(null); setShowVersionHistory(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "DM Sans, sans-serif" }} className="flex items-center flex-wrap gap-2">
              Quote #{selectedQuote?.id}
              {selectedQuote?.version && (
                <Badge variant="outline" className="gap-1">
                  <GitBranch className="h-3 w-3" />
                  v{selectedQuote.version}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Quote details and management
            </DialogDescription>
          </DialogHeader>

          {selectedQuote && (
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={statusConfig[selectedQuote.status]?.variant || "secondary"}>
                      {statusConfig[selectedQuote.status]?.label || selectedQuote.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Submitted</p>
                    <p className="font-medium">{format(new Date(selectedQuote.createdAt), "PPpp")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">User ID</p>
                    <p className="font-medium">{selectedQuote.userId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estimated Total</p>
                    <p className="font-medium">
                      £{Number(selectedQuote.totalEstimate || 0).toFixed(2)}
                    </p>
                  </div>
                  {selectedQuote.expiryDate && (
                    <div>
                      <p className="text-sm text-muted-foreground">Expiry Date</p>
                      <p className="font-medium flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(selectedQuote.expiryDate), "PPp")}
                      </p>
                    </div>
                  )}
                  {selectedQuote.parentQuoteId && (
                    <div>
                      <p className="text-sm text-muted-foreground">Original Quote</p>
                      <p className="font-medium flex items-center gap-1">
                        <GitBranch className="h-4 w-4" />
                        Quote #{selectedQuote.parentQuoteId}
                      </p>
                    </div>
                  )}
                </div>

                {selectedQuote.customerNotes && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-2">Customer Notes</p>
                    <p className="text-sm">{selectedQuote.customerNotes}</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-2">Admin Notes</p>
                  <Textarea
                    placeholder="Add notes for this quote..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    data-testid="textarea-admin-notes"
                  />
                </div>

                {selectedQuote.status === "pending" && (
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-2">Quote Expiry (when marked as quoted)</p>
                    <Select value={expiryDays} onValueChange={setExpiryDays}>
                      <SelectTrigger className="w-[180px]" data-testid="select-expiry-days">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="60">60 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-2">Update Status</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(statusConfig).map(([value, config]) => (
                      <Button
                        key={value}
                        size="sm"
                        variant={selectedQuote.status === value ? "default" : "outline"}
                        onClick={() => handleStatusChange(selectedQuote.id, value)}
                        disabled={updateMutation.isPending}
                        data-testid={`button-status-${value}`}
                      >
                        {config.label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <History className="h-4 w-4" />
                      Version History
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowVersionHistory(!showVersionHistory)}
                        data-testid="button-toggle-versions"
                      >
                        {showVersionHistory ? "Hide" : "Show"} History
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => createVersionMutation.mutate(selectedQuote.id)}
                        disabled={createVersionMutation.isPending}
                        data-testid="button-create-version"
                      >
                        {createVersionMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Plus className="h-4 w-4 mr-1" />
                        )}
                        New Version
                      </Button>
                    </div>
                  </div>
                  
                  {showVersionHistory && (
                    <div className="space-y-2">
                      {isLoadingVersions ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading versions...
                        </div>
                      ) : versionHistory && versionHistory.length > 0 ? (
                        versionHistory.map((version) => {
                          const versionStatus = statusConfig[version.status] || statusConfig.pending;
                          const VersionStatusIcon = versionStatus.icon;
                          const isCurrent = version.id === selectedQuote.id;
                          
                          return (
                            <div
                              key={version.id}
                              className={`flex items-center justify-between gap-2 p-2 rounded-md ${
                                isCurrent ? "bg-muted" : "hover-elevate"
                              }`}
                              data-testid={`version-${version.id}`}
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="gap-1">
                                  <GitBranch className="h-3 w-3" />
                                  v{version.version || 1}
                                </Badge>
                                <Badge variant={versionStatus.variant} className="gap-1">
                                  <VersionStatusIcon className="h-3 w-3" />
                                  {versionStatus.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(version.createdAt), "PP")}
                                </span>
                                {isCurrent && (
                                  <Badge variant="secondary">Current</Badge>
                                )}
                              </div>
                              {!isCurrent && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedQuote(version);
                                    setAdminNotes(version.adminNotes || "");
                                  }}
                                  data-testid={`button-view-version-${version.id}`}
                                >
                                  View
                                </Button>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          This is the only version
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelectedQuote(null); setShowVersionHistory(false); }} data-testid="button-close-dialog">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
