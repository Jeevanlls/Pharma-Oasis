import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import type { HeroSlide, InsertHeroSlide } from "@shared/schema";
import { 
  Plus, 
  Pencil,
  Trash2,
  Loader2,
  Image,
  GripVertical,
  ArrowUp,
  ArrowDown,
  EyeOff,
} from "lucide-react";

export default function AdminHeroSlidesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
  const { toast } = useToast();

  const { data: slides, isLoading } = useQuery<HeroSlide[]>({
    queryKey: ["/api/admin/hero-slides"],
  });

  const form = useForm<InsertHeroSlide>({
    defaultValues: {
      title: "",
      subtitle: "",
      imageUrl: "",
      ctaHref: "",
      ctaLabel: "",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertHeroSlide) => {
      const response = await fetch("/api/admin/hero-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to create");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hero-slides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home/slides"] });
      toast({ title: "Hero slide created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create hero slide", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertHeroSlide> }) => {
      const response = await fetch(`/api/admin/hero-slides/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hero-slides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home/slides"] });
      toast({ title: "Hero slide updated successfully" });
      setIsDialogOpen(false);
      setEditingSlide(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to update hero slide", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/hero-slides/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hero-slides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home/slides"] });
      toast({ title: "Hero slide deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete hero slide", variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: number[]) => {
      const response = await fetch("/api/admin/hero-slides/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to reorder");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hero-slides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/home/slides"] });
      toast({ title: "Slides reordered successfully" });
    },
    onError: () => {
      toast({ title: "Failed to reorder slides", variant: "destructive" });
    },
  });

  const handleMoveUp = (index: number) => {
    if (!slides || index === 0) return;
    const newOrder = [...slides];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    reorderMutation.mutate(newOrder.map(s => s.id));
  };

  const handleMoveDown = (index: number) => {
    if (!slides || index === slides.length - 1) return;
    const newOrder = [...slides];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    reorderMutation.mutate(newOrder.map(s => s.id));
  };

  const handleEdit = (slide: HeroSlide) => {
    setEditingSlide(slide);
    form.reset({
      title: slide.title,
      subtitle: slide.subtitle || "",
      imageUrl: slide.imageUrl,
      ctaHref: slide.ctaHref || "",
      ctaLabel: slide.ctaLabel || "",
      isActive: slide.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingSlide(null);
    form.reset({
      title: "",
      subtitle: "",
      imageUrl: "",
      ctaHref: "",
      ctaLabel: "",
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: InsertHeroSlide) => {
    if (editingSlide) {
      updateMutation.mutate({ id: editingSlide.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
            Hero Slides
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage homepage carousel slides ({slides?.length || 0} slides)
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2" data-testid="button-add-slide">
          <Plus className="h-4 w-4" />
          Add Slide
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : slides && slides.length > 0 ? (
        <div className="space-y-4">
          {slides.map((slide, index) => (
            <Card key={slide.id} data-testid={`card-hero-slide-${slide.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0 || reorderMutation.isPending}
                      data-testid={`button-move-up-${slide.id}`}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center justify-center h-9 w-9">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === slides.length - 1 || reorderMutation.isPending}
                      data-testid={`button-move-down-${slide.id}`}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="h-24 w-40 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                    {slide.imageUrl ? (
                      <img
                        src={slide.imageUrl}
                        alt={slide.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Image className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-medium">{slide.title}</h3>
                      {!slide.isActive && (
                        <Badge variant="secondary" className="gap-1">
                          <EyeOff className="h-3 w-3" /> Inactive
                        </Badge>
                      )}
                    </div>
                    {slide.subtitle && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {slide.subtitle}
                      </p>
                    )}
                    {slide.ctaHref && (
                      <p className="text-xs text-muted-foreground">
                        Link: {slide.ctaLabel || slide.ctaHref}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Position: {index + 1}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(slide)}
                      data-testid={`button-edit-slide-${slide.id}`}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this slide?")) {
                          deleteMutation.mutate(slide.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-slide-${slide.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <Image className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">No hero slides yet</p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Slide
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "DM Sans, sans-serif" }}>
              {editingSlide ? "Edit Hero Slide" : "Add Hero Slide"}
            </DialogTitle>
            <DialogDescription>
              {editingSlide ? "Update slide content and settings" : "Create a new carousel slide for the homepage"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Slide headline" {...field} data-testid="input-slide-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subtitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtitle</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Supporting text..." {...field} value={field.value || ""} data-testid="input-slide-subtitle" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL *</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} data-testid="input-slide-image" />
                    </FormControl>
                    <FormDescription>
                      Recommended size: 1920x600 pixels for best display
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ctaHref"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Button Link</FormLabel>
                      <FormControl>
                        <Input placeholder="/products or https://..." {...field} value={field.value || ""} data-testid="input-slide-cta-href" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ctaLabel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Button Text</FormLabel>
                      <FormControl>
                        <Input placeholder="Learn More" {...field} value={field.value || ""} data-testid="input-slide-cta-label" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Status</FormLabel>
                    <div className="flex items-center gap-2 h-10">
                      <FormControl>
                        <Switch checked={field.value ?? true} onCheckedChange={field.onChange} data-testid="switch-slide-active" />
                      </FormControl>
                      <span className="text-sm text-muted-foreground">
                        {field.value ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-slide">
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingSlide ? "Save Changes" : "Create Slide"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
