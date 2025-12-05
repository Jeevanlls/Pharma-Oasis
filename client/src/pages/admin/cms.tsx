import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import type { CmsBlock } from "@shared/schema";
import { 
  Search, 
  LayoutDashboard, 
  Plus, 
  Pencil,
  Trash2,
  Loader2,
  FileText,
  Newspaper,
  Code,
  Type,
} from "lucide-react";

const contentTypeConfig: Record<string, { label: string; icon: typeof FileText }> = {
  text: { label: "Text", icon: Type },
  html: { label: "HTML", icon: Code },
  json: { label: "JSON", icon: FileText },
  markdown: { label: "Markdown", icon: Newspaper },
};

const sectionOptions = [
  { value: "home", label: "Home Page" },
  { value: "products", label: "Products Page" },
  { value: "about", label: "About Page" },
  { value: "contact", label: "Contact Page" },
  { value: "global", label: "Global" },
  { value: "header", label: "Header" },
  { value: "footer", label: "Footer" },
];

export default function AdminCmsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<CmsBlock | null>(null);
  const { toast } = useToast();

  const { data: blocks, isLoading } = useQuery<CmsBlock[]>({
    queryKey: ["/api/admin/cms"],
  });

  const form = useForm({
    defaultValues: {
      key: "",
      section: "home",
      content: "",
      contentType: "text",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/admin/cms", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms"] });
      toast({ title: "CMS block created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create CMS block", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return apiRequest(`/api/admin/cms/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms"] });
      toast({ title: "CMS block updated successfully" });
      setIsDialogOpen(false);
      setEditingBlock(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to update CMS block", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/cms/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cms"] });
      toast({ title: "CMS block deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete CMS block", variant: "destructive" });
    },
  });

  const filteredBlocks = blocks?.filter(block =>
    block.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    block.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedBlocks = filteredBlocks?.reduce((acc, block) => {
    const section = block.section || "global";
    if (!acc[section]) acc[section] = [];
    acc[section].push(block);
    return acc;
  }, {} as Record<string, CmsBlock[]>);

  const handleEdit = (block: CmsBlock) => {
    setEditingBlock(block);
    form.reset({
      key: block.key,
      section: block.section,
      content: block.content,
      contentType: block.contentType || "text",
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingBlock(null);
    form.reset({
      key: "",
      section: "home",
      content: "",
      contentType: "text",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: any) => {
    if (editingBlock) {
      updateMutation.mutate({ id: editingBlock.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
            CMS Content
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage website content blocks and text
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Content Block
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by key or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
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
      ) : groupedBlocks && Object.keys(groupedBlocks).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedBlocks)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([section, sectionBlocks]) => (
              <div key={section}>
                <h2 className="text-lg font-semibold mb-4 capitalize">
                  {sectionOptions.find(s => s.value === section)?.label || section}
                </h2>
                <div className="space-y-4">
                  {sectionBlocks.map((block) => {
                    const typeConfig = contentTypeConfig[block.contentType || "text"] || contentTypeConfig.text;
                    const TypeIcon = typeConfig.icon;

                    return (
                      <Card key={block.id} data-testid={`card-cms-${block.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <TypeIcon className="h-5 w-5" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium font-mono text-sm">{block.key}</h3>
                                <Badge variant="outline">{typeConfig.label}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {block.content.substring(0, 150)}
                                {block.content.length > 150 && "..."}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(block)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (confirm("Delete this content block?")) {
                                    deleteMutation.mutate(block.id);
                                  }
                                }}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <LayoutDashboard className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No content blocks found</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "DM Sans, sans-serif" }}>
              {editingBlock ? "Edit Content Block" : "Add Content Block"}
            </DialogTitle>
            <DialogDescription>
              {editingBlock ? "Update content block details" : "Create a new content block"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="home-hero-title" 
                          {...field}
                          disabled={!!editingBlock}
                        />
                      </FormControl>
                      <FormDescription>
                        Unique identifier for this block
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="section"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Section</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select section" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sectionOptions.map((option) => (
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

              <FormField
                control={form.control}
                name="contentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(contentTypeConfig).map(([value, config]) => (
                          <SelectItem key={value} value={value}>
                            {config.label}
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
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter content..."
                        className="min-h-[200px] font-mono text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Text content, HTML, or JSON depending on type
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingBlock ? "Save Changes" : "Create Block"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
