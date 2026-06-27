import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SupplierLead } from "@shared/schema";
import { format } from "date-fns";
import { 
  Search, 
  Globe, 
  Eye,
  Mail,
  User,
  Building2,
  Phone,
  Calendar,
  Clock,
  CheckCircle,
  X,
  Trash2,
  Loader2,
  Package,
  MapPin,
} from "lucide-react";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new: { label: "New", variant: "default" },
  contacted: { label: "Contacted", variant: "secondary" },
  qualified: { label: "Qualified", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  converted: { label: "Converted", variant: "outline" },
};

export default function AdminSuppliersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLead, setSelectedLead] = useState<SupplierLead | null>(null);
  const { toast } = useToast();

  const { data: leads, isLoading } = useQuery<SupplierLead[]>({
    queryKey: ["/api/admin/supplier-leads"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<SupplierLead> }) => {
      return apiRequest("PATCH", `/api/admin/supplier-leads/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/supplier-leads"] });
      toast({ title: "Lead updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update lead", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/supplier-leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/supplier-leads"] });
      toast({ title: "Lead deleted" });
      setSelectedLead(null);
    },
    onError: () => {
      toast({ title: "Failed to delete lead", variant: "destructive" });
    },
  });

  const filteredLeads = leads?.filter(lead =>
    lead.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const newLeads = filteredLeads?.filter(l => l.status === "new") || [];
  const otherLeads = filteredLeads?.filter(l => l.status !== "new") || [];

  const handleStatusChange = (lead: SupplierLead, newStatus: string) => {
    updateMutation.mutate({ id: lead.id, updates: { status: newStatus } });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
          Supplier Leads
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage potential supplier partnership applications
        </p>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by company, contact, or email..."
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
      ) : (
        <div className="space-y-8">
          {newLeads.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Badge>{newLeads.length}</Badge>
                New Leads
              </h2>
              <div className="space-y-4">
                {newLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onView={() => setSelectedLead(lead)}
                    onStatusChange={(status) => handleStatusChange(lead, status)}
                    isUpdating={updateMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold mb-4">
              {newLeads.length > 0 ? "Other Leads" : "All Leads"} ({otherLeads.length})
            </h2>
            {otherLeads.length > 0 ? (
              <div className="space-y-4">
                {otherLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onView={() => setSelectedLead(lead)}
                    onStatusChange={(status) => handleStatusChange(lead, status)}
                    isUpdating={updateMutation.isPending}
                  />
                ))}
              </div>
            ) : newLeads.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <Globe className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No supplier leads yet</p>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      )}

      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "DM Sans, sans-serif" }}>
              {selectedLead?.companyName}
            </DialogTitle>
            <DialogDescription>
              Supplier partnership application
            </DialogDescription>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge variant={statusConfig[selectedLead.status]?.variant || "secondary"}>
                  {statusConfig[selectedLead.status]?.label || selectedLead.status}
                </Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="font-medium">{selectedLead.companyName}</p>
                    <p className="text-xs text-muted-foreground">{selectedLead.businessType}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Contact</p>
                    <p className="font-medium">{selectedLead.contactName}</p>
                    <p className="text-xs text-muted-foreground">{selectedLead.jobTitle || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedLead.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedLead.phoneNumber || "N/A"}</p>
                  </div>
                </div>
                {selectedLead.website && (
                  <div className="flex items-start gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Website</p>
                      <a 
                        href={selectedLead.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline"
                      >
                        {selectedLead.website}
                      </a>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Country</p>
                    <p className="font-medium">{selectedLead.country || "UK"}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Product Categories
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedLead.productCategoriesSupply
                    ? selectedLead.productCategoriesSupply.split(",").map((cat, i) => (
                        <Badge key={i} variant="secondary">{cat.trim()}</Badge>
                      ))
                    : <span className="text-sm text-muted-foreground">Not specified</span>}
                </div>
              </div>

              {selectedLead.proposalSummary && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Proposal Summary</h4>
                  <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg">
                    {selectedLead.proposalSummary}
                  </p>
                </div>
              )}

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Submitted: {format(new Date(selectedLead.createdAt), "PPpp")}
                </p>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Update Status</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(statusConfig).map(([value, config]) => (
                    <Button
                      key={value}
                      size="sm"
                      variant={selectedLead.status === value ? "default" : "outline"}
                      onClick={() => handleStatusChange(selectedLead, value)}
                      disabled={updateMutation.isPending}
                    >
                      {config.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button 
              variant="destructive" 
              onClick={() => {
                if (selectedLead && confirm("Delete this lead?")) {
                  deleteMutation.mutate(selectedLead.id);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setSelectedLead(null)}>
              Close
            </Button>
            <Button asChild>
              <a href={`mailto:${selectedLead?.email}`}>
                <Mail className="h-4 w-4 mr-1" />
                Contact
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface LeadCardProps {
  lead: SupplierLead;
  onView: () => void;
  onStatusChange: (status: string) => void;
  isUpdating: boolean;
}

function LeadCard({ lead, onView, onStatusChange, isUpdating }: LeadCardProps) {
  const status = statusConfig[lead.status] || statusConfig.new;
  const categories = (lead.productCategoriesSupply ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  return (
    <Card data-testid={`card-lead-${lead.id}`}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium truncate">{lead.companyName}</h3>
              <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {lead.contactName}
              </span>
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {lead.email}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(lead.createdAt), "MMM d, yyyy")}
              </span>
            </div>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {categories.slice(0, 3).map((cat, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{cat}</Badge>
                ))}
                {categories.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{categories.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {lead.status === "new" && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onStatusChange("contacted")}
                  disabled={isUpdating}
                >
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  <span className="ml-1 hidden sm:inline">Mark Contacted</span>
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={onView}>
              <Eye className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">View</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
