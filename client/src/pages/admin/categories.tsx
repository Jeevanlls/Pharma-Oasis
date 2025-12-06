import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import type { Category, InsertCategory } from "@shared/schema";
import { 
  Search, 
  Tag, 
  Plus, 
  Pencil,
  Trash2,
  Loader2,
  EyeOff,
  ChevronRight,
  Folder,
  FolderOpen,
} from "lucide-react";

export default function AdminCategoriesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { toast } = useToast();

  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const form = useForm<InsertCategory>({
    defaultValues: {
      name: "",
      description: "",
      parentId: null,
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertCategory) => {
      return apiRequest("POST", "/api/admin/categories", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Category created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create category", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertCategory> }) => {
      return apiRequest("PATCH", `/api/admin/categories/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Category updated successfully" });
      setIsDialogOpen(false);
      setEditingCategory(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to update category", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Category deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete category", variant: "destructive" });
    },
  });

  const topLevelCategories = categories?.filter(c => !c.parentId) || [];
  const getSubcategories = (parentId: number) => 
    categories?.filter(c => c.parentId === parentId) || [];

  const filteredCategories = topLevelCategories.filter(category =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      description: category.description || "",
      parentId: category.parentId,
      isActive: category.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = (parentId?: number) => {
    setEditingCategory(null);
    form.reset({
      name: "",
      description: "",
      parentId: parentId || null,
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: InsertCategory) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
            Category Management
          </h1>
          <p className="mt-2 text-muted-foreground">
            Organize your product categories ({categories?.length || 0} total)
          </p>
        </div>
        <Button onClick={() => handleCreate()} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredCategories.length > 0 ? (
        <div className="space-y-4">
          {filteredCategories.map((category) => {
            const subcategories = getSubcategories(category.id);
            return (
              <Card key={category.id} data-testid={`card-category-${category.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {subcategories.length > 0 ? (
                        <FolderOpen className="h-5 w-5" />
                      ) : (
                        <Folder className="h-5 w-5" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{category.name}</h3>
                        {!category.isActive && (
                          <Badge variant="secondary" className="gap-1">
                            <EyeOff className="h-3 w-3" /> Inactive
                          </Badge>
                        )}
                        {subcategories.length > 0 && (
                          <Badge variant="outline">{subcategories.length} subcategories</Badge>
                        )}
                      </div>
                      {category.description && (
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCreate(category.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Sub
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (subcategories.length > 0) {
                            toast({ 
                              title: "Cannot delete", 
                              description: "Remove subcategories first",
                              variant: "destructive"
                            });
                            return;
                          }
                          if (confirm("Are you sure you want to delete this category?")) {
                            deleteMutation.mutate(category.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {subcategories.length > 0 && (
                    <div className="mt-4 ml-14 space-y-2 border-l-2 pl-4">
                      {subcategories.map((sub) => (
                        <div key={sub.id} className="flex items-center gap-3 py-2">
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          <span className="flex-1">{sub.name}</span>
                          {!sub.isActive && (
                            <Badge variant="secondary" className="gap-1">
                              <EyeOff className="h-3 w-3" /> Inactive
                            </Badge>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(sub)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm("Delete this subcategory?")) {
                                deleteMutation.mutate(sub.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <Tag className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No categories found</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "DM Sans, sans-serif" }}>
              {editingCategory ? "Edit Category" : "Add Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory ? "Update category details" : "Create a new category"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Category name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Category description..." {...field} value={field.value || ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Category</FormLabel>
                    <Select 
                      onValueChange={(v) => field.onChange(v === "none" ? null : Number(v))} 
                      value={field.value ? String(field.value) : "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Parent (Top-level)</SelectItem>
                        {topLevelCategories
                          .filter(c => c.id !== editingCategory?.id)
                          .map((cat) => (
                            <SelectItem key={cat.id} value={String(cat.id)}>
                              {cat.name}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">Active</FormLabel>
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
                  {editingCategory ? "Save Changes" : "Create Category"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
