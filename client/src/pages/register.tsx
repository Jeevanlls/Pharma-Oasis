import { useState } from "react";
import { Link, useLocation } from "wouter";
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
import { customerRegistrationSchema, type CustomerRegistrationData } from "@shared/schema";
import { PublicLayout } from "@/components/layout/public-layout";
import { Package, Loader2, AlertCircle, Building2, User, MapPin, Shield, CreditCard, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const businessTypes = [
  { value: "pharmacy", label: "Retail Pharmacy" },
  { value: "hospital_pharmacy", label: "Hospital Pharmacy" },
  { value: "online_pharmacy", label: "Online Pharmacy" },
  { value: "dispensing_doctor", label: "Dispensing Doctor" },
  { value: "dental_practice", label: "Dental Practice" },
  { value: "care_home", label: "Care Home" },
  { value: "wholesaler", label: "Wholesaler" },
  { value: "other", label: "Other Healthcare Provider" },
];

const estimatedSpendRanges = [
  { value: "under_5000", label: "Under £5,000/month" },
  { value: "5000_10000", label: "£5,000 - £10,000/month" },
  { value: "10000_25000", label: "£10,000 - £25,000/month" },
  { value: "25000_50000", label: "£25,000 - £50,000/month" },
  { value: "over_50000", label: "Over £50,000/month" },
];

const preferredOrderMethods = [
  { value: "platform", label: "Online Platform" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "account_manager", label: "Account Manager" },
];

const howDidYouHearOptions = [
  { value: "google", label: "Google Search" },
  { value: "referral", label: "Referral from another pharmacy" },
  { value: "trade_show", label: "Trade Show / Exhibition" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "industry_publication", label: "Industry Publication" },
  { value: "other", label: "Other" },
];

type FormStep = "business" | "contact" | "address" | "compliance" | "preferences";

const steps: { id: FormStep; title: string; icon: typeof Building2 }[] = [
  { id: "business", title: "Business Details", icon: Building2 },
  { id: "contact", title: "Contact Info", icon: User },
  { id: "address", title: "Addresses", icon: MapPin },
  { id: "compliance", title: "Compliance", icon: Shield },
  { id: "preferences", title: "Preferences", icon: CreditCard },
];

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<FormStep>("business");
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const form = useForm<CustomerRegistrationData>({
    resolver: zodResolver(customerRegistrationSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      businessType: "",
      companyName: "",
      tradingName: "",
      gphcNumber: "",
      companyRegistrationNumber: "",
      vatNumber: "",
      primaryContactName: "",
      jobTitle: "",
      phoneNumber: "",
      mobileNumber: "",
      billingAddressLine1: "",
      billingAddressLine2: "",
      billingCity: "",
      billingPostcode: "",
      billingCountry: "United Kingdom",
      deliverySameAsBilling: true,
      deliveryAddressLine1: "",
      deliveryAddressLine2: "",
      deliveryCity: "",
      deliveryPostcode: "",
      deliveryCountry: "",
      mhraLicenceType: "",
      mhraLicenceNumber: "",
      responsiblePersonName: "",
      responsiblePersonEmail: "",
      coldChainCapability: false,
      interestedInControlledProducts: false,
      estimatedMonthlySpend: "",
      orderingContactEmail: "",
      accountsPayableEmail: "",
      preferredOrderMethod: "",
      howDidYouHear: "",
      notes: "",
      marketingConsent: false,
    },
    mode: "onChange",
  });

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const onSubmit = async (data: CustomerRegistrationData) => {
    setIsLoading(true);
    setError(null);

    try {
      await apiRequest("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      });

      setIsSuccess(true);
      toast({
        title: "Registration Submitted!",
        description: "Your application is pending review. We'll be in touch soon.",
      });
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const goToNextStep = async () => {
    const fieldsToValidate = getFieldsForStep(currentStep);
    const isValid = await form.trigger(fieldsToValidate as any);
    if (isValid) {
      const nextIndex = currentStepIndex + 1;
      if (nextIndex < steps.length) {
        setCurrentStep(steps[nextIndex].id);
      }
    }
  };

  const goToPreviousStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const getFieldsForStep = (step: FormStep): (keyof CustomerRegistrationData)[] => {
    switch (step) {
      case "business":
        return ["email", "password", "confirmPassword", "businessType", "companyName"];
      case "contact":
        return ["primaryContactName", "phoneNumber"];
      case "address":
        return ["billingAddressLine1", "billingCity", "billingPostcode"];
      case "compliance":
        return [];
      case "preferences":
        return [];
      default:
        return [];
    }
  };

  if (isSuccess) {
    return (
      <PublicLayout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
          <Card className="w-full max-w-md text-center">
            <CardContent className="pt-8 pb-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 mb-6">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl mb-4" style={{ fontFamily: "DM Sans, sans-serif" }}>
                Registration Submitted!
              </CardTitle>
              <CardDescription className="text-base mb-6">
                Thank you for registering with Pharma Oasis. Our team will review your application 
                and contact you within 24-48 hours to complete your account setup.
              </CardDescription>
              <div className="space-y-3">
                <Link href="/">
                  <Button className="w-full">Return to Home</Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" className="w-full">Go to Login</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-8">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground mb-4">
              <Package className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Register Your Business
            </h1>
            <p className="mt-2 text-muted-foreground">
              Complete the form below to apply for a wholesale account
            </p>
          </div>

          <div className="mb-8 overflow-x-auto">
            <div className="flex justify-between min-w-[500px]">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex flex-col items-center flex-1 ${
                    index < currentStepIndex
                      ? "text-primary"
                      : index === currentStepIndex
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                      index < currentStepIndex
                        ? "border-primary bg-primary text-primary-foreground"
                        : index === currentStepIndex
                        ? "border-primary text-primary"
                        : "border-muted text-muted-foreground"
                    }`}
                  >
                    {index < currentStepIndex ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <step.icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className="mt-2 text-xs font-medium hidden sm:block">{step.title}</span>
                  {index < steps.length - 1 && (
                    <div
                      className={`absolute top-5 left-[55%] w-[90%] h-0.5 ${
                        index < currentStepIndex ? "bg-primary" : "bg-muted"
                      }`}
                      style={{ transform: "translateX(-50%)" }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ fontFamily: "DM Sans, sans-serif" }}>
                {(() => {
                  const StepIcon = steps[currentStepIndex].icon;
                  return <StepIcon className="h-5 w-5" />;
                })()}
                {steps[currentStepIndex].title}
              </CardTitle>
              <CardDescription>
                Step {currentStepIndex + 1} of {steps.length}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {currentStep === "business" && (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel>Email Address *</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="you@company.com" data-testid="input-reg-email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password *</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Min. 8 characters" data-testid="input-reg-password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm Password *</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Confirm password" data-testid="input-reg-confirm-password" {...field} />
                              </FormControl>
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
                                <SelectTrigger data-testid="select-business-type">
                                  <SelectValue placeholder="Select your business type" />
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

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Legal company name" data-testid="input-company-name" {...field} />
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
                                <Input placeholder="If different from company name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <FormField
                          control={form.control}
                          name="gphcNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>GPhC Number</FormLabel>
                              <FormControl>
                                <Input placeholder="If applicable" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="companyRegistrationNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Reg. No.</FormLabel>
                              <FormControl>
                                <Input placeholder="Companies House no." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="vatNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>VAT Number</FormLabel>
                              <FormControl>
                                <Input placeholder="If VAT registered" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}

                  {currentStep === "contact" && (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="primaryContactName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Primary Contact Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Full name" data-testid="input-contact-name" {...field} />
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
                                <Input placeholder="e.g. Pharmacy Manager" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="phoneNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number *</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="+44 20 1234 5678" data-testid="input-phone" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="mobileNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mobile Number</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="+44 7700 900000" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}

                  {currentStep === "address" && (
                    <>
                      <div className="space-y-4">
                        <h3 className="font-medium">Billing Address</h3>
                        <FormField
                          control={form.control}
                          name="billingAddressLine1"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address Line 1 *</FormLabel>
                              <FormControl>
                                <Input placeholder="Street address" data-testid="input-billing-address1" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="billingAddressLine2"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Address Line 2</FormLabel>
                              <FormControl>
                                <Input placeholder="Suite, unit, building, etc." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="grid gap-4 sm:grid-cols-3">
                          <FormField
                            control={form.control}
                            name="billingCity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>City *</FormLabel>
                                <FormControl>
                                  <Input placeholder="City" data-testid="input-billing-city" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="billingPostcode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Postcode *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Postcode" data-testid="input-billing-postcode" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="billingCountry"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Country</FormLabel>
                                <FormControl>
                                  <Input placeholder="United Kingdom" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <FormField
                        control={form.control}
                        name="deliverySameAsBilling"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Delivery address is the same as billing address</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />

                      {!form.watch("deliverySameAsBilling") && (
                        <div className="space-y-4 pt-4 border-t">
                          <h3 className="font-medium">Delivery Address</h3>
                          <FormField
                            control={form.control}
                            name="deliveryAddressLine1"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Address Line 1</FormLabel>
                                <FormControl>
                                  <Input placeholder="Street address" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="deliveryAddressLine2"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Address Line 2</FormLabel>
                                <FormControl>
                                  <Input placeholder="Suite, unit, building, etc." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <div className="grid gap-4 sm:grid-cols-3">
                            <FormField
                              control={form.control}
                              name="deliveryCity"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>City</FormLabel>
                                  <FormControl>
                                    <Input placeholder="City" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="deliveryPostcode"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Postcode</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Postcode" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="deliveryCountry"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Country</FormLabel>
                                  <FormControl>
                                    <Input placeholder="United Kingdom" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {currentStep === "compliance" && (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="mhraLicenceType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>MHRA Licence Type</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. WDA(H)" {...field} />
                              </FormControl>
                              <FormDescription>If applicable to your business</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="mhraLicenceNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>MHRA Licence Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Licence number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="responsiblePersonName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Responsible Person Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Full name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="responsiblePersonEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Responsible Person Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="email@company.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="coldChainCapability"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Cold Chain Capability</FormLabel>
                                <FormDescription>
                                  We have facilities to receive and store temperature-sensitive products
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="interestedInControlledProducts"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Interest in Controlled Products</FormLabel>
                                <FormDescription>
                                  We are interested in purchasing controlled drugs / schedule products
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}

                  {currentStep === "preferences" && (
                    <>
                      <FormField
                        control={form.control}
                        name="estimatedMonthlySpend"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estimated Monthly Spend</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select estimated spend" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {estimatedSpendRanges.map((range) => (
                                  <SelectItem key={range.value} value={range.value}>
                                    {range.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="orderingContactEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ordering Contact Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="orders@company.com" {...field} />
                              </FormControl>
                              <FormDescription>For order confirmations</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="accountsPayableEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Accounts Payable Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="accounts@company.com" {...field} />
                              </FormControl>
                              <FormDescription>For invoices</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="preferredOrderMethod"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preferred Order Method</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select preferred method" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {preferredOrderMethods.map((method) => (
                                  <SelectItem key={method.value} value={method.value}>
                                    {method.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="howDidYouHear"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>How Did You Hear About Us?</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select an option" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {howDidYouHearOptions.map((option) => (
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

                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Additional Notes</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Any additional information you'd like to share..."
                                className="min-h-[100px]"
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
                                I agree to receive marketing communications about products, services, and special offers from Pharma Oasis.
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
                        <p className="text-sm text-muted-foreground">
                          By submitting this registration, you agree to our{" "}
                          <Link href="/terms" className="text-primary hover:underline font-medium">
                            Terms of Service
                          </Link>{" "}
                          and{" "}
                          <Link href="/privacy" className="text-primary hover:underline font-medium">
                            Privacy Policy
                          </Link>. 
                          Your data will be processed in accordance with UK GDPR regulations and used solely for 
                          managing your wholesale account and fulfilling orders.
                        </p>
                      </div>
                    </>
                  )}

                  <div className="flex justify-between pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={goToPreviousStep}
                      disabled={currentStepIndex === 0}
                    >
                      Previous
                    </Button>

                    {currentStepIndex < steps.length - 1 ? (
                      <Button type="button" onClick={goToNextStep} data-testid="button-next-step">
                        Next
                      </Button>
                    ) : (
                      <Button type="submit" disabled={isLoading} data-testid="button-submit-registration">
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          "Submit Registration"
                        )}
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
