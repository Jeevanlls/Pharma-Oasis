import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Offer, OfferItem, Product } from "@shared/schema";
import {
  Plus,
  Pencil,
  Trash2,
  Tag,
  Package,
  Calendar,
  Loader2,
  Eye,
  Search,
  Upload,
  ImageIcon,
  X,
  Sparkles,
  Power,
  Wand2,
  RefreshCw,
} from "lucide-react";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function OfferForm({
  offer,
  onSave,
  isPending,
}: {
  offer?: Offer;
  onSave: (data: Record<string, unknown>) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState(offer?.title || "");
  const [slug, setSlug] = useState(offer?.slug || "");
  const [description, setDescription] = useState(offer?.description || "");
  const [heroImageUrl, setHeroImageUrl] = useState(offer?.heroImageUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  const [heroTitle, setHeroTitle] = useState(offer?.heroTitle || "");
  const [heroSubtitle, setHeroSubtitle] = useState(offer?.heroSubtitle || "");
  const [displayStyle, setDisplayStyle] = useState(offer?.displayStyle || "grid");
  const [badgeText, setBadgeText] = useState(offer?.badgeText || "OFFER");
  const [badgeColor, setBadgeColor] = useState(offer?.badgeColor || "red");
  const [startDate, setStartDate] = useState(offer?.startDate ? new Date(offer.startDate).toISOString().slice(0, 16) : "");
  const [endDate, setEndDate] = useState(offer?.endDate ? new Date(offer.endDate).toISOString().slice(0, 16) : "");
  const [isActive, setIsActive] = useState(offer?.isActive ?? false);
  const [sortOrder, setSortOrder] = useState(offer?.sortOrder || 0);

  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [heroImagePrompt, setHeroImagePrompt] = useState("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(!offer);

  const { toast } = useToast();

  const generateContent = async () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingContent(true);
    try {
      const res = await fetch("/api/admin/offers/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
        credentials: "include",
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      const data = await res.json();
      if (data.title) { setTitle(data.title); setSlug(data.slug || slugify(data.title)); }
      if (data.description) setDescription(data.description);
      if (data.heroTitle) setHeroTitle(data.heroTitle);
      if (data.heroSubtitle) setHeroSubtitle(data.heroSubtitle);
      if (data.badgeText) setBadgeText(data.badgeText);
      if (data.badgeColor) setBadgeColor(data.badgeColor);
      if (data.displayStyle) setDisplayStyle(data.displayStyle);
      if (data.heroImagePrompt) setHeroImagePrompt(data.heroImagePrompt);
      toast({ title: "Content generated! Review and edit as needed." });
    } catch (err: any) {
      toast({ title: "Failed to generate content: " + (err.message || "Unknown error"), variant: "destructive" });
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const generateHeroImage = async (prompt: string) => {
    if (!prompt.trim()) return;
    setIsGeneratingImage(true);
    try {
      const res = await fetch("/api/admin/offers/generate-hero-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
        credentials: "include",
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      const data = await res.json();
      if (data.imageUrl) {
        setHeroImageUrl(data.imageUrl);
        toast({ title: "Banner image generated! You can regenerate or upload your own." });
      }
    } catch (err: any) {
      toast({ title: "Failed to generate image: " + (err.message || "Unknown error"), variant: "destructive" });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      slug: slug || slugify(title),
      description: description || null,
      heroImageUrl: heroImageUrl || null,
      heroTitle: heroTitle || null,
      heroSubtitle: heroSubtitle || null,
      displayStyle,
      badgeText,
      badgeColor,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      isActive,
      sortOrder,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <Label className="font-semibold">AI Content Generator</Label>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAiPanel(!showAiPanel)} data-testid="button-toggle-ai-panel">
              {showAiPanel ? "Hide" : "Show"}
            </Button>
          </div>
          {showAiPanel && (
            <>
              <div className="flex gap-2">
                <Textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Describe your offer, e.g. 'Spring clearance on baby nutrition products with 25% off' or 'Weekend flash sale on cold & flu remedies'..."
                  rows={2}
                  className="flex-1"
                  data-testid="input-ai-prompt"
                />
                <Button
                  type="button"
                  onClick={generateContent}
                  disabled={isGeneratingContent || !aiPrompt.trim()}
                  className="shrink-0 self-end"
                  data-testid="button-generate-content"
                >
                  {isGeneratingContent ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                  {isGeneratingContent ? "Generating..." : "Generate Content"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                AI will fill in all fields below. You can then review and edit before saving.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => { setTitle(e.target.value); if (!offer) setSlug(slugify(e.target.value)); }} required data-testid="input-offer-title" />
        </div>
        <div className="space-y-2">
          <Label>Slug</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} required data-testid="input-offer-slug" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} data-testid="input-offer-description" />
      </div>

      <div className="space-y-2">
        <Label>Hero Banner Image</Label>
        <p className="text-xs text-muted-foreground">
          Recommended: 1920×720px, landscape format. Max 10MB. JPG, PNG or WebP.
        </p>
        {heroImageUrl && (
          <div className="relative rounded-md overflow-hidden border">
            <img src={heroImageUrl} alt="Hero preview" className="w-full h-32 object-cover" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={() => setHeroImageUrl("")}
              data-testid="button-remove-hero-image"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={isUploading}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/jpeg,image/png,image/webp";
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                setIsUploading(true);
                try {
                  const formData = new FormData();
                  formData.append("image", file);
                  formData.append("category", "hero");
                  formData.append("altText", title ? `${title} offer banner` : "Offer banner");
                  const res = await fetch("/api/admin/uploads", { method: "POST", body: formData, credentials: "include" });
                  if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
                  const asset = await res.json();
                  setHeroImageUrl(asset.url);
                } catch (err: any) {
                  toast({ title: "Upload failed: " + (err.message || "Unknown error"), variant: "destructive" });
                } finally {
                  setIsUploading(false);
                }
              };
              input.click();
            }}
            data-testid="button-upload-hero-image"
          >
            {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {isUploading ? "Uploading..." : "Upload Image"}
          </Button>
          <Input
            value={heroImageUrl}
            onChange={(e) => setHeroImageUrl(e.target.value)}
            placeholder="Or paste image URL..."
            className="flex-1"
            data-testid="input-hero-image"
          />
        </div>

        <Card className="border-dashed">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-primary" />
              <Label className="text-sm font-medium">AI Image Generator</Label>
            </div>
            <div className="flex gap-2">
              <Textarea
                value={heroImagePrompt}
                onChange={(e) => setHeroImagePrompt(e.target.value)}
                placeholder="Describe the hero image you want, e.g. 'Clean pharmaceutical products on a blue gradient background with soft lighting'..."
                rows={2}
                className="flex-1 text-sm"
                data-testid="input-hero-image-prompt"
              />
              <div className="flex flex-col gap-1 shrink-0 self-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => generateHeroImage(heroImagePrompt)}
                  disabled={isGeneratingImage || !heroImagePrompt.trim()}
                  data-testid="button-generate-hero-image"
                >
                  {isGeneratingImage ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <ImageIcon className="h-3 w-3 mr-1" />}
                  {isGeneratingImage ? "Creating..." : "Generate"}
                </Button>
                {heroImageUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => generateHeroImage(heroImagePrompt)}
                    disabled={isGeneratingImage || !heroImagePrompt.trim()}
                    data-testid="button-regenerate-hero-image"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Retry
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              AI will generate a banner image based on your description. Not happy? Edit the prompt and regenerate.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Hero Title (overlay text)</Label>
          <Input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} data-testid="input-hero-title" />
        </div>
        <div className="space-y-2">
          <Label>Hero Subtitle</Label>
          <Input value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} data-testid="input-hero-subtitle" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Display Style</Label>
          <Select value={displayStyle} onValueChange={setDisplayStyle}>
            <SelectTrigger data-testid="select-display-style">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grid">Grid</SelectItem>
              <SelectItem value="featured">Featured Spotlight</SelectItem>
              <SelectItem value="list">List View</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Badge Text</Label>
          <Input value={badgeText} onChange={(e) => setBadgeText(e.target.value)} data-testid="input-badge-text" />
        </div>
        <div className="space-y-2">
          <Label>Badge Color</Label>
          <Select value={badgeColor} onValueChange={setBadgeColor}>
            <SelectTrigger data-testid="select-badge-color">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="red">Red</SelectItem>
              <SelectItem value="green">Green</SelectItem>
              <SelectItem value="blue">Blue</SelectItem>
              <SelectItem value="orange">Orange</SelectItem>
              <SelectItem value="purple">Purple</SelectItem>
              <SelectItem value="yellow">Yellow</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} required data-testid="input-start-date" />
        </div>
        <div className="space-y-2">
          <Label>End Date</Label>
          <Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} required data-testid="input-end-date" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} data-testid="switch-offer-active" />
            <Label>{isActive ? "Live (visible to customers)" : "Draft (hidden from customers)"}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Label>Sort Order</Label>
            <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)} className="w-20" data-testid="input-sort-order" />
          </div>
        </div>
        <div className="flex gap-2">
          {offer && (
            <a href={`/offers`} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="outline" data-testid="button-preview-offer">
                <Eye className="h-4 w-4 mr-2" /> Preview
              </Button>
            </a>
          )}
          <Button type="submit" disabled={isPending} data-testid="button-save-offer">
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {offer ? "Update Offer" : "Create as Draft"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function OfferItemsManager({ offerId }: { offerId: number }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [addingProductId, setAddingProductId] = useState<number | null>(null);
  const [offerPrice, setOfferPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [discountLabel, setDiscountLabel] = useState("");
  const { toast } = useToast();

  const { data: items = [], isLoading } = useQuery<(OfferItem & { product: Product })[]>({
    queryKey: ["/api/admin/offers", offerId, "items"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/offers/${offerId}/items`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch items");
      return res.json();
    },
  });

  const addItemMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("POST", `/api/admin/offers/${offerId}/items`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offers", offerId, "items"] });
      setAddingProductId(null);
      setOfferPrice("");
      setOriginalPrice("");
      setDiscountLabel("");
      toast({ title: "Product added to offer" });
    },
    onError: () => toast({ title: "Failed to add product", variant: "destructive" }),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/offer-items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offers", offerId, "items"] });
      toast({ title: "Product removed" });
    },
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(searchQuery)}&limit=10`, { credentials: "include" });
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : data.products || []);
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddProduct = (product: Product) => {
    setAddingProductId(product.id);
    setOriginalPrice(product.wholesalePrice || "");
    setOfferPrice("");
    setDiscountLabel("");
  };

  const confirmAdd = () => {
    if (!offerPrice || !addingProductId) return;
    addItemMutation.mutate({
      productId: addingProductId,
      offerPrice,
      originalPrice: originalPrice || null,
      discountLabel: discountLabel || null,
      sortOrder: items.length,
    });
  };

  const existingProductIds = new Set(items.map(i => i.productId));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search products by name or SKU..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          data-testid="input-search-products"
        />
        <Button onClick={handleSearch} disabled={isSearching} variant="outline" data-testid="button-search-products">
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {searchResults.length > 0 && (
        <Card>
          <CardContent className="p-3 max-h-60 overflow-auto">
            <div className="space-y-2">
              {searchResults.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-2 rounded border text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{product.productName}</div>
                    <div className="text-xs text-muted-foreground">SKU: {product.sku} {product.wholesalePrice && `| £${product.wholesalePrice}`}</div>
                  </div>
                  {existingProductIds.has(product.id) ? (
                    <Badge variant="secondary" className="shrink-0">Added</Badge>
                  ) : addingProductId === product.id ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Offer £"
                        value={offerPrice}
                        onChange={(e) => setOfferPrice(e.target.value)}
                        className="w-24"
                        data-testid="input-offer-price"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Original £"
                        value={originalPrice}
                        onChange={(e) => setOriginalPrice(e.target.value)}
                        className="w-24"
                        data-testid="input-original-price"
                      />
                      <Input
                        placeholder="Label"
                        value={discountLabel}
                        onChange={(e) => setDiscountLabel(e.target.value)}
                        className="w-24"
                        data-testid="input-discount-label"
                      />
                      <Button size="sm" onClick={confirmAdd} disabled={addItemMutation.isPending} data-testid="button-confirm-add">
                        {addItemMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Add"}
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleAddProduct(product)} data-testid={`button-add-product-${product.id}`}>
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <h4 className="font-medium text-sm text-muted-foreground">
          {items.length} product{items.length !== 1 ? "s" : ""} in this offer
        </h4>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="mx-auto h-8 w-8 mb-2" />
            <p>No products added yet. Search above to add products.</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 rounded border text-sm" data-testid={`offer-item-${item.id}`}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {item.product.imageUrl && (
                  <img src={item.product.imageUrl} alt="" className="w-10 h-10 object-contain rounded" />
                )}
                <div className="min-w-0">
                  <div className="font-medium truncate">{item.product.productName}</div>
                  <div className="text-xs text-muted-foreground">
                    SKU: {item.product.sku}
                    {item.discountLabel && <Badge variant="secondary" className="ml-2 text-xs">{item.discountLabel}</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <div className="font-semibold text-green-600">£{parseFloat(item.offerPrice).toFixed(2)}</div>
                  {item.originalPrice && (
                    <div className="text-xs text-muted-foreground line-through">£{parseFloat(item.originalPrice).toFixed(2)}</div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteItemMutation.mutate(item.id)}
                  disabled={deleteItemMutation.isPending}
                  data-testid={`button-remove-item-${item.id}`}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function AdminOffersPage() {
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [managingItems, setManagingItems] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: allOffers = [], isLoading } = useQuery<Offer[]>({
    queryKey: ["/api/admin/offers"],
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiRequest("POST", "/api/admin/offers", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offers"] });
      setCreateDialogOpen(false);
      toast({ title: "Offer created as draft. Add products and toggle live when ready." });
    },
    onError: () => toast({ title: "Failed to create offer", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => apiRequest("PATCH", `/api/admin/offers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offers"] });
      setEditingOffer(null);
      toast({ title: "Offer updated" });
    },
    onError: () => toast({ title: "Failed to update offer", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/offers/${id}`, { isActive }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offers"] });
      toast({ title: variables.isActive ? "Offer is now live!" : "Offer switched off" });
    },
    onError: () => toast({ title: "Failed to toggle offer", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/offers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offers"] });
      toast({ title: "Offer deleted" });
    },
    onError: () => toast({ title: "Failed to delete offer", variant: "destructive" }),
  });

  const getStatusBadge = (offer: Offer) => {
    const now = new Date();
    const start = new Date(offer.startDate);
    const end = new Date(offer.endDate);
    if (!offer.isActive) return <Badge variant="secondary">Draft</Badge>;
    if (now < start) return <Badge className="bg-blue-500 text-white border-0">Scheduled</Badge>;
    if (now > end) return <Badge variant="secondary">Expired</Badge>;
    return <Badge className="bg-green-500 text-white border-0">Live</Badge>;
  };

  if (managingItems !== null) {
    const offer = allOffers.find(o => o.id === managingItems);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-manage-items-title">
              Manage Products: {offer?.title}
            </h1>
            <p className="text-muted-foreground mt-1">Add and remove products from this offer campaign</p>
          </div>
          <Button variant="outline" onClick={() => setManagingItems(null)} data-testid="button-back-to-offers">
            Back to Offers
          </Button>
        </div>
        <OfferItemsManager offerId={managingItems} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-offers-title">Offers</h1>
          <p className="text-muted-foreground mt-1">Create and manage promotional offer campaigns</p>
        </div>
        <div className="flex gap-2">
          <a href="/offers" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" data-testid="button-view-offers-page">
              <Eye className="h-4 w-4 mr-2" /> View Page
            </Button>
          </a>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-offer">
                <Plus className="h-4 w-4 mr-2" /> New Offer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Offer</DialogTitle>
              </DialogHeader>
              <OfferForm onSave={(data) => createMutation.mutate(data)} isPending={createMutation.isPending} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading offers...</div>
      ) : allOffers.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Tag className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No offers yet</h3>
            <p className="text-muted-foreground mb-4">Create your first promotional offer campaign</p>
            <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-create-first-offer">
              <Plus className="h-4 w-4 mr-2" /> Create Offer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {allOffers.map((offer) => (
            <Card key={offer.id} className={!offer.isActive ? "opacity-70" : ""} data-testid={`card-offer-${offer.id}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="shrink-0">
                      <Switch
                        checked={offer.isActive}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: offer.id, isActive: checked })}
                        disabled={toggleMutation.isPending}
                        data-testid={`switch-toggle-offer-${offer.id}`}
                      />
                    </div>
                    {offer.heroImageUrl && (
                      <img src={offer.heroImageUrl} alt="" className="w-20 h-14 object-cover rounded shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{offer.title}</h3>
                        {getStatusBadge(offer)}
                        <Badge variant="outline" className="text-xs">{offer.displayStyle}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(offer.startDate).toLocaleDateString()} - {new Date(offer.endDate).toLocaleDateString()}
                        </span>
                        <span>/offers/{offer.slug}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setManagingItems(offer.id)} data-testid={`button-manage-items-${offer.id}`}>
                      <Package className="h-4 w-4 mr-1" /> Products
                    </Button>
                    <Dialog open={editingOffer?.id === offer.id} onOpenChange={(open) => !open && setEditingOffer(null)}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => setEditingOffer(offer)} data-testid={`button-edit-offer-${offer.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Offer</DialogTitle>
                        </DialogHeader>
                        <OfferForm
                          offer={offer}
                          onSave={(data) => updateMutation.mutate({ id: offer.id, data })}
                          isPending={updateMutation.isPending}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Delete this offer and all its items?")) {
                          deleteMutation.mutate(offer.id);
                        }
                      }}
                      data-testid={`button-delete-offer-${offer.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
