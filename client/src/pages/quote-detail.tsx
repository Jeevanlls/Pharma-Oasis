import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth";
import { useQuoteBasket } from "@/lib/quote-basket";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Quote, QuoteItem, Product } from "@shared/schema";
import { format, formatDistanceToNow, isPast, isFuture, differenceInDays } from "date-fns";
import { 
  ArrowLeft,
  FileText, 
  Package, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Calendar,
  AlertTriangle,
  ShoppingCart,
  Loader2,
  Info
} from "lucide-react";

type QuoteWithItems = Quote & { items: (QuoteItem & { product: Product })[] };

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock; description: string }> = {
  pending: { 
    label: "Pending Review", 
    variant: "secondary", 
    icon: Clock,
    description: "Your quote request is being reviewed by our team"
  },
  quoted: { 
    label: "Quote Ready", 
    variant: "default", 
    icon: FileText,
    description: "We've prepared your quote. Please review and respond"
  },
  accepted: { 
    label: "Accepted", 
    variant: "default", 
    icon: CheckCircle2,
    description: "You've accepted this quote. Our team will be in touch"
  },
  declined: { 
    label: "Declined", 
    variant: "destructive", 
    icon: XCircle,
    description: "This quote has been declined"
  },
  closed: { 
    label: "Closed", 
    variant: "outline", 
    icon: AlertCircle,
    description: "This quote is no longer active"
  },
};

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isCustomer, isAdmin } = useAuth();
  const { addItem, items: basketItems } = useQuoteBasket();
  const { toast } = useToast();

  const { data: quote, isLoading, error } = useQuery<QuoteWithItems>({
    queryKey: ["/api/quotes", id],
    queryFn: async () => {
      const res = await fetch(`/api/quotes/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch quote");
      return res.json();
    },
    enabled: isAuthenticated && !!id,
  });

  const updateQuoteMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await apiRequest("PATCH", `/api/quotes/${id}`, { status });
      return res.json();
    },
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ["/api/quotes", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      toast({
        title: status === "accepted" ? "Quote Accepted" : "Quote Declined",
        description: status === "accepted" 
          ? "Thank you! Our team will contact you to proceed with your order."
          : "The quote has been declined.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReorder = () => {
    if (!quote?.items) return;
    
    let addedCount = 0;
    for (const item of quote.items) {
      if (item.product && item.product.isActive) {
        addItem(item.product, item.quantity);
        addedCount++;
      }
    }
    
    toast({
      title: "Items Added to Basket",
      description: `${addedCount} product(s) have been added to your quote basket.`,
    });
  };

  const getExpiryInfo = () => {
    if (!quote?.expiryDate) return null;
    
    const expiryDate = new Date(quote.expiryDate);
    const now = new Date();
    const daysUntilExpiry = differenceInDays(expiryDate, now);
    
    if (isPast(expiryDate)) {
      return {
        status: "expired",
        message: `Expired ${formatDistanceToNow(expiryDate)} ago`,
        variant: "destructive" as const,
        icon: AlertTriangle,
      };
    }
    
    if (daysUntilExpiry <= 3) {
      return {
        status: "expiring-soon",
        message: `Expires in ${formatDistanceToNow(expiryDate)}`,
        variant: "secondary" as const,
        icon: AlertTriangle,
      };
    }
    
    return {
      status: "valid",
      message: `Valid until ${format(expiryDate, "MMM d, yyyy")}`,
      variant: "outline" as const,
      icon: Calendar,
    };
  };

  if (!isAuthenticated) {
    return (
      <PublicLayout>
        <div className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-lg text-center">
            <FileText className="mx-auto h-16 w-16 text-muted-foreground/50 mb-6" />
            <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Login Required
            </h1>
            <p className="text-muted-foreground mb-6">
              Please login to view your quote details.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/login">
                <Button data-testid="button-login">Login</Button>
              </Link>
              <Link href="/register">
                <Button variant="outline" data-testid="button-register">Register</Button>
              </Link>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!isCustomer && !isAdmin) {
    return (
      <PublicLayout>
        <div className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-lg text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-muted-foreground/50 mb-6" />
            <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Account Pending
            </h1>
            <p className="text-muted-foreground mb-6">
              Your account is pending approval. You'll be able to view your quotes once approved.
            </p>
            <Link href="/">
              <Button variant="outline" data-testid="button-home">Return Home</Button>
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="py-8 sm:py-12">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <Skeleton className="h-8 w-32 mb-6" />
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-72" />
              </CardHeader>
              <CardContent className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (error || !quote) {
    return (
      <PublicLayout>
        <div className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-lg text-center">
            <AlertCircle className="mx-auto h-16 w-16 text-destructive/50 mb-6" />
            <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Quote Not Found
            </h1>
            <p className="text-muted-foreground mb-6">
              The quote you're looking for doesn't exist or you don't have access to it.
            </p>
            <Link href="/my-quotes">
              <Button variant="outline" data-testid="button-back">Back to My Quotes</Button>
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const status = statusConfig[quote.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const expiryInfo = getExpiryInfo();
  const ExpiryIcon = expiryInfo?.icon;
  const canRespond = quote.status === "quoted" && (!expiryInfo || expiryInfo.status !== "expired");
  const isExpired = expiryInfo?.status === "expired";
  const hasItems = quote.items && quote.items.length > 0;

  return (
    <PublicLayout>
      <div className="py-8 sm:py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Link href="/my-quotes">
            <Button variant="ghost" className="gap-2 mb-6" data-testid="button-back-quotes">
              <ArrowLeft className="h-4 w-4" />
              Back to My Quotes
            </Button>
          </Link>

          <Card>
            <CardHeader className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-2xl" style={{ fontFamily: "DM Sans, sans-serif" }} data-testid="heading-quote-id">
                    Quote #{quote.id}
                  </CardTitle>
                  <CardDescription>
                    Submitted {format(new Date(quote.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                    {quote.version && quote.version > 1 && (
                      <span className="ml-2">(Version {quote.version})</span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-2">
                  <Badge variant={status.variant} className="gap-1" data-testid="badge-status">
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                  {expiryInfo && ExpiryIcon && quote.status === "quoted" && (
                    <Badge variant={expiryInfo.variant} className="gap-1" data-testid="badge-expiry">
                      <ExpiryIcon className="h-3 w-3" />
                      {expiryInfo.message}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">{status.description}</p>
                    {isExpired && quote.status === "quoted" && (
                      <p className="text-sm text-destructive mt-1">
                        This quote has expired. Please contact us if you'd like a new quote.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <Separator />

            <CardContent className="pt-6">
              <h3 className="font-semibold mb-4" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Requested Products ({quote.items?.length || 0})
              </h3>
              
              {hasItems ? (
                <div className="space-y-4">
                  {quote.items.map((item, index) => (
                    <div 
                      key={item.id} 
                      className="flex gap-4 p-4 rounded-lg bg-muted/30"
                      data-testid={`quote-item-${item.id}`}
                    >
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                        {item.product?.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.productName}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-medium leading-tight line-clamp-2">
                              {item.product?.productName || "Product Unavailable"}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {item.product?.sku && `SKU: ${item.product.sku}`}
                              {item.product?.packSize && ` | ${item.product.packSize}`}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm text-muted-foreground">
                              Qty: <span className="font-medium text-foreground">{item.quantity}</span>
                            </p>
                            {item.unitPrice && (
                              <p className="text-sm">
                                <span className="text-muted-foreground">Unit: </span>
                                <span className="font-medium">£{Number(item.unitPrice).toFixed(2)}</span>
                              </p>
                            )}
                            {item.lineTotal && (
                              <p className="text-sm font-semibold">
                                £{Number(item.lineTotal).toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No items in this quote</p>
                </div>
              )}

              {quote.totalEstimate && (
                <>
                  <Separator className="my-6" />
                  <div className="flex justify-between items-center p-4 rounded-lg bg-primary/5">
                    <span className="font-semibold">Estimated Total</span>
                    <span className="text-xl font-bold" data-testid="text-total">
                      £{Number(quote.totalEstimate).toFixed(2)}
                    </span>
                  </div>
                </>
              )}

              {quote.customerNotes && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <h4 className="font-semibold mb-2">Your Notes</h4>
                    <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
                      {quote.customerNotes}
                    </p>
                  </div>
                </>
              )}

              {quote.adminNotes && (quote.status === "quoted" || quote.status === "accepted" || quote.status === "declined") && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <h4 className="font-semibold mb-2">Admin Notes</h4>
                    <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
                      {quote.adminNotes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>

            <Separator />

            <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6">
              {canRespond && (
                <>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button className="gap-2 w-full sm:w-auto" data-testid="button-accept-quote">
                        <CheckCircle2 className="h-4 w-4" />
                        Accept Quote
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Accept This Quote?</AlertDialogTitle>
                        <AlertDialogDescription>
                          By accepting this quote, you're confirming your intent to proceed with the order. 
                          Our team will contact you to finalize the details and arrange delivery.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid="button-cancel-accept">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => updateQuoteMutation.mutate("accepted")}
                          disabled={updateQuoteMutation.isPending}
                          data-testid="button-confirm-accept"
                        >
                          {updateQuoteMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Yes, Accept Quote"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="gap-2 w-full sm:w-auto" data-testid="button-decline-quote">
                        <XCircle className="h-4 w-4" />
                        Decline Quote
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Decline This Quote?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to decline this quote? You can always request a new quote 
                          if your requirements change.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid="button-cancel-decline">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => updateQuoteMutation.mutate("declined")}
                          disabled={updateQuoteMutation.isPending}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          data-testid="button-confirm-decline"
                        >
                          {updateQuoteMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Yes, Decline Quote"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}

              {hasItems && (
                <Button 
                  variant="secondary" 
                  className="gap-2 w-full sm:w-auto sm:ml-auto" 
                  onClick={handleReorder}
                  data-testid="button-reorder"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Reorder These Products
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
