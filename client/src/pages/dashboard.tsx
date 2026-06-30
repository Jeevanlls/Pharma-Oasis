import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Quote, User } from "@shared/schema";
import { format } from "date-fns";
import { 
  User as UserIcon, 
  FileText, 
  Package, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Building2,
  MapPin,
  Phone,
  Mail,
  Edit2,
  Save,
  X,
  ArrowRight,
  Shield
} from "lucide-react";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  pending: { label: "Pending Review", variant: "secondary", icon: Clock },
  quoted: { label: "Quote Received", variant: "default", icon: FileText },
  accepted: { label: "Accepted", variant: "default", icon: CheckCircle2 },
  declined: { label: "Declined", variant: "destructive", icon: XCircle },
  closed: { label: "Closed", variant: "outline", icon: AlertCircle },
};

type SafeUser = Omit<User, 'passwordHash'>;

export default function DashboardPage() {
  const { isAuthenticated, isCustomer, isAdmin, user } = useAuth();
  const { toast } = useToast();
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<SafeUser>>({});

  const { data: quotes, isLoading: quotesLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
    enabled: isAuthenticated && (isCustomer || isAdmin),
  });

  const { data: profile, isLoading: profileLoading } = useQuery<{ user: SafeUser }>({
    queryKey: ["/api/auth/me"],
    enabled: isAuthenticated,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<SafeUser>) => {
      const res = await apiRequest("PATCH", "/api/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Profile Updated",
        description: "Your account details have been saved successfully.",
      });
      setEditingSection(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleStartEdit = (section: string) => {
    if (profile?.user) {
      setFormData({ ...profile.user });
    }
    setEditingSection(section);
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    setFormData({});
  };

  const handleSaveSection = (section: string) => {
    const updates: Partial<SafeUser> = {};
    
    if (section === "contact") {
      updates.primaryContactName = formData.primaryContactName;
      updates.jobTitle = formData.jobTitle;
      updates.phoneNumber = formData.phoneNumber;
      updates.mobileNumber = formData.mobileNumber;
    } else if (section === "billing") {
      updates.billingAddressLine1 = formData.billingAddressLine1;
      updates.billingAddressLine2 = formData.billingAddressLine2;
      updates.billingCity = formData.billingCity;
      updates.billingPostcode = formData.billingPostcode;
    } else if (section === "delivery") {
      updates.deliveryAddressLine1 = formData.deliveryAddressLine1;
      updates.deliveryAddressLine2 = formData.deliveryAddressLine2;
      updates.deliveryCity = formData.deliveryCity;
      updates.deliveryPostcode = formData.deliveryPostcode;
      updates.deliverySameAsBilling = formData.deliverySameAsBilling;
    } else if (section === "trading") {
      updates.orderingContactEmail = formData.orderingContactEmail;
      updates.accountsPayableEmail = formData.accountsPayableEmail;
      updates.preferredOrderMethod = formData.preferredOrderMethod;
    }
    
    updateProfileMutation.mutate(updates);
  };

  if (!isAuthenticated) {
    return (
      <PublicLayout>
        <div className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-lg text-center">
            <UserIcon className="mx-auto h-16 w-16 text-muted-foreground/50 mb-6" />
            <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Login Required
            </h1>
            <p className="text-muted-foreground mb-6">
              Please login to access your dashboard.
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
              Your account is pending approval. You'll be able to access your dashboard once approved.
            </p>
            <Link href="/">
              <Button variant="outline">Return Home</Button>
            </Link>
          </div>
        </div>
      </PublicLayout>
    );
  }

  const userData = profile?.user;
  const recentQuotes = quotes?.slice(0, 5) || [];
  const quoteStats = {
    total: quotes?.length || 0,
    pending: quotes?.filter(q => q.status === "pending").length || 0,
    quoted: quotes?.filter(q => q.status === "quoted").length || 0,
    accepted: quotes?.filter(q => q.status === "accepted").length || 0,
  };

  return (
    <PublicLayout>
      <div className="py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Welcome back, {userData?.primaryContactName || userData?.companyName || "Customer"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Manage your account and view your quotes
            </p>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid gap-1">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="quotes" data-testid="tab-quotes">My Quotes</TabsTrigger>
              <TabsTrigger value="account" data-testid="tab-account">Account</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Quotes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-total-quotes">{quoteStats.total}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-amber-600" data-testid="text-pending-quotes">{quoteStats.pending}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Quotes Received</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600" data-testid="text-quoted">{quoteStats.quoted}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Accepted</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600" data-testid="text-accepted">{quoteStats.accepted}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                      <div>
                        <CardTitle style={{ fontFamily: "DM Sans, sans-serif" }}>Recent Quotes</CardTitle>
                        <CardDescription>Your latest quote requests</CardDescription>
                      </div>
                      <Link href="/my-quotes">
                        <Button variant="outline" size="sm" className="gap-1">
                          View All
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </CardHeader>
                    <CardContent>
                      {quotesLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                          ))}
                        </div>
                      ) : recentQuotes.length > 0 ? (
                        <div className="space-y-3">
                          {recentQuotes.map((quote) => {
                            const status = statusConfig[quote.status] || statusConfig.pending;
                            const StatusIcon = status.icon;
                            return (
                              <div key={quote.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-3">
                                  <FileText className="h-5 w-5 text-muted-foreground" />
                                  <div>
                                    <p className="font-medium">Quote #{quote.id}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {format(new Date(quote.createdAt), "MMM d, yyyy")}
                                    </p>
                                  </div>
                                </div>
                                <Badge variant={status.variant} className="gap-1">
                                  <StatusIcon className="h-3 w-3" />
                                  {status.label}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                          <p>No quotes yet</p>
                          <Link href="/products">
                            <Button variant="ghost" className="mt-2">Browse Products</Button>
                          </Link>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle style={{ fontFamily: "DM Sans, sans-serif" }}>Account Summary</CardTitle>
                    <CardDescription>Your business details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {profileLoading ? (
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    ) : userData ? (
                      <>
                        <div className="flex items-start gap-3">
                          <Building2 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium" data-testid="text-company-name">{userData.companyName || "Not set"}</p>
                            {userData.tradingName && (
                              <p className="text-sm text-muted-foreground">Trading as: {userData.tradingName}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Mail className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm" data-testid="text-email">{userData.email}</p>
                          </div>
                        </div>
                        {userData.phoneNumber && (
                          <div className="flex items-start gap-3">
                            <Phone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <p className="text-sm">{userData.phoneNumber}</p>
                          </div>
                        )}
                        {userData.billingAddressLine1 && (
                          <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <p className="text-sm">
                              {userData.billingAddressLine1}
                              {(userData.billingCity || userData.billingPostcode) && (
                                <><br />{[userData.billingCity, userData.billingPostcode].filter(Boolean).join(", ")}</>
                              )}
                            </p>
                          </div>
                        )}
                        {userData.gphcNumber && (
                          <div className="flex items-start gap-3">
                            <Shield className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm">GPhC: {userData.gphcNumber}</p>
                            </div>
                          </div>
                        )}
                      </>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="quotes" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  All Quotes
                </h2>
                <Link href="/products">
                  <Button className="gap-2" data-testid="button-new-quote">
                    <Package className="h-4 w-4" />
                    New Quote
                  </Button>
                </Link>
              </div>

              {quotesLoading ? (
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
                            <div className="flex items-center gap-3 flex-wrap">
                              <CardTitle className="text-lg" style={{ fontFamily: "DM Sans, sans-serif" }}>
                                Quote #{quote.id}
                              </CardTitle>
                              <Badge variant={status.variant} className="gap-1">
                                <StatusIcon className="h-3 w-3" />
                                {status.label}
                              </Badge>
                            </div>
                            <CardDescription>
                              {format(new Date(quote.createdAt), "MMM d, yyyy 'at' h:mm a")}
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
                              <Button variant="outline" size="sm" className="gap-1" data-testid={`button-view-quote-${quote.id}`}>
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
            </TabsContent>

            <TabsContent value="account" className="space-y-6">
              {profileLoading ? (
                <div className="space-y-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-5 w-40" />
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : userData ? (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                      <div>
                        <CardTitle style={{ fontFamily: "DM Sans, sans-serif" }}>Contact Information</CardTitle>
                        <CardDescription>Your primary contact details</CardDescription>
                      </div>
                      {editingSection === "contact" ? (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={handleCancelEdit}
                            data-testid="button-cancel-contact"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleSaveSection("contact")}
                            disabled={updateProfileMutation.isPending}
                            data-testid="button-save-contact"
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleStartEdit("contact")}
                          data-testid="button-edit-contact"
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      {editingSection === "contact" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="primaryContactName">Contact Name</Label>
                            <Input
                              id="primaryContactName"
                              value={formData.primaryContactName || ""}
                              onChange={(e) => setFormData({ ...formData, primaryContactName: e.target.value })}
                              data-testid="input-contact-name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="jobTitle">Job Title</Label>
                            <Input
                              id="jobTitle"
                              value={formData.jobTitle || ""}
                              onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                              data-testid="input-job-title"
                            />
                          </div>
                          <div>
                            <Label htmlFor="phoneNumber">Phone Number</Label>
                            <Input
                              id="phoneNumber"
                              value={formData.phoneNumber || ""}
                              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                              data-testid="input-phone"
                            />
                          </div>
                          <div>
                            <Label htmlFor="mobileNumber">Mobile Number</Label>
                            <Input
                              id="mobileNumber"
                              value={formData.mobileNumber || ""}
                              onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                              data-testid="input-mobile"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Contact Name</p>
                            <p className="font-medium">{userData.primaryContactName || "Not set"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Job Title</p>
                            <p className="font-medium">{userData.jobTitle || "Not set"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Phone Number</p>
                            <p className="font-medium">{userData.phoneNumber || "Not set"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Mobile Number</p>
                            <p className="font-medium">{userData.mobileNumber || "Not set"}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                      <div>
                        <CardTitle style={{ fontFamily: "DM Sans, sans-serif" }}>Billing Address</CardTitle>
                        <CardDescription>Your billing address for invoices</CardDescription>
                      </div>
                      {editingSection === "billing" ? (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleSaveSection("billing")}
                            disabled={updateProfileMutation.isPending}
                            data-testid="button-save-billing"
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleStartEdit("billing")}
                          data-testid="button-edit-billing"
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      {editingSection === "billing" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="sm:col-span-2">
                            <Label htmlFor="billingAddressLine1">Address Line 1</Label>
                            <Input
                              id="billingAddressLine1"
                              value={formData.billingAddressLine1 || ""}
                              onChange={(e) => setFormData({ ...formData, billingAddressLine1: e.target.value })}
                              data-testid="input-billing-address1"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Label htmlFor="billingAddressLine2">Address Line 2</Label>
                            <Input
                              id="billingAddressLine2"
                              value={formData.billingAddressLine2 || ""}
                              onChange={(e) => setFormData({ ...formData, billingAddressLine2: e.target.value })}
                              data-testid="input-billing-address2"
                            />
                          </div>
                          <div>
                            <Label htmlFor="billingCity">City</Label>
                            <Input
                              id="billingCity"
                              value={formData.billingCity || ""}
                              onChange={(e) => setFormData({ ...formData, billingCity: e.target.value })}
                              data-testid="input-billing-city"
                            />
                          </div>
                          <div>
                            <Label htmlFor="billingPostcode">Postcode</Label>
                            <Input
                              id="billingPostcode"
                              value={formData.billingPostcode || ""}
                              onChange={(e) => setFormData({ ...formData, billingPostcode: e.target.value })}
                              data-testid="input-billing-postcode"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="font-medium">{userData.billingAddressLine1 || "Not set"}</p>
                          {userData.billingAddressLine2 && <p>{userData.billingAddressLine2}</p>}
                          <p>{userData.billingCity}, {userData.billingPostcode}</p>
                          <p>{userData.billingCountry}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                      <div>
                        <CardTitle style={{ fontFamily: "DM Sans, sans-serif" }}>Delivery Address</CardTitle>
                        <CardDescription>Where orders should be delivered</CardDescription>
                      </div>
                      {editingSection === "delivery" ? (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleSaveSection("delivery")}
                            disabled={updateProfileMutation.isPending}
                            data-testid="button-save-delivery"
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleStartEdit("delivery")}
                          data-testid="button-edit-delivery"
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      {editingSection === "delivery" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="sm:col-span-2">
                            <Label htmlFor="deliveryAddressLine1">Address Line 1</Label>
                            <Input
                              id="deliveryAddressLine1"
                              value={formData.deliveryAddressLine1 || ""}
                              onChange={(e) => setFormData({ ...formData, deliveryAddressLine1: e.target.value })}
                              data-testid="input-delivery-address1"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Label htmlFor="deliveryAddressLine2">Address Line 2</Label>
                            <Input
                              id="deliveryAddressLine2"
                              value={formData.deliveryAddressLine2 || ""}
                              onChange={(e) => setFormData({ ...formData, deliveryAddressLine2: e.target.value })}
                              data-testid="input-delivery-address2"
                            />
                          </div>
                          <div>
                            <Label htmlFor="deliveryCity">City</Label>
                            <Input
                              id="deliveryCity"
                              value={formData.deliveryCity || ""}
                              onChange={(e) => setFormData({ ...formData, deliveryCity: e.target.value })}
                              data-testid="input-delivery-city"
                            />
                          </div>
                          <div>
                            <Label htmlFor="deliveryPostcode">Postcode</Label>
                            <Input
                              id="deliveryPostcode"
                              value={formData.deliveryPostcode || ""}
                              onChange={(e) => setFormData({ ...formData, deliveryPostcode: e.target.value })}
                              data-testid="input-delivery-postcode"
                            />
                          </div>
                        </div>
                      ) : userData.deliverySameAsBilling ? (
                        <p className="text-muted-foreground">Same as billing address</p>
                      ) : (
                        <div className="space-y-1">
                          <p className="font-medium">{userData.deliveryAddressLine1 || "Not set"}</p>
                          {userData.deliveryAddressLine2 && <p>{userData.deliveryAddressLine2}</p>}
                          <p>{userData.deliveryCity}, {userData.deliveryPostcode}</p>
                          <p>{userData.deliveryCountry}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                      <div>
                        <CardTitle style={{ fontFamily: "DM Sans, sans-serif" }}>Trading Preferences</CardTitle>
                        <CardDescription>Your ordering and payment preferences</CardDescription>
                      </div>
                      {editingSection === "trading" ? (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            onClick={() => handleSaveSection("trading")}
                            disabled={updateProfileMutation.isPending}
                            data-testid="button-save-trading"
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleStartEdit("trading")}
                          data-testid="button-edit-trading"
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      {editingSection === "trading" ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="orderingContactEmail">Ordering Contact Email</Label>
                            <Input
                              id="orderingContactEmail"
                              type="email"
                              value={formData.orderingContactEmail || ""}
                              onChange={(e) => setFormData({ ...formData, orderingContactEmail: e.target.value })}
                              data-testid="input-ordering-email"
                            />
                          </div>
                          <div>
                            <Label htmlFor="accountsPayableEmail">Accounts Payable Email</Label>
                            <Input
                              id="accountsPayableEmail"
                              type="email"
                              value={formData.accountsPayableEmail || ""}
                              onChange={(e) => setFormData({ ...formData, accountsPayableEmail: e.target.value })}
                              data-testid="input-accounts-email"
                            />
                          </div>
                          <div>
                            <Label htmlFor="preferredOrderMethod">Preferred Order Method</Label>
                            <Input
                              id="preferredOrderMethod"
                              value={formData.preferredOrderMethod || ""}
                              onChange={(e) => setFormData({ ...formData, preferredOrderMethod: e.target.value })}
                              placeholder="e.g., Email, Phone, Portal"
                              data-testid="input-order-method"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Ordering Contact Email</p>
                            <p className="font-medium">{userData.orderingContactEmail || "Not set"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Accounts Payable Email</p>
                            <p className="font-medium">{userData.accountsPayableEmail || "Not set"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Preferred Order Method</p>
                            <p className="font-medium">{userData.preferredOrderMethod || "Not set"}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle style={{ fontFamily: "DM Sans, sans-serif" }}>Business & Compliance</CardTitle>
                      <CardDescription>Your business registration and compliance details (read-only)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Company Name</p>
                          <p className="font-medium">{userData.companyName || "Not set"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Trading Name</p>
                          <p className="font-medium">{userData.tradingName || "Not set"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Business Type</p>
                          <p className="font-medium">{userData.businessType || "Not set"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">VAT Number</p>
                          <p className="font-medium">{userData.vatNumber || "Not set"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">GPhC Number</p>
                          <p className="font-medium">{userData.gphcNumber || "Not applicable"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">MHRA Licence</p>
                          <p className="font-medium">
                            {userData.mhraLicenceNumber 
                              ? `${userData.mhraLicenceType}: ${userData.mhraLicenceNumber}` 
                              : "Not applicable"}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-4">
                        To update business or compliance details, please contact our team.
                      </p>
                    </CardContent>
                  </Card>
                </>
              ) : null}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PublicLayout>
  );
}
