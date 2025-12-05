import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Quote } from "@shared/schema";
import { format } from "date-fns";
import { 
  Search, 
  FileText, 
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
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
  const { toast } = useToast();

  const { data: quotes, isLoading } = useQuery<Quote[]>({
    queryKey: ["/api/admin/quotes"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Quote> }) => {
      return apiRequest(`/api/admin/quotes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
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

  const filteredQuotes = quotes?.filter(quote => {
    const matchesSearch = !searchQuery || 
      String(quote.id).includes(searchQuery) ||
      quote.customerNotes?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = !statusFilter || quote.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (quoteId: number, newStatus: string) => {
    updateMutation.mutate({ 
      id: quoteId, 
      updates: { status: newStatus, adminNotes: adminNotes || undefined } 
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
          Quote Management
        </h1>
        <p className="mt-2 text-muted-foreground">
          Review and manage customer quote requests
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by quote ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter || "all"} onValueChange={(val) => setStatusFilter(val === "all" ? "" : val)}>
          <SelectTrigger className="w-full sm:w-[180px]">
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
          {filteredQuotes.map((quote) => {
            const status = statusConfig[quote.status] || statusConfig.pending;
            const StatusIcon = status.icon;

            return (
              <Card key={quote.id} data-testid={`card-admin-quote-${quote.id}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">Quote #{quote.id}</h3>
                        <Badge variant={status.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>User ID: {quote.userId}</p>
                        <p>Submitted: {format(new Date(quote.createdAt), "PPp")}</p>
                        {quote.totalEstimate && (
                          <p>Estimated Total: £{Number(quote.totalEstimate).toFixed(2)}</p>
                        )}
                        {quote.customerNotes && (
                          <p className="line-clamp-1">Notes: {quote.customerNotes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedQuote(quote)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {quote.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleStatusChange(quote.id, "quoted")}
                            disabled={updateMutation.isPending}
                          >
                            {updateMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Mark as Quoted"
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No quotes found</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedQuote} onOpenChange={() => setSelectedQuote(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "DM Sans, sans-serif" }}>
              Quote #{selectedQuote?.id}
            </DialogTitle>
            <DialogDescription>
              Quote details and management
            </DialogDescription>
          </DialogHeader>

          {selectedQuote && (
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
                />
              </div>

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
                    >
                      {config.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedQuote(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
