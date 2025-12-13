import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { format } from "date-fns";
import { 
  Search, 
  Users, 
  Check, 
  X, 
  MoreVertical,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  Loader2,
  Eye,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type UserWithoutPassword = Omit<User, "passwordHash">;

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  active: { label: "Active", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
  suspended: { label: "Suspended", variant: "outline" },
};

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<UserWithoutPassword | null>(null);
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery<UserWithoutPassword[]>({
    queryKey: ["/api/admin/users"],
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: { status?: string; role?: string } }) => {
      return apiRequest("PATCH", `/api/admin/users/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "User updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update user", variant: "destructive" });
    },
  });

  const filteredUsers = users?.filter(user => {
    const matchesSearch = !searchQuery || 
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.primaryContactName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = !statusFilter || user.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const pendingUsers = filteredUsers?.filter(u => u.status === "pending") || [];
  const otherUsers = filteredUsers?.filter(u => u.status !== "pending") || [];

  const handleApprove = (user: UserWithoutPassword) => {
    updateUserMutation.mutate({ id: user.id, updates: { status: "active" } });
  };

  const handleReject = (user: UserWithoutPassword) => {
    updateUserMutation.mutate({ id: user.id, updates: { status: "rejected" } });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
          User Management
        </h1>
        <p className="mt-2 text-muted-foreground">
          Manage customer accounts and approvals
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email, company, or contact name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-user-search"
          />
        </div>
        <Select value={statusFilter || "all"} onValueChange={(val) => setStatusFilter(val === "all" ? "" : val)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
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
          {pendingUsers.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Badge variant="secondary">{pendingUsers.length}</Badge>
                Pending Approval
              </h2>
              <div className="space-y-4">
                {pendingUsers.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onApprove={() => handleApprove(user)}
                    onReject={() => handleReject(user)}
                    onView={() => setSelectedUser(user)}
                    isPending={updateUserMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold mb-4">
              All Users ({otherUsers.length})
            </h2>
            {otherUsers.length > 0 ? (
              <div className="space-y-4">
                {otherUsers.map((user) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    onView={() => setSelectedUser(user)}
                  />
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">No users found</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "DM Sans, sans-serif" }}>User Details</DialogTitle>
            <DialogDescription>
              Complete registration information
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Company Name</p>
                  <p className="font-medium">{selectedUser.companyName || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Trading Name</p>
                  <p className="font-medium">{selectedUser.tradingName || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Business Type</p>
                  <p className="font-medium">{selectedUser.businessType || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={statusConfig[selectedUser.status]?.variant || "secondary"}>
                    {statusConfig[selectedUser.status]?.label || selectedUser.status}
                  </Badge>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Contact Information</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Primary Contact</p>
                    <p className="font-medium">{selectedUser.primaryContactName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Job Title</p>
                    <p className="font-medium">{selectedUser.jobTitle || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{selectedUser.phoneNumber || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Billing Address</h4>
                <p className="text-sm">
                  {selectedUser.billingAddressLine1}<br />
                  {selectedUser.billingAddressLine2 && <>{selectedUser.billingAddressLine2}<br /></>}
                  {selectedUser.billingCity}, {selectedUser.billingPostcode}<br />
                  {selectedUser.billingCountry}
                </p>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Regulatory Information</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">GPhC Number</p>
                    <p className="font-medium">{selectedUser.gphcNumber || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">MHRA Licence</p>
                    <p className="font-medium">
                      {selectedUser.mhraLicenceType ? `${selectedUser.mhraLicenceType} - ${selectedUser.mhraLicenceNumber}` : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Company Reg. No.</p>
                    <p className="font-medium">{selectedUser.companyRegistrationNumber || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">VAT Number</p>
                    <p className="font-medium">{selectedUser.vatNumber || "-"}</p>
                  </div>
                </div>
              </div>

              {selectedUser.notes && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Notes</h4>
                  <p className="text-sm text-muted-foreground">{selectedUser.notes}</p>
                </div>
              )}

              <div className="border-t pt-4 text-xs text-muted-foreground">
                Registered: {format(new Date(selectedUser.createdAt), "PPpp")}
              </div>
            </div>
          )}
          <DialogFooter>
            {selectedUser?.status === "pending" && (
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleReject(selectedUser);
                    setSelectedUser(null);
                  }}
                  disabled={updateUserMutation.isPending}
                >
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    handleApprove(selectedUser);
                    setSelectedUser(null);
                  }}
                  disabled={updateUserMutation.isPending}
                >
                  Approve
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface UserCardProps {
  user: UserWithoutPassword;
  onApprove?: () => void;
  onReject?: () => void;
  onView: () => void;
  isPending?: boolean;
}

function UserCard({ user, onApprove, onReject, onView, isPending }: UserCardProps) {
  const status = statusConfig[user.status] || { label: user.status, variant: "secondary" as const };

  return (
    <Card data-testid={`card-user-${user.id}`}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium truncate">{user.companyName || "No Company Name"}</h3>
              <Badge variant={status.variant}>{status.label}</Badge>
              {user.role === "admin" && (
                <Badge variant="outline">Admin</Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {user.email}
              </span>
              {user.phoneNumber && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {user.phoneNumber}
                </span>
              )}
              {user.billingCity && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {user.billingCity}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(user.createdAt), "MMM d, yyyy")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user.status === "pending" && onApprove && onReject && (
              <>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={onReject}
                  disabled={isPending}
                  data-testid={`button-reject-${user.id}`}
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  <span className="ml-1 hidden sm:inline">Reject</span>
                </Button>
                <Button
                  size="sm"
                  onClick={onApprove}
                  disabled={isPending}
                  data-testid={`button-approve-${user.id}`}
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  <span className="ml-1 hidden sm:inline">Approve</span>
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
