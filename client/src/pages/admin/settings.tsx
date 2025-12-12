import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
// Settings response type from the API (uses snake_case from DB)
// Form uses camelCase so we define both
interface SiteSettings {
  site_name?: string;
  site_tagline?: string;
  contact_email?: string;
  contact_phone?: string;
  whatsapp_number?: string;
  company_address?: string;
  minimum_order_value?: string;
  active_theme?: string;
  maintenance_mode?: string;
  registration_enabled?: string;
  social_facebook?: string;
  social_instagram?: string;
  social_twitter?: string;
  social_linkedin?: string;
  social_youtube?: string;
  social_tiktok?: string;
  // camelCase aliases for form compatibility
  siteName?: string;
  siteTagline?: string;
  contactEmail?: string;
  contactPhone?: string;
  whatsappNumber?: string;
  companyAddress?: string;
  minimumOrderValue?: string;
  activeTheme?: string;
  maintenanceMode?: boolean;
  registrationEnabled?: boolean;
  socialFacebook?: string;
  socialInstagram?: string;
  socialTwitter?: string;
  socialLinkedin?: string;
  socialYoutube?: string;
  socialTiktok?: string;
}
import { 
  Settings,
  Globe,
  Mail,
  Shield,
  Palette,
  Save,
  Loader2,
  Database,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [showSeedDialog, setShowSeedDialog] = useState(false);

  const { data: settings, isLoading } = useQuery<SiteSettings>({
    queryKey: ["/api/admin/settings"],
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/seed-database", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Seed failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({ 
        title: "Database seeded successfully", 
        description: "All demo data has been added to the database." 
      });
      setShowSeedDialog(false);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to seed database", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const form = useForm({
    defaultValues: {
      siteName: "",
      siteTagline: "",
      contactEmail: "",
      contactPhone: "",
      whatsappNumber: "",
      companyAddress: "",
      minimumOrderValue: "",
      activeTheme: "professional",
      maintenanceMode: false,
      registrationEnabled: true,
      socialFacebook: "",
      socialInstagram: "",
      socialTwitter: "",
      socialLinkedin: "",
      socialYoutube: "",
      socialTiktok: "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<SiteSettings>) => {
      return apiRequest("PATCH", "/api/admin/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Settings updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update settings", variant: "destructive" });
    },
  });

  const onSubmit = (data: any) => {
    updateMutation.mutate(data);
  };

  useEffect(() => {
    if (settings) {
      form.reset({
        siteName: settings.site_name || "",
        siteTagline: settings.site_tagline || "",
        contactEmail: settings.contact_email || "",
        contactPhone: settings.contact_phone || "",
        whatsappNumber: settings.whatsapp_number || "",
        companyAddress: settings.company_address || "",
        minimumOrderValue: settings.minimum_order_value || "",
        activeTheme: settings.active_theme || "professional",
        maintenanceMode: settings.maintenance_mode === "true",
        registrationEnabled: settings.registration_enabled !== "false",
        socialFacebook: settings.social_facebook || "",
        socialInstagram: settings.social_instagram || "",
        socialTwitter: settings.social_twitter || "",
        socialLinkedin: settings.social_linkedin || "",
        socialYoutube: settings.social_youtube || "",
        socialTiktok: settings.social_tiktok || "",
      }, { keepDirty: false });
    }
  }, [settings, form]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
          Site Settings
        </h1>
        <p className="mt-2 text-muted-foreground">
          Configure your platform settings and preferences
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-2">
            <Mail className="h-4 w-4" />
            Contact
          </TabsTrigger>
          <TabsTrigger value="theme" className="gap-2">
            <Palette className="h-4 w-4" />
            Theme
          </TabsTrigger>
          <TabsTrigger value="access" className="gap-2">
            <Shield className="h-4 w-4" />
            Access
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2" data-testid="tab-data">
            <Database className="h-4 w-4" />
            Data
          </TabsTrigger>
        </TabsList>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    General Settings
                  </CardTitle>
                  <CardDescription>
                    Basic site information and branding
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="siteName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Site Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Pharma Oasis" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="siteTagline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tagline</FormLabel>
                        <FormControl>
                          <Input placeholder="Your Trusted Healthcare Partner" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="minimumOrderValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Order Value (GBP)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="100.00" {...field} />
                        </FormControl>
                        <FormDescription>
                          Minimum quote request value (leave empty for no minimum)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Contact Information
                  </CardTitle>
                  <CardDescription>
                    Contact details displayed on the site
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="info@pharmaoasis.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+44 20 1234 5678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="whatsappNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>WhatsApp Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+447481640640" {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter the full number with country code (e.g., +447481640640). A floating WhatsApp chat button will appear on all public pages.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="companyAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Address</FormLabel>
                        <FormControl>
                          <Textarea placeholder="123 Healthcare Street, London, UK" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Social Media Links
                  </CardTitle>
                  <CardDescription>
                    Add your social media profile URLs. Icons will appear in the footer.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="socialFacebook"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Facebook</FormLabel>
                          <FormControl>
                            <Input placeholder="https://facebook.com/yourpage" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="socialInstagram"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instagram</FormLabel>
                          <FormControl>
                            <Input placeholder="https://instagram.com/yourprofile" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="socialTwitter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>X (Twitter)</FormLabel>
                          <FormControl>
                            <Input placeholder="https://x.com/yourhandle" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="socialLinkedin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>LinkedIn</FormLabel>
                          <FormControl>
                            <Input placeholder="https://linkedin.com/company/yourcompany" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="socialYoutube"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>YouTube</FormLabel>
                          <FormControl>
                            <Input placeholder="https://youtube.com/@yourchannel" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="socialTiktok"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>TikTok</FormLabel>
                          <FormControl>
                            <Input placeholder="https://tiktok.com/@yourprofile" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="theme" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Theme Settings
                  </CardTitle>
                  <CardDescription>
                    Choose from three switchable design themes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="activeTheme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Active Theme</FormLabel>
                        <div className="grid gap-4 sm:grid-cols-3 mt-2">
                          {[
                            { value: "professional", label: "Professional", description: "Clean, corporate blue theme" },
                            { value: "modern", label: "Modern", description: "Bold, vibrant colors" },
                            { value: "classic", label: "Classic", description: "Traditional, trusted feel" },
                          ].map((theme) => (
                            <Card 
                              key={theme.value}
                              className={`cursor-pointer transition-all ${
                                field.value === theme.value 
                                  ? "ring-2 ring-primary" 
                                  : "hover-elevate"
                              }`}
                              onClick={() => field.onChange(theme.value)}
                            >
                              <CardContent className="p-4">
                                <div className="font-medium">{theme.label}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {theme.description}
                                </p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="access" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Access Control
                  </CardTitle>
                  <CardDescription>
                    Control site access and registration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="registrationEnabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Allow Registration</FormLabel>
                          <FormDescription>
                            Enable new customer registration on the site
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maintenanceMode"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4 border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Maintenance Mode</FormLabel>
                          <FormDescription>
                            Temporarily disable the site for maintenance
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="data" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Data Management
                  </CardTitle>
                  <CardDescription>
                    Manage database and demo data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-lg border p-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <RefreshCw className="h-5 w-5 mt-0.5 text-blue-600" />
                      <div className="space-y-1">
                        <h4 className="font-medium">Load Demo Data</h4>
                        <p className="text-sm text-muted-foreground">
                          Populate the database with sample products, brands, categories, hero slides, homepage content, and other demo data. This is useful for setting up a new environment or restoring demo data after deployment.
                        </p>
                      </div>
                    </div>
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => setShowSeedDialog(true)}
                      disabled={seedMutation.isPending}
                      data-testid="button-seed-database"
                    >
                      {seedMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Database className="mr-2 h-4 w-4" />
                      Load Demo Data
                    </Button>
                  </div>

                  <div className="rounded-lg border border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-950/20 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 mt-0.5 text-orange-600" />
                      <div className="space-y-1">
                        <h4 className="font-medium text-orange-800 dark:text-orange-200">Important Notice</h4>
                        <p className="text-sm text-orange-700 dark:text-orange-300">
                          Loading demo data will reset products, brands, categories, and homepage content to their default demo values. Existing demo data will be replaced. User accounts and quotes will be preserved.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </form>
        </Form>
      </Tabs>

      <AlertDialog open={showSeedDialog} onOpenChange={setShowSeedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Load Demo Data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will populate the database with demo products, brands, categories, hero slides, and homepage content. Existing demo data will be replaced. User accounts and quotes will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
            >
              {seedMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Load Demo Data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
