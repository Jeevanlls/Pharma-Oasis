import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import type { Quote } from "@shared/schema";
import { format } from "date-fns";
import { FileText, Package, Clock, CheckCircle2, XCircle, AlertCircle, ArrowRight } from "lucide-react";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  pending: { label: "Pending Review", variant: "secondary", icon: Clock },
  quoted: { label: "Quote Received", variant: "default", icon: FileText },
  accepted: { label: "Accepted", variant: "default", icon: CheckCircle2 },
  declined: { label: "Declined", variant: "destructive", icon: XCircle },
  closed: { label: "Closed", variant: "outline", icon: AlertCircle },
};

export default function MyQuotesPage() {
  const { isAuthenticated, isCustomer, isAdmin } = useAuth();

  const { data: quotes, isLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
    enabled: isAuthenticated && (isCustomer || isAdmin),
  });

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
              Please login to view your quote history.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/login">
                <Button>Login</Button>
              </Link>
              <Link href="/register">
                <Button variant="outline">Register</Button>
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
              <Button variant="outline">Return Home</Button>
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="py-8 sm:py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
                My Quotes
              </h1>
              <p className="mt-2 text-muted-foreground">
                View and track your quote requests
              </p>
            </div>
            <Link href="/products">
              <Button className="gap-2">
                <Package className="h-4 w-4" />
                New Quote
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : quotes && quotes.length > 0 ? (
            <div className="space-y-4">
              {quotes.map((quote) => {
                const status = statusConfig[quote.status] || statusConfig.pending;
                const StatusIcon = status.icon;

                return (
                  <Card key={quote.id} data-testid={`card-quote-${quote.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-lg" style={{ fontFamily: "DM Sans, sans-serif" }}>
                            Quote #{quote.id}
                          </CardTitle>
                          <Badge variant={status.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </div>
                        <CardDescription>
                          Submitted {format(new Date(quote.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="space-y-1">
                          {quote.totalEstimate && (
                            <p className="text-sm">
                              <span className="text-muted-foreground">Estimated Total:</span>{" "}
                              <span className="font-medium">£{Number(quote.totalEstimate).toFixed(2)}</span>
                            </p>
                          )}
                          {quote.customerNotes && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              Notes: {quote.customerNotes}
                            </p>
                          )}
                        </div>
                        <Link href={`/my-quotes/${quote.id}`}>
                          <Button variant="outline" size="sm" className="gap-1">
                            View Details
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <FileText className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                <h2 className="text-xl font-semibold mb-2">No quotes yet</h2>
                <p className="text-muted-foreground mb-6">
                  You haven't submitted any quote requests. Browse our products to get started.
                </p>
                <Link href="/products">
                  <Button className="gap-2">
                    <Package className="h-4 w-4" />
                    Browse Products
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
