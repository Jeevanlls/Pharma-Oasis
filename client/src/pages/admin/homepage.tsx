import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import type { HomeStat, HomeFeature, HomeCategory, HomeProcessStep, HomeSection, InsertHomeStat, InsertHomeFeature, InsertHomeCategory, InsertHomeProcessStep, InsertHomeSection } from "@shared/schema";
import { 
  Plus, 
  Pencil,
  Trash2,
  Loader2,
  BarChart3,
  Star,
  FolderTree,
  ListOrdered,
  LayoutTemplate,
  ArrowUp,
  ArrowDown,
  EyeOff,
} from "lucide-react";

const iconOptions = [
  "Package", "Shield", "Truck", "Award", "Users", "ArrowRight", "CheckCircle2", 
  "Zap", "Clock", "Building2", "Globe", "Handshake", "Ship", "FileCheck", 
  "Boxes", "BadgeCheck", "Pill", "Stethoscope", "Heart", "Sparkles", "Activity", "Cross"
];

function StatsTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStat, setEditingStat] = useState<HomeStat | null>(null);
  const { toast } = useToast();

  const { data: stats, isLoading } = useQuery<HomeStat[]>({
    queryKey: ["/api/admin/home-stats"],
  });

  const form = useForm<InsertHomeStat>({
    defaultValues: {
      value: "",
      label: "",
      type: "stat",
      isActive: true,
      position: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertHomeStat) => {
      const response = await fetch("/api/admin/home-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to create");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/home-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home/stats"] });
      toast({ title: "Stat created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create stat", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertHomeStat> }) => {
      const response = await fetch(`/api/admin/home-stats/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/home-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home/stats"] });
      toast({ title: "Stat updated successfully" });
      setIsDialogOpen(false);
      setEditingStat(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to update stat", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/home-stats/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/home-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home/stats"] });
      toast({ title: "Stat deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete stat", variant: "destructive" });
    },
  });

  const handleEdit = (stat: HomeStat) => {
    setEditingStat(stat);
    form.reset({
      value: stat.value,
      label: stat.label,
      type: stat.type || "stat",
      isActive: stat.isActive ?? true,
      position: stat.position ?? 0,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingStat(null);
    form.reset({
      value: "",
      label: "",
      type: "stat",
      isActive: true,
      position: stats?.length || 0,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: InsertHomeStat) => {
    if (editingStat) {
      updateMutation.mutate({ id: editingStat.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">Manage stats shown in the stats bar section ({stats?.length || 0} items)</p>
        <Button onClick={handleCreate} className="gap-2" data-testid="button-add-stat">
          <Plus className="h-4 w-4" />
          Add Stat
        </Button>
      </div>

      {stats && stats.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.id} data-testid={`card-stat-${stat.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {stat.type === "badge" ? (
                      <Badge variant="outline" className="text-lg font-bold mb-2">
                        {stat.value}
                      </Badge>
                    ) : (
                      <p className="text-2xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
                        {stat.value}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={stat.isActive ? "secondary" : "outline"} className="text-xs">
                        {stat.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {stat.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(stat)} data-testid={`button-edit-stat-${stat.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => deleteMutation.mutate(stat.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-stat-${stat.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
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
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No stats yet. Add your first stat.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStat ? "Edit Stat" : "Add Stat"}</DialogTitle>
            <DialogDescription>
              {editingStat ? "Update the stat details" : "Add a new stat to the stats bar"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value</FormLabel>
                    <FormControl>
                      <Input placeholder="50+" {...field} data-testid="input-stat-value" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Label</FormLabel>
                    <FormControl>
                      <Input placeholder="Premium Brands" {...field} data-testid="input-stat-label" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || "stat"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-stat-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="stat">Stat (number)</SelectItem>
                        <SelectItem value="badge">Badge</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>Stats show large numbers, badges show highlighted text</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} data-testid="input-stat-position" />
                    </FormControl>
                    <FormDescription>Lower numbers appear first</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel>Active</FormLabel>
                      <FormDescription>Show this stat on the homepage</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value ?? true} onCheckedChange={field.onChange} data-testid="switch-stat-active" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-stat">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingStat ? "Save Changes" : "Add Stat"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FeaturesTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<HomeFeature | null>(null);
  const { toast } = useToast();

  const { data: features, isLoading } = useQuery<HomeFeature[]>({
    queryKey: ["/api/admin/home-features"],
  });

  const form = useForm<InsertHomeFeature>({
    defaultValues: {
      title: "",
      description: "",
      iconName: "Shield",
      isActive: true,
      position: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertHomeFeature) => {
      const response = await fetch("/api/admin/home-features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to create");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/home-features"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home/features"] });
      toast({ title: "Feature created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create feature", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertHomeFeature> }) => {
      const response = await fetch(`/api/admin/home-features/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/home-features"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home/features"] });
      toast({ title: "Feature updated successfully" });
      setIsDialogOpen(false);
      setEditingFeature(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to update feature", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/home-features/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/home-features"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home/features"] });
      toast({ title: "Feature deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete feature", variant: "destructive" });
    },
  });

  const handleEdit = (feature: HomeFeature) => {
    setEditingFeature(feature);
    form.reset({
      title: feature.title,
      description: feature.description || "",
      iconName: feature.iconName || "Shield",
      isActive: feature.isActive ?? true,
      position: feature.position ?? 0,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingFeature(null);
    form.reset({
      title: "",
      description: "",
      iconName: "Shield",
      isActive: true,
      position: features?.length || 0,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: InsertHomeFeature) => {
    if (editingFeature) {
      updateMutation.mutate({ id: editingFeature.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">Manage feature cards in the "Why Choose Us" section ({features?.length || 0} items)</p>
        <Button onClick={handleCreate} className="gap-2" data-testid="button-add-feature">
          <Plus className="h-4 w-4" />
          Add Feature
        </Button>
      </div>

      {features && features.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <Card key={feature.id} data-testid={`card-feature-${feature.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {feature.iconName}
                      </Badge>
                      <Badge variant={feature.isActive ? "secondary" : "outline"} className="text-xs">
                        {feature.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(feature)} data-testid={`button-edit-feature-${feature.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => deleteMutation.mutate(feature.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-feature-${feature.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
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
            <Star className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No features yet. Add your first feature.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFeature ? "Edit Feature" : "Add Feature"}</DialogTitle>
            <DialogDescription>
              {editingFeature ? "Update the feature details" : "Add a new feature to the Why Choose Us section"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="MHRA Licensed" {...field} data-testid="input-feature-title" />
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
                      <Textarea placeholder="Description of the feature..." {...field} data-testid="input-feature-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="iconName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || "Shield"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-feature-icon">
                          <SelectValue placeholder="Select icon" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {iconOptions.map((icon) => (
                          <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} data-testid="input-feature-position" />
                    </FormControl>
                    <FormDescription>Lower numbers appear first</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel>Active</FormLabel>
                      <FormDescription>Show this feature on the homepage</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value ?? true} onCheckedChange={field.onChange} data-testid="switch-feature-active" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-feature">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingFeature ? "Save Changes" : "Add Feature"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoriesTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<HomeCategory | null>(null);
  const { toast } = useToast();

  const { data: categories, isLoading } = useQuery<HomeCategory[]>({
    queryKey: ["/api/admin/home-categories"],
  });

  const form = useForm<InsertHomeCategory>({
    defaultValues: {
      name: "",
      productCount: "",
      iconName: "Package",
      linkHref: "/products",
      isActive: true,
      position: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertHomeCategory) => {
      const response = await fetch("/api/admin/home-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to create");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/home-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home/categories"] });
      toast({ title: "Category created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create category", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertHomeCategory> }) => {
      const response = await fetch(`/api/admin/home-categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/home-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home/categories"] });
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
      const response = await fetch(`/api/admin/home-categories/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/home-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home/categories"] });
      toast({ title: "Category deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete category", variant: "destructive" });
    },
  });

  const handleEdit = (category: HomeCategory) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      productCount: category.productCount || "",
      iconName: category.iconName || "Package",
      linkHref: category.linkHref || "/products",
      isActive: category.isActive ?? true,
      position: category.position ?? 0,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingCategory(null);
    form.reset({
      name: "",
      productCount: "",
      iconName: "Package",
      linkHref: "/products",
      isActive: true,
      position: categories?.length || 0,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: InsertHomeCategory) => {
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">Manage category cards in the "Product Categories" section ({categories?.length || 0} items)</p>
        <Button onClick={handleCreate} className="gap-2" data-testid="button-add-category">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {categories && categories.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id} data-testid={`card-category-${category.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">{category.productCount}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {category.iconName}
                      </Badge>
                      <Badge variant={category.isActive ? "secondary" : "outline"} className="text-xs">
                        {category.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(category)} data-testid={`button-edit-category-${category.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => deleteMutation.mutate(category.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-category-${category.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
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
            <FolderTree className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No categories yet. Add your first category.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "Update the category details" : "Add a new category to the Product Categories section"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Pharmaceuticals" {...field} data-testid="input-category-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="productCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Count</FormLabel>
                    <FormControl>
                      <Input placeholder="5,000+ products" {...field} data-testid="input-category-count" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="iconName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || "Package"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category-icon">
                          <SelectValue placeholder="Select icon" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {iconOptions.map((icon) => (
                          <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="linkHref"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link URL</FormLabel>
                    <FormControl>
                      <Input placeholder="/products" {...field} value={field.value || ""} data-testid="input-category-link" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} data-testid="input-category-position" />
                    </FormControl>
                    <FormDescription>Lower numbers appear first</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel>Active</FormLabel>
                      <FormDescription>Show this category on the homepage</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value ?? true} onCheckedChange={field.onChange} data-testid="switch-category-active" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-category">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingCategory ? "Save Changes" : "Add Category"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProcessStepsTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<HomeProcessStep | null>(null);
  const { toast } = useToast();

  const { data: steps, isLoading } = useQuery<HomeProcessStep[]>({
    queryKey: ["/api/admin/home-process-steps"],
  });

  const form = useForm<InsertHomeProcessStep>({
    defaultValues: {
      stepNumber: 1,
      title: "",
      description: "",
      isActive: true,
      position: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertHomeProcessStep) => {
      const response = await fetch("/api/admin/home-process-steps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to create");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/home-process-steps"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home/process-steps"] });
      toast({ title: "Process step created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create process step", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertHomeProcessStep> }) => {
      const response = await fetch(`/api/admin/home-process-steps/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/home-process-steps"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home/process-steps"] });
      toast({ title: "Process step updated successfully" });
      setIsDialogOpen(false);
      setEditingStep(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to update process step", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/home-process-steps/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/home-process-steps"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home/process-steps"] });
      toast({ title: "Process step deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete process step", variant: "destructive" });
    },
  });

  const handleEdit = (step: HomeProcessStep) => {
    setEditingStep(step);
    form.reset({
      stepNumber: step.stepNumber,
      title: step.title,
      description: step.description || "",
      isActive: step.isActive ?? true,
      position: step.position ?? 0,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingStep(null);
    form.reset({
      stepNumber: (steps?.length || 0) + 1,
      title: "",
      description: "",
      isActive: true,
      position: steps?.length || 0,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: InsertHomeProcessStep) => {
    if (editingStep) {
      updateMutation.mutate({ id: editingStep.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">Manage process steps in the "How It Works" section ({steps?.length || 0} items)</p>
        <Button onClick={handleCreate} className="gap-2" data-testid="button-add-step">
          <Plus className="h-4 w-4" />
          Add Step
        </Button>
      </div>

      {steps && steps.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {steps.map((step) => (
            <Card key={step.id} data-testid={`card-step-${step.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                      {step.stepNumber}
                    </div>
                    <div>
                      <h3 className="font-semibold">{step.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                      <Badge variant={step.isActive ? "secondary" : "outline"} className="text-xs mt-2">
                        {step.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="icon" variant="ghost" onClick={() => handleEdit(step)} data-testid={`button-edit-step-${step.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => deleteMutation.mutate(step.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-step-${step.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
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
            <ListOrdered className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No process steps yet. Add your first step.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStep ? "Edit Process Step" : "Add Process Step"}</DialogTitle>
            <DialogDescription>
              {editingStep ? "Update the process step details" : "Add a new step to the How It Works section"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="stepNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Step Number</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 1)} data-testid="input-step-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Register & Get Approved" {...field} data-testid="input-step-title" />
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
                      <Textarea placeholder="Description of the step..." {...field} data-testid="input-step-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(parseInt(e.target.value) || 0)} data-testid="input-step-position" />
                    </FormControl>
                    <FormDescription>Lower numbers appear first</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel>Active</FormLabel>
                      <FormDescription>Show this step on the homepage</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value ?? true} onCheckedChange={field.onChange} data-testid="switch-step-active" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-step">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingStep ? "Save Changes" : "Add Step"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionsTab() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<HomeSection | null>(null);
  const { toast } = useToast();

  const { data: sections, isLoading } = useQuery<HomeSection[]>({
    queryKey: ["/api/admin/home-sections"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertHomeSection> }) => {
      const response = await fetch(`/api/admin/home-sections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/home-sections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home/sections"] });
      toast({ title: "Section updated successfully" });
      setIsDialogOpen(false);
      setEditingSection(null);
    },
    onError: () => {
      toast({ title: "Failed to update section", variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, newPosition }: { id: number; newPosition: number }) => {
      const response = await fetch(`/api/admin/home-sections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: newPosition }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to reorder");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/home-sections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home/sections"] });
      toast({ title: "Section order updated" });
    },
    onError: () => {
      toast({ title: "Failed to reorder section", variant: "destructive" });
    },
  });

  const handleMoveUp = (section: HomeSection, index: number) => {
    if (!sections || index === 0) return;
    const currentPos = section.position ?? index;
    const prevSection = sections[index - 1];
    const prevPos = prevSection.position ?? (index - 1);
    
    reorderMutation.mutate({ id: section.id, newPosition: prevPos });
    setTimeout(() => {
      reorderMutation.mutate({ id: prevSection.id, newPosition: currentPos });
    }, 100);
  };

  const handleMoveDown = (section: HomeSection, index: number) => {
    if (!sections || index === sections.length - 1) return;
    const currentPos = section.position ?? index;
    const nextSection = sections[index + 1];
    const nextPos = nextSection.position ?? (index + 1);
    
    reorderMutation.mutate({ id: section.id, newPosition: nextPos });
    setTimeout(() => {
      reorderMutation.mutate({ id: nextSection.id, newPosition: currentPos });
    }, 100);
  };

  const handleEdit = (section: HomeSection) => {
    setEditingSection(section);
    setIsDialogOpen(true);
  };

  const form = useForm<Partial<InsertHomeSection>>({
    defaultValues: {},
  });

  const onSubmit = (data: Partial<InsertHomeSection>) => {
    if (editingSection) {
      updateMutation.mutate({ id: editingSection.id, data });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-muted-foreground">Manage large content sections (Partner With Us, Export Services) - reorder using arrows</p>
      </div>

      {sections && sections.length > 0 ? (
        <div className="space-y-4">
          {sections.map((section, index) => (
            <Card key={section.id} data-testid={`card-section-${section.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleMoveUp(section, index)}
                      disabled={index === 0 || reorderMutation.isPending}
                      data-testid={`button-move-up-${section.id}`}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleMoveDown(section, index)}
                      disabled={index === sections.length - 1 || reorderMutation.isPending}
                      data-testid={`button-move-down-${section.id}`}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{section.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {section.sectionKey}
                      </Badge>
                      <Badge variant={section.isActive ? "secondary" : "outline"} className="text-xs">
                        {section.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm mb-2">{section.subtitle}</p>
                    <p className="text-xs text-muted-foreground">
                      Badge: {section.badgeText} | Card: {section.cardTitle} | Position: {section.position}
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(section)} data-testid={`button-edit-section-${section.id}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <LayoutTemplate className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No sections found.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Section: {editingSection?.sectionKey}</DialogTitle>
            <DialogDescription>
              Update the section content and appearance
            </DialogDescription>
          </DialogHeader>
          {editingSection && (
            <form onSubmit={(e) => { e.preventDefault(); onSubmit(form.getValues()); }} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input 
                    defaultValue={editingSection.title} 
                    onChange={(e) => form.setValue("title", e.target.value)}
                    data-testid="input-section-title"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Badge Text</label>
                  <Input 
                    defaultValue={editingSection.badgeText || ""} 
                    onChange={(e) => form.setValue("badgeText", e.target.value)}
                    data-testid="input-section-badge"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Subtitle</label>
                <Textarea 
                  defaultValue={editingSection.subtitle || ""} 
                  onChange={(e) => form.setValue("subtitle", e.target.value)}
                  data-testid="input-section-subtitle"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea 
                  defaultValue={editingSection.description || ""} 
                  onChange={(e) => form.setValue("description", e.target.value)}
                  data-testid="input-section-description"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Primary CTA Label</label>
                  <Input 
                    defaultValue={editingSection.primaryCtaLabel || ""} 
                    onChange={(e) => form.setValue("primaryCtaLabel", e.target.value)}
                    data-testid="input-section-primary-cta-label"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Primary CTA Link</label>
                  <Input 
                    defaultValue={editingSection.primaryCtaHref || ""} 
                    onChange={(e) => form.setValue("primaryCtaHref", e.target.value)}
                    data-testid="input-section-primary-cta-href"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Secondary CTA Label</label>
                  <Input 
                    defaultValue={editingSection.secondaryCtaLabel || ""} 
                    onChange={(e) => form.setValue("secondaryCtaLabel", e.target.value)}
                    data-testid="input-section-secondary-cta-label"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Secondary CTA Link</label>
                  <Input 
                    defaultValue={editingSection.secondaryCtaHref || ""} 
                    onChange={(e) => form.setValue("secondaryCtaHref", e.target.value)}
                    data-testid="input-section-secondary-cta-href"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Card Title</label>
                  <Input 
                    defaultValue={editingSection.cardTitle || ""} 
                    onChange={(e) => form.setValue("cardTitle", e.target.value)}
                    data-testid="input-section-card-title"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Card Subtitle</label>
                  <Input 
                    defaultValue={editingSection.cardSubtitle || ""} 
                    onChange={(e) => form.setValue("cardSubtitle", e.target.value)}
                    data-testid="input-section-card-subtitle"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Bullet Points (JSON array)</label>
                <Textarea 
                  defaultValue={editingSection.bulletPoints || "[]"} 
                  onChange={(e) => form.setValue("bulletPoints", e.target.value)}
                  rows={3}
                  data-testid="input-section-bullets"
                />
                <p className="text-xs text-muted-foreground mt-1">Format: ["Point 1", "Point 2", "Point 3"]</p>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <label className="text-sm font-medium">Active</label>
                  <p className="text-xs text-muted-foreground">Show this section on the homepage</p>
                </div>
                <Switch 
                  defaultChecked={editingSection.isActive ?? true}
                  onCheckedChange={(checked) => form.setValue("isActive", checked)}
                  data-testid="switch-section-active"
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-section">
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminHomepagePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
          Homepage Content
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage all dynamic content displayed on the public homepage
        </p>
      </div>

      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="stats" className="gap-2" data-testid="tab-stats">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Stats</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2" data-testid="tab-features">
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">Features</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2" data-testid="tab-categories">
            <FolderTree className="h-4 w-4" />
            <span className="hidden sm:inline">Categories</span>
          </TabsTrigger>
          <TabsTrigger value="process" className="gap-2" data-testid="tab-process">
            <ListOrdered className="h-4 w-4" />
            <span className="hidden sm:inline">Process</span>
          </TabsTrigger>
          <TabsTrigger value="sections" className="gap-2" data-testid="tab-sections">
            <LayoutTemplate className="h-4 w-4" />
            <span className="hidden sm:inline">Sections</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stats">
          <StatsTab />
        </TabsContent>
        <TabsContent value="features">
          <FeaturesTab />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>
        <TabsContent value="process">
          <ProcessStepsTab />
        </TabsContent>
        <TabsContent value="sections">
          <SectionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
