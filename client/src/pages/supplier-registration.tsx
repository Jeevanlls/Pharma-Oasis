import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { supplierRegistrationSchema, type SupplierRegistrationData } from "@shared/schema";
import { PublicLayout } from "@/components/layout/public-layout";
import { Building2, Loader2, CheckCircle2, Award, Truck, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const businessTypes = [
  { value: "manufacturer", label: "Manufacturer" },
  { value: "distributor", label: "Distributor" },
  { value: "importer", label: "Importer" },
  { value: "wholesaler", label: "Wholesaler" },
  { value: "agent", label: "Agent/Representative" },
  { value: "other", label: "Other" },
];

const countries = [
  "United Kingdom", "United States", "Germany", "France", "Italy", "Spain", "Netherlands",
  "Belgium", "Ireland", "Switzerland", "Austria", "Poland", "Sweden", "Denmark", "Norway",
  "China", "India", "Japan", "South Korea", "Taiwan", "Other",
];

const licensedOptions = [
  { value: "uk_only", label: "UK Only" },
  { value: "eu_only", label: "EU Only" },
  { value: "uk_and_eu", label: "Both UK and EU" },
  { value: "neither", label: "Neither" },
];

export default function SupplierRegistrationPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const form = useForm<SupplierRegistrationData>({
    resolver: zodResolver(supplierRegistrationSchema),
    defaultValues: {
      companyName: "",
      tradingName: "",
      website: "",
      country: "",
      businessType: "",
      contactName: "",
      jobTitle: "",
      email: "",
      phoneNumber: "",
      mhraGdpLicences: "",
      gdpAccredited: false,
      productCategoriesSupply: "",
      brandNamesRepresent: "",
      licensedUkEu: "",
      exclusivityInterest: false,
      stockLocations: "",
      minimumOrderQuantities: "",
      logisticsCapability: "",
      proposalSummary: "",
      additionalNotes: "",
      marketingConsent: false,
    },
  });

  const onSubmit = async (data: SupplierRegistrationData) => {
    setIsLoading(true);
    try {
      await apiRequest("/api/supplier-leads", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setIsSuccess(true);
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <PublicLayout>
        <div className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-md">
            <Card className="text-center">
              <CardContent className="pt-8 pb-8">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 mb-6">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <CardTitle className="text-2xl mb-4" style={{ fontFamily: "DM Sans, sans-serif" }}>
                  Application Submitted!
                </CardTitle>
                <CardDescription className="text-base mb-6">
                  Thank you for your interest in partnering with Pharma Oasis. Our partnerships team 
                  will review your application and contact you within 3-5 business days.
                </CardDescription>
                <Link href="/">
                  <Button className="w-full">Return to Home</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <section className="bg-gradient-to-br from-sidebar to-sidebar/95 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <Badge variant="outline" className="mb-6 bg-white/10 text-white border-white/20">
            Partner With Us
          </Badge>
          <h1 className="text-3xl font-bold text-white sm:text-4xl" style={{ fontFamily: "DM Sans, sans-serif" }}>
            Become a Supplier Partner
          </h1>
          <p className="mt-4 text-lg text-white/80 max-w-2xl mx-auto">
            Join our network of premium healthcare suppliers and reach 3,000+ UK pharmacies 
            through our established distribution network.
          </p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 text-white/80">
              <Users className="h-5 w-5" />
              <span className="text-sm">3,000+ Customers</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-white/80">
              <Truck className="h-5 w-5" />
              <span className="text-sm">UK-Wide Delivery</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-white/80">
              <Award className="h-5 w-5" />
              <span className="text-sm">GDP Certified</span>
            </div>
          </div>
        </div>
      </section>

      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle style={{ fontFamily: "DM Sans, sans-serif" }}>Supplier Application</CardTitle>
              </div>
              <CardDescription>
                Tell us about your company and the products you can supply.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg border-b pb-2">Company Information</h3>
                    
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Company Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Legal company name" data-testid="input-supplier-company" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="tradingName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Trading Name</FormLabel>
                            <FormControl>
                              <Input placeholder="If different" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Website</FormLabel>
                            <FormControl>
                              <Input placeholder="https://www.company.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-supplier-country">
                                  <SelectValue placeholder="Select country" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {countries.map((country) => (
                                  <SelectItem key={country} value={country}>
                                    {country}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="businessType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Type *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select business type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {businessTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-lg border-b pb-2">Contact Details</h3>
                    
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="contactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Full name" data-testid="input-supplier-contact" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="jobTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Job Title</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Sales Director" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email *</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="contact@company.com" data-testid="input-supplier-email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number *</FormLabel>
                            <FormControl>
                              <Input type="tel" placeholder="+44 20 1234 5678" data-testid="input-supplier-phone" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-lg border-b pb-2">Regulatory & Compliance</h3>
                    
                    <FormField
                      control={form.control}
                      name="mhraGdpLicences"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>MHRA / GDP Licences</FormLabel>
                          <FormControl>
                            <Input placeholder="List any relevant licence numbers" {...field} />
                          </FormControl>
                          <FormDescription>If applicable</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="gdpAccredited"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>GDP Accredited</FormLabel>
                              <FormDescription>
                                We hold GDP certification
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="licensedUkEu"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Licensed Region</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select region" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {licensedOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-lg border-b pb-2">Products & Capabilities</h3>
                    
                    <FormField
                      control={form.control}
                      name="productCategoriesSupply"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Categories *</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="e.g. OTC Medicines, Vitamins & Supplements, Medical Devices..."
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>List the main product categories you can supply</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="brandNamesRepresent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand Names *</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="List the brand names you represent or manufacture..."
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="stockLocations"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stock Locations</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. UK, Netherlands, Germany" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="minimumOrderQuantities"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Typical MOQs</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. 10 units per SKU" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="logisticsCapability"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Logistics Capability</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Direct to UK, Cold chain available" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="exclusivityInterest"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Exclusivity Interest</FormLabel>
                            <FormDescription>
                              We are interested in discussing exclusive distribution arrangements
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-lg border-b pb-2">Partnership Proposal</h3>
                    
                    <FormField
                      control={form.control}
                      name="proposalSummary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Proposal Summary *</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Tell us about your company, why you'd like to partner with us, and what value you can bring..."
                              className="min-h-[120px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="additionalNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Any other information you'd like to share..."
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="marketingConsent"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-marketing-consent"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Marketing Communications (Optional)</FormLabel>
                            <FormDescription>
                              I agree to receive updates about partnership opportunities from Pharma Oasis.
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
                      <p className="text-sm text-muted-foreground">
                        By submitting this application, you agree to our{" "}
                        <Link href="/terms" className="text-primary hover:underline font-medium">
                          Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy" className="text-primary hover:underline font-medium">
                          Privacy Policy
                        </Link>. 
                        Your data will be processed in accordance with UK GDPR regulations and used solely for 
                        evaluating your supplier application.
                      </p>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-submit-supplier">
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting Application...
                      </>
                    ) : (
                      "Submit Application"
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
