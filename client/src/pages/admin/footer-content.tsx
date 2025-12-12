import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import type { FooterSection } from "@shared/schema";
import { 
  Plus, 
  Pencil,
  Trash2,
  Loader2,
  FileText,
  Shield,
  Cookie,
  Globe,
  Building,
  Scale,
  Eye,
  EyeOff,
} from "lucide-react";

const sectionKeyConfig: Record<string, { label: string; icon: typeof FileText; description: string }> = {
  privacy_policy: { 
    label: "Privacy Policy", 
    icon: Shield, 
    description: "Your data protection and privacy practices" 
  },
  terms: { 
    label: "Terms of Service", 
    icon: Scale, 
    description: "Terms and conditions for using your platform" 
  },
  cookie_policy: { 
    label: "Cookie Policy", 
    icon: Cookie, 
    description: "How you use cookies and tracking" 
  },
  global_presence: { 
    label: "Global Presence", 
    icon: Globe, 
    description: "Your international locations and reach" 
  },
  head_office: { 
    label: "Head Office", 
    icon: Building, 
    description: "Main office contact information" 
  },
};

interface FooterSectionFormData {
  sectionKey: string;
  title: string;
  content: string;
  metaDescription: string;
  isActive: boolean;
}

export default function AdminFooterContentPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<FooterSection | null>(null);
  const [previewSection, setPreviewSection] = useState<FooterSection | null>(null);
  const { toast } = useToast();

  const { data: sections, isLoading } = useQuery<FooterSection[]>({
    queryKey: ["/api/admin/footer-sections"],
  });

  const form = useForm<FooterSectionFormData>({
    defaultValues: {
      sectionKey: "privacy_policy",
      title: "",
      content: "",
      metaDescription: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FooterSectionFormData) => {
      return apiRequest("POST", "/api/admin/footer-sections", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/footer-sections"] });
      toast({ title: "Footer section created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create footer section", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<FooterSectionFormData> }) => {
      return apiRequest("PATCH", `/api/admin/footer-sections/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/footer-sections"] });
      toast({ title: "Footer section updated successfully" });
      setIsDialogOpen(false);
      setEditingSection(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to update footer section", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/footer-sections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/footer-sections"] });
      toast({ title: "Footer section deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete footer section", variant: "destructive" });
    },
  });

  const handleEdit = (section: FooterSection) => {
    setEditingSection(section);
    form.reset({
      sectionKey: section.sectionKey,
      title: section.title,
      content: section.content,
      metaDescription: section.metaDescription || "",
      isActive: section.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = (sectionKey: string) => {
    const config = sectionKeyConfig[sectionKey];
    setEditingSection(null);
    form.reset({
      sectionKey,
      title: config?.label || sectionKey,
      content: "",
      metaDescription: "",
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (data: FooterSectionFormData) => {
    if (editingSection) {
      updateMutation.mutate({ id: editingSection.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const existingSectionKeys = sections?.map(s => s.sectionKey) || [];
  const availableSectionKeys = Object.keys(sectionKeyConfig).filter(
    key => !existingSectionKeys.includes(key)
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Footer Content</h1>
          <p className="text-muted-foreground">
            Manage footer pages like Privacy Policy, Terms of Service, and more
          </p>
        </div>
        {availableSectionKeys.length > 0 && (
          <Dialog>
            <Button data-testid="button-add-section">
              <Plus className="h-4 w-4 mr-2" />
              Add Section
            </Button>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(sectionKeyConfig).map(([key, config]) => {
          const section = sections?.find(s => s.sectionKey === key);
          const IconComponent = config.icon;

          return (
            <Card key={key} className={!section ? "border-dashed opacity-60" : ""}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <IconComponent className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">{config.label}</CardTitle>
                </div>
                {section && (
                  <Badge variant={section.isActive ? "default" : "secondary"}>
                    {section.isActive ? "Active" : "Draft"}
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                <CardDescription className="mb-4">{config.description}</CardDescription>
                {section ? (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setPreviewSection(section)}
                      data-testid={`button-preview-${key}`}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(section)}
                      data-testid={`button-edit-${key}`}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => deleteMutation.mutate(section.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${key}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCreate(key)}
                    data-testid={`button-create-${key}`}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSection ? "Edit Footer Section" : "Create Footer Section"}
            </DialogTitle>
            <DialogDescription>
              {editingSection 
                ? "Update the content for this footer section" 
                : "Create content for a new footer page"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Page Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Privacy Policy" 
                        {...field} 
                        data-testid="input-section-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="metaDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Description (SEO)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Brief description for search engines..." 
                        {...field}
                        data-testid="input-meta-description"
                      />
                    </FormControl>
                    <FormDescription>
                      Optional: Displayed in search engine results
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content (Markdown supported)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter your content here. You can use Markdown formatting..."
                        className="min-h-[300px] font-mono text-sm"
                        {...field}
                        data-testid="textarea-section-content"
                      />
                    </FormControl>
                    <FormDescription>
                      Use Markdown: **bold**, *italic*, # headings, - lists
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Publish</FormLabel>
                      <FormDescription>
                        Make this page visible to visitors
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-is-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingSection(null);
                    form.reset();
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingSection ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewSection} onOpenChange={() => setPreviewSection(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewSection?.title}</DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {previewSection?.content.split('\n').map((line, i) => {
              if (line.startsWith('# ')) {
                return <h1 key={i} className="text-2xl font-bold mt-4">{line.slice(2)}</h1>;
              }
              if (line.startsWith('## ')) {
                return <h2 key={i} className="text-xl font-semibold mt-3">{line.slice(3)}</h2>;
              }
              if (line.startsWith('### ')) {
                return <h3 key={i} className="text-lg font-medium mt-2">{line.slice(4)}</h3>;
              }
              if (line.startsWith('- ')) {
                return <li key={i}>{line.slice(2)}</li>;
              }
              if (line.trim() === '') {
                return <br key={i} />;
              }
              return <p key={i}>{line}</p>;
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
