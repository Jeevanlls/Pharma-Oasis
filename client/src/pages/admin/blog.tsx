import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import type { BlogPost, InsertBlogPost } from "@shared/schema";
import { 
  Search, 
  FileText, 
  Plus, 
  Pencil,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { format } from "date-fns";

interface BlogResponse {
  posts: BlogPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AdminBlogPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingPost, setDeletingPost] = useState<BlogPost | null>(null);
  const { toast } = useToast();

  const { data, isLoading } = useQuery<BlogResponse>({
    queryKey: ["/api/admin/blog"],
    queryFn: async () => {
      const res = await fetch("/api/admin/blog?limit=100");
      if (!res.ok) throw new Error("Failed to fetch blog posts");
      return res.json();
    },
  });

  const posts = data?.posts || [];

  const form = useForm<InsertBlogPost>({
    defaultValues: {
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      featuredImage: "",
      metaTitle: "",
      metaDescription: "",
      status: "draft",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertBlogPost) => {
      return apiRequest("POST", "/api/admin/blog", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      toast({ title: "Blog post created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to create blog post", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertBlogPost> }) => {
      return apiRequest("PATCH", `/api/admin/blog/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      toast({ title: "Blog post updated successfully" });
      setIsDialogOpen(false);
      setEditingPost(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to update blog post", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/blog/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      queryClient.invalidateQueries({ queryKey: ["/api/blog"] });
      toast({ title: "Blog post deleted successfully" });
      setIsDeleteDialogOpen(false);
      setDeletingPost(null);
    },
    onError: () => {
      toast({ title: "Failed to delete blog post", variant: "destructive" });
    },
  });

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          post.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || post.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    form.reset({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      content: post.content,
      featuredImage: post.featuredImage || "",
      metaTitle: post.metaTitle || "",
      metaDescription: post.metaDescription || "",
      status: post.status,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingPost(null);
    form.reset({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      featuredImage: "",
      metaTitle: "",
      metaDescription: "",
      status: "draft",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (post: BlogPost) => {
    setDeletingPost(post);
    setIsDeleteDialogOpen(true);
  };

  const onSubmit = (data: InsertBlogPost) => {
    const submitData = {
      ...data,
      slug: data.slug || generateSlug(data.title),
    };
    
    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const watchTitle = form.watch("title");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>Blog Management</h1>
          <p className="text-muted-foreground">Create and manage blog posts</p>
        </div>
        <Button onClick={handleCreate} data-testid="button-create-post">
          <Plus className="mr-2 h-4 w-4" />
          New Post
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-posts"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Posts</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
            <SelectItem value="published">Published</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-16 w-24 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredPosts.length > 0 ? (
        <div className="grid gap-4">
          {filteredPosts.map((post) => (
            <Card key={post.id} data-testid={`card-blog-post-${post.id}`}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  {post.featuredImage ? (
                    <img 
                      src={post.featuredImage} 
                      alt={post.title}
                      className="h-16 w-24 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-16 w-24 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{post.title}</h3>
                      <Badge variant={post.status === "published" ? "default" : "secondary"} className="text-xs">
                        {post.status === "published" ? (
                          <><Eye className="mr-1 h-3 w-3" /> Published</>
                        ) : (
                          <><EyeOff className="mr-1 h-3 w-3" /> Draft</>
                        )}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-1">
                      /{post.slug}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {post.publishedAt 
                        ? `Published ${format(new Date(post.publishedAt), "MMM d, yyyy")}`
                        : `Created ${format(new Date(post.createdAt), "MMM d, yyyy")}`
                      }
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {post.status === "published" && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => window.open(`/blog/${post.slug}`, "_blank")}
                        data-testid={`button-view-post-${post.id}`}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleEdit(post)}
                      data-testid={`button-edit-post-${post.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDelete(post)}
                      data-testid={`button-delete-post-${post.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold">No blog posts yet</h3>
            <p className="text-muted-foreground text-center mt-1">
              Create your first blog post to share industry insights
            </p>
            <Button className="mt-4" onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Post
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? "Edit Post" : "Create New Post"}</DialogTitle>
            <DialogDescription>
              {editingPost ? "Update the blog post details" : "Add a new blog post to your site"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                rules={{ required: "Title is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter post title" 
                        {...field} 
                        data-testid="input-post-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={watchTitle ? generateSlug(watchTitle) : "post-url-slug"} 
                        {...field} 
                        data-testid="input-post-slug"
                      />
                    </FormControl>
                    <FormDescription>
                      Leave empty to auto-generate from title
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="excerpt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Excerpt</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Brief summary of the post (displayed on blog listing)" 
                        rows={2}
                        {...field} 
                        value={field.value || ""}
                        data-testid="input-post-excerpt"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                rules={{ required: "Content is required" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Write your blog post content here. You can use basic markdown formatting." 
                        rows={12}
                        className="font-mono text-sm"
                        {...field} 
                        data-testid="input-post-content"
                      />
                    </FormControl>
                    <FormDescription>
                      Supports basic formatting: ## Headings, - Lists, plain paragraphs
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="featuredImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Featured Image</FormLabel>
                    <FormControl>
                      <ImageUpload 
                        currentImageUrl={field.value || ""} 
                        onImageUploaded={(url) => field.onChange(url)}
                        category="general"
                        label="Featured Image"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="metaTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meta Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="SEO title (optional)" 
                          {...field} 
                          value={field.value || ""}
                          data-testid="input-post-meta-title"
                        />
                      </FormControl>
                      <FormDescription>
                        For search engines. Uses post title if empty.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-post-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="metaDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meta Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="SEO description (optional)" 
                        rows={2}
                        {...field} 
                        value={field.value || ""}
                        data-testid="input-post-meta-description"
                      />
                    </FormControl>
                    <FormDescription>
                      For search engines. Uses excerpt if empty.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-post"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingPost ? "Update Post" : "Create Post"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Blog Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingPost?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deletingPost && deleteMutation.mutate(deletingPost.id)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
