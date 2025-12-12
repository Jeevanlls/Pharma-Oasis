import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "wouter";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { contactFormSchema, type ContactFormData, type CompanyLocation, type CmsBlock } from "@shared/schema";
import { Mail, Phone, MapPin, Clock, Loader2, CheckCircle2 } from "lucide-react";

interface SiteSettings {
  site_name?: string;
  site_tagline?: string;
  contact_email?: string;
  contact_phone?: string;
  active_theme?: string;
}

interface BusinessHour {
  day: string;
  hours: string;
}

export default function ContactPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const { data: siteSettings } = useQuery<SiteSettings>({
    queryKey: ["/api/site-settings"],
  });

  const { data: locations = [] } = useQuery<CompanyLocation[]>({
    queryKey: ["/api/company-locations"],
  });

  const { data: cmsBlocks = [] } = useQuery<CmsBlock[]>({
    queryKey: ["/api/cms-blocks/contact"],
  });

  const contactEmail = siteSettings?.contact_email || "trade@pharmaoasis.com";
  const contactPhone = siteSettings?.contact_phone || "+44 7481 640640";
  const headquarters = locations.find(l => l.locationType === "headquarters");

  // Get CMS content
  const getContent = (key: string, fallback: string) => {
    const block = cmsBlocks.find(b => b.key === key);
    return block?.content || fallback;
  };

  const pageSubtitle = getContent("contact_page_subtitle", "Have questions about our products or services? Our team is here to help.");
  const responseTime = getContent("contact_response_time", "24 hours");
  const urgentTitle = getContent("contact_urgent_title", "Need Urgent Assistance?");
  const urgentText = getContent("contact_urgent_text", "For urgent orders or time-sensitive inquiries, please call our priority line.");

  // Parse business hours
  let businessHours: BusinessHour[] = [];
  try {
    const hoursJson = getContent("contact_business_hours", "[]");
    businessHours = JSON.parse(hoursJson);
  } catch {
    businessHours = [
      { day: "Monday - Friday", hours: "9am - 6pm" },
      { day: "Saturday", hours: "9am - 1pm" },
      { day: "Sunday", hours: "Closed" }
    ];
  }

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: "",
      privacyConsent: false,
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/contact", data);
      setIsSuccess(true);
      form.reset();
    } catch (error: any) {
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h1 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Contact Us
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {pageSubtitle}
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle style={{ fontFamily: "DM Sans, sans-serif" }}>Send us a message</CardTitle>
                  <CardDescription>
                    Fill out the form below and we'll get back to you within {responseTime}.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isSuccess ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">Message Sent!</h3>
                      <p className="text-muted-foreground mb-4">
                        Thank you for contacting us. We'll respond to your inquiry shortly.
                      </p>
                      <Button variant="outline" onClick={() => setIsSuccess(false)}>
                        Send Another Message
                      </Button>
                    </div>
                  ) : (
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Name *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Your name" data-testid="input-contact-name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email *</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="you@example.com" data-testid="input-contact-email" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone (optional)</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="+44 20 1234 5678" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Message *</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="How can we help you?"
                                  className="min-h-[150px]"
                                  data-testid="input-contact-message"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="privacyConsent"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  data-testid="checkbox-privacy-consent"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Privacy Policy Consent *</FormLabel>
                                <FormDescription>
                                  I agree to the{" "}
                                  <Link href="/privacy" className="text-primary hover:underline">
                                    Privacy Policy
                                  </Link>{" "}
                                  and consent to Pharma Oasis processing my personal data to respond to my enquiry.
                                </FormDescription>
                                <FormMessage />
                              </div>
                            </FormItem>
                          )}
                        />
                        <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-submit-contact">
                          {isLoading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            "Send Message"
                          )}
                        </Button>
                      </form>
                    </Form>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Mail className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">Email</h3>
                        <p className="mt-1 text-sm text-muted-foreground">General enquiries</p>
                        <a href={`mailto:${contactEmail}`} className="text-sm text-primary hover:underline">
                          {contactEmail}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Phone className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">Phone</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Customer support</p>
                        <a href={`tel:${contactPhone.replace(/\s+/g, "")}`} className="text-sm text-primary hover:underline">
                          {contactPhone}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">Address</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {headquarters ? (
                            <>
                              {headquarters.companyName}<br />
                              {headquarters.addressLine1}<br />
                              {headquarters.city}, {headquarters.postcode}
                            </>
                          ) : (
                            <>
                              Pharma Oasis Ltd<br />
                              United Kingdom
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">Business Hours</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {businessHours.map((item, index) => (
                            <span key={index}>
                              {item.day}: {item.hours}
                              {index < businessHours.length - 1 && <br />}
                            </span>
                          ))}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-primary text-primary-foreground">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">{urgentTitle}</h3>
                  <p className="text-sm text-primary-foreground/80 mb-4">
                    {urgentText}
                  </p>
                  <Button 
                    variant="secondary" 
                    className="w-full bg-white text-primary hover:bg-white/90"
                    asChild
                  >
                    <a href={`tel:${contactPhone.replace(/\s+/g, "")}`}>Call {contactPhone}</a>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
