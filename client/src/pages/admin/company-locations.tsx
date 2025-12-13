import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { CompanyLocation, InsertCompanyLocation } from "@shared/schema";
import { insertCompanyLocationSchema } from "@shared/schema";
import { 
  Plus, 
  Pencil,
  Trash2,
  Loader2,
  MapPin,
  EyeOff,
  Building2,
  Phone,
  Mail,
} from "lucide-react";

const locationTypes = [
  { value: "headquarters", label: "Headquarters" },
  { value: "warehouse", label: "Warehouse" },
  { value: "branch", label: "Branch Office" },
  { value: "distribution", label: "Distribution Center" },
];

export default function AdminCompanyLocationsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<CompanyLocation | null>(null);
  const { toast } = useToast();

  const { data: locations, isLoading } = useQuery<CompanyLocation[]>({
    queryKey: ["/api/admin/company-locations"],
  });

  const form = useForm<InsertCompanyLocation>({
    resolver: zodResolver(insertCompanyLocationSchema),
    defaultValues: {
      locationType: "headquarters",
      locationName: "",
      companyName: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      postcode: "",
      country: "United Kingdom",
      vatNumber: "",
      companyRegNumber: "",
      wdaLicenceNumber: "",
      phoneNumber: "",
      email: "",
      position: 0,
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertCompanyLocation) => {
      const response = await fetch("/api/admin/company-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to create");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company-locations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company-locations"] });
      toast({ title: "Location created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create location", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertCompanyLocation> }) => {
      const response = await fetch(`/api/admin/company-locations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company-locations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company-locations"] });
      toast({ title: "Location updated successfully" });
      setIsDialogOpen(false);
      setEditingLocation(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to update location", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/company-locations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company-locations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/company-locations"] });
      toast({ title: "Location deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete location", variant: "destructive" });
    },
  });

  const handleEdit = (location: CompanyLocation) => {
    setEditingLocation(location);
    form.reset({
      locationType: location.locationType,
      locationName: location.locationName,
      companyName: location.companyName,
      addressLine1: location.addressLine1,
      addressLine2: location.addressLine2 || "",
      city: location.city || "",
      postcode: location.postcode || "",
      country: location.country,
      vatNumber: location.vatNumber || "",
      companyRegNumber: location.companyRegNumber || "",
      wdaLicenceNumber: location.wdaLicenceNumber || "",
      phoneNumber: location.phoneNumber || "",
      email: location.email || "",
      position: location.position,
      isActive: location.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingLocation(null);
    form.reset({
      locationType: "headquarters",
      locationName: "",
      companyName: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      postcode: "",
      country: "United Kingdom",
      vatNumber: "",
      companyRegNumber: "",
      wdaLicenceNumber: "",
      phoneNumber: "",
      email: "",
      position: locations?.length || 0,
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: InsertCompanyLocation) => {
    if (editingLocation) {
      updateMutation.mutate({ id: editingLocation.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getLocationTypeLabel = (type: string) => {
    return locationTypes.find(t => t.value === type)?.label || type;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
            Company Locations
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage company office and warehouse locations ({locations?.length || 0} locations)
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2" data-testid="button-add-location">
          <Plus className="h-4 w-4" />
          Add Location
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : locations && locations.length > 0 ? (
        <div className="space-y-4">
          {locations.map((location) => (
            <Card key={location.id} data-testid={`card-location-${location.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 flex-shrink-0 flex items-center justify-center rounded-lg bg-muted">
                    <MapPin className="h-6 w-6 text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-medium">{location.locationName}</h3>
                      <Badge variant="outline">{getLocationTypeLabel(location.locationType)}</Badge>
                      {!location.isActive && (
                        <Badge variant="secondary" className="gap-1">
                          <EyeOff className="h-3 w-3" /> Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                      <Building2 className="h-3 w-3" />
                      {location.companyName}
                    </p>
                    <p className="text-sm text-muted-foreground mb-1">
                      {location.addressLine1}
                      {location.addressLine2 && `, ${location.addressLine2}`}
                      {location.city && `, ${location.city}`}
                      {location.postcode && ` ${location.postcode}`}
                      {location.country && `, ${location.country}`}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {location.phoneNumber && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {location.phoneNumber}
                        </span>
                      )}
                      {location.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {location.email}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(location)}
                      data-testid={`button-edit-location-${location.id}`}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this location?")) {
                          deleteMutation.mutate(location.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-location-${location.id}`}
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
            <MapPin className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">No company locations yet</p>
            <Button onClick={handleCreate} data-testid="button-add-first-location">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Location
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "DM Sans, sans-serif" }}>
              {editingLocation ? "Edit Location" : "Add Location"}
            </DialogTitle>
            <DialogDescription>
              {editingLocation ? "Update location details" : "Add a new company location"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="locationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-location-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {locationTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
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
                  name="locationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="UK Headquarters" {...field} data-testid="input-location-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Pharma Oasis Ltd" {...field} data-testid="input-company-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressLine1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 1 *</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Business Park" {...field} data-testid="input-address-1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="addressLine2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 2</FormLabel>
                    <FormControl>
                      <Input placeholder="Suite 100" {...field} value={field.value || ""} data-testid="input-address-2" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="London" {...field} value={field.value || ""} data-testid="input-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="postcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postcode</FormLabel>
                      <FormControl>
                        <Input placeholder="SW1A 1AA" {...field} value={field.value || ""} data-testid="input-postcode" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country *</FormLabel>
                      <FormControl>
                        <Input placeholder="United Kingdom" {...field} data-testid="input-country" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+44 20 1234 5678" {...field} value={field.value || ""} data-testid="input-phone" />
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="info@pharmaoasis.com" {...field} value={field.value || ""} data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="vatNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VAT Number</FormLabel>
                      <FormControl>
                        <Input placeholder="GB123456789" {...field} value={field.value || ""} data-testid="input-vat" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="companyRegNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Reg No.</FormLabel>
                      <FormControl>
                        <Input placeholder="12345678" {...field} value={field.value || ""} data-testid="input-company-reg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="wdaLicenceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WDA Licence</FormLabel>
                      <FormControl>
                        <Input placeholder="WDA(H)12345" {...field} value={field.value || ""} data-testid="input-wda" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Position</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0" 
                          {...field} 
                          value={field.value ?? 0}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-position" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Status</FormLabel>
                      <div className="flex items-center gap-2 h-10">
                        <FormControl>
                          <Switch checked={field.value ?? true} onCheckedChange={field.onChange} data-testid="switch-active" />
                        </FormControl>
                        <span className="text-sm text-muted-foreground">
                          {field.value ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-location">
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingLocation ? "Save Changes" : "Create Location"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
