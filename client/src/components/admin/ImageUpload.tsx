import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImageUploadProps {
  onImageUploaded: (url: string, thumbnailUrl?: string) => void;
  category: "brand" | "product" | "hero" | "general";
  currentImageUrl?: string;
  label?: string;
}

export function ImageUpload({
  onImageUploaded,
  category,
  currentImageUrl,
  label = "Image",
}: ImageUploadProps) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      onImageUploaded(data.url, data.thumbnailUrl);
      toast({
        title: "Image uploaded",
        description: "Your image has been processed and saved.",
      });
      setOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPEG, PNG, WebP, or GIF)",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 10MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append("image", selectedFile);
    formData.append("category", category);
    formData.append("altText", altText);
    uploadMutation.mutate(formData);
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreview(null);
    setAltText("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 10MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const dimensionHints: Record<string, string> = {
    brand: "Optimized to 200x80px (transparent PNG)",
    product: "Optimized to 600x600px (JPEG)",
    hero: "Optimized to 1920x720px (WebP)",
    general: "Optimized to max 800x600px (JPEG)",
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        {currentImageUrl && (
          <div className="relative h-16 w-16 rounded-md border overflow-hidden bg-muted">
            <img
              src={currentImageUrl}
              alt="Current"
              className="h-full w-full object-contain"
              data-testid="img-current-upload"
            />
          </div>
        )}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" type="button" data-testid="button-upload-image">
              <Upload className="h-4 w-4 mr-2" />
              {currentImageUrl ? "Change Image" : "Upload Image"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Upload Image</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {dimensionHints[category]}
              </div>
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  preview ? "border-primary" : "border-muted-foreground/25"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                {preview ? (
                  <div className="relative">
                    <img
                      src={preview}
                      alt="Preview"
                      className="max-h-48 mx-auto rounded"
                      data-testid="img-preview-upload"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2"
                      onClick={resetForm}
                      type="button"
                      data-testid="button-remove-preview"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drag and drop an image here, or click to select
                    </p>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      data-testid="button-select-file"
                    >
                      Select File
                    </Button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-file-upload"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="altText">Alt Text (optional)</Label>
                <Input
                  id="altText"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Describe the image for accessibility"
                  data-testid="input-alt-text"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                  type="button"
                  data-testid="button-cancel-upload"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploadMutation.isPending}
                  type="button"
                  data-testid="button-confirm-upload"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {currentImageUrl && (
        <Input
          value={currentImageUrl}
          readOnly
          className="text-xs text-muted-foreground"
          data-testid="input-image-url"
        />
      )}
    </div>
  );
}

export function ImageUrlInput({
  value,
  onChange,
  onUpload,
  category,
  label = "Image URL",
}: {
  value: string;
  onChange: (url: string) => void;
  onUpload?: (url: string) => void;
  category: "brand" | "product" | "hero" | "general";
  label?: string;
}) {
  const handleImageUploaded = (url: string) => {
    onChange(url);
    onUpload?.(url);
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter image URL or upload..."
          data-testid="input-image-url-field"
        />
        <ImageUpload
          onImageUploaded={handleImageUploaded}
          category={category}
          currentImageUrl={value}
          label=""
        />
      </div>
    </div>
  );
}
