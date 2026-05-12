import { useState } from "react";
import { Link, useLocation } from "wouter";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuoteBasket } from "@/lib/quote-basket";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Package, 
  ArrowRight, 
  Loader2,
  CheckCircle2,
  FileText,
} from "lucide-react";
import placeholderImage from "@assets/generated_images/product_placeholder_coming_soon.png";

export default function QuotePage() {
  const [, setLocation] = useLocation();
  const { items, updateQuantity, removeItem, clearBasket, itemCount, totalEstimate } = useQuoteBasket();
  const { isAuthenticated, isCustomer, isAdmin } = useAuth();
  const { toast } = useToast();
  const [customerNotes, setCustomerNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const canSubmit = (isCustomer || isAdmin) && items.length > 0;

  const handleSubmitQuote = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const quoteItems = items.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
      }));

      await apiRequest("POST", "/api/quotes", {
          items: quoteItems,
          customerNotes: customerNotes || undefined,
        });

      clearBasket();
      setCustomerNotes("");
      setIsSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
    } catch (error: any) {
      toast({
        title: "Failed to submit quote",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <PublicLayout>
        <div className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-lg">
            <Card className="text-center">
              <CardContent className="pt-8 pb-8">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 mb-6">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <CardTitle className="text-2xl mb-4" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  Quote Request Submitted!
                </CardTitle>
                <CardDescription className="text-base mb-6">
                  Thank you for your quote request. Our team will review it and respond within 24 hours 
                  with a formal quotation.
                </CardDescription>
                <div className="space-y-3">
                  <Link href="/my-quotes">
                    <Button className="w-full gap-2">
                      <FileText className="h-4 w-4" />
                      View My Quotes
                    </Button>
                  </Link>
                  <Link href="/products">
                    <Button variant="outline" className="w-full">
                      Continue Shopping
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <PublicLayout>
        <div className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-lg text-center">
            <ShoppingCart className="mx-auto h-16 w-16 text-muted-foreground/50 mb-6" />
            <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Login Required
            </h1>
            <p className="text-muted-foreground mb-6">
              Please login or register to view your quote basket and request quotes.
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

  return (
    <PublicLayout>
      <div className="py-8 sm:py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Quote Basket
            </h1>
            <p className="mt-2 text-muted-foreground">
              Review your selected products and submit a quote request
            </p>
          </div>

          {items.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <ShoppingCart className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Your basket is empty</h2>
                <p className="text-muted-foreground mb-6">
                  Browse our product catalogue and add items to request a quote.
                </p>
                <Link href="/products">
                  <Button className="gap-2">
                    <Package className="h-4 w-4" />
                    Browse Products
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                {items.map((item) => (
                  <Card key={item.product.id} data-testid={`quote-item-${item.product.id}`}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                          <img
                            src={item.product.imageUrl || placeholderImage}
                            alt={item.product.imageUrl ? item.product.productName : "Image coming soon"}
                            className="h-full w-full object-contain"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <h3 className="font-medium leading-tight line-clamp-2">
                                {item.product.productName}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                SKU: {item.product.sku}
                                {item.product.packSize && ` | ${item.product.packSize}`}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive flex-shrink-0"
                              onClick={() => removeItem(item.product.id)}
                              aria-label={`Remove ${item.product.productName} from quote`}
                              data-testid={`button-remove-${item.product.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="mt-3 flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Qty:</span>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 1)}
                                className="w-20 text-center"
                                data-testid={`input-qty-basket-${item.product.id}`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex justify-between items-center pt-4">
                  <Button variant="ghost" onClick={clearBasket} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear Basket
                  </Button>
                  <Link href="/products">
                    <Button variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Add More Products
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-1">
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle style={{ fontFamily: "DM Sans, sans-serif" }}>Quote Summary</CardTitle>
                    <CardDescription>Review your quote request</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Products</span>
                      <span className="font-medium">{itemCount} items</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pricing will be provided in your quotation
                    </p>

                    <div className="pt-4 border-t">
                      <label className="block text-sm font-medium mb-2">
                        Notes (optional)
                      </label>
                      <Textarea
                        placeholder="Any special requirements or notes for your quote..."
                        value={customerNotes}
                        onChange={(e) => setCustomerNotes(e.target.value)}
                        className="min-h-[100px]"
                        data-testid="input-quote-notes"
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-3">
                    {!isCustomer && !isAdmin ? (
                      <div className="w-full text-center">
                        <Badge variant="secondary" className="mb-2">Account Pending</Badge>
                        <p className="text-xs text-muted-foreground">
                          Your account is pending approval. You'll be able to submit quotes once approved.
                        </p>
                      </div>
                    ) : (
                      <Button
                        className="w-full gap-2"
                        onClick={handleSubmitQuote}
                        disabled={isSubmitting || items.length === 0}
                        data-testid="button-submit-quote"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            Submit Quote Request
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
