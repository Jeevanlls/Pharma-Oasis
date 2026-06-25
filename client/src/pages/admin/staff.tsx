import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import type { User } from "@shared/schema";
import { format } from "date-fns";
import { 
  Search, 
  UserCog, 
  Plus,
  Mail,
  Calendar,
  Loader2,
  Shield,
  ShieldCheck,
  UserX,
  UserCheck,
  Eye,
  Send,
} from "lucide-react";

type StaffUser = Omit<User, "passwordHash">;

const roleConfig: Record<string, { label: string; icon: typeof Shield }> = {
  staff: { label: "Staff", icon: Shield },
  admin: { label: "Admin", icon: ShieldCheck },
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Active", variant: "default" },
  pending: { label: "Pending", variant: "secondary" },
  suspended: { label: "Suspended", variant: "outline" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export default function AdminStaffPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffPassword, setNewStaffPassword] = useState("");
  const [newStaffName, setNewStaffName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "staff">("staff");
  const [pendingActionId, setPendingActionId] = useState<number | null>(null);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const { data: staffList, isLoading } = useQuery<StaffUser[]>({
    queryKey: ["/api/admin/staff"],
  });

  const createStaffMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; primaryContactName: string }) => {
      return apiRequest("POST", "/api/admin/staff", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/staff"] });
      toast({ title: "Staff member created successfully" });
      setCreateDialogOpen(false);
      setNewStaffEmail("");
      setNewStaffPassword("");
      setNewStaffName("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create staff member", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; primaryContactName: string; role: "admin" | "staff" }) => {
      return apiRequest("POST", "/api/admin/team/invite", data);
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/staff"] });
      toast({
        title: "Invite sent",
        description: result?.inviteSent === false
          ? "Account created, but the invite email could not be sent. Use Forgot Password to set their password."
          : `An invite email was sent to ${inviteEmail}. The link is valid for 7 days.`,
      });
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("staff");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send invite",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: { status?: string; role?: string } }) => {
      setPendingActionId(id);
      return apiRequest("PATCH", `/api/admin/staff/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/staff"] });
      toast({ title: "Staff member updated successfully" });
      setPendingActionId(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update staff member", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
      setPendingActionId(null);
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (id: number) => {
      setPendingActionId(id);
      return apiRequest("DELETE", `/api/admin/staff/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/staff"] });
      toast({ title: "Staff member removed successfully" });
      setPendingActionId(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to remove staff member", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
      setPendingActionId(null);
    },
  });

  const filteredStaff = staffList?.filter(staff => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      staff.email.toLowerCase().includes(query) ||
      staff.primaryContactName?.toLowerCase().includes(query)
    );
  });

  const activeStaff = filteredStaff?.filter(s => s.status === "active") || [];
  const inactiveStaff = filteredStaff?.filter(s => s.status !== "active") || [];

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffEmail || !newStaffPassword || !newStaffName) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    createStaffMutation.mutate({
      email: newStaffEmail,
      password: newStaffPassword,
      primaryContactName: newStaffName,
    });
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) {
      toast({ title: "Please enter a name and email", variant: "destructive" });
      return;
    }
    inviteMutation.mutate({
      email: inviteEmail,
      primaryContactName: inviteName,
      role: inviteRole,
    });
  };

  const handleToggleStatus = (staff: StaffUser) => {
    if (staff.id === currentUser?.id) {
      toast({ title: "You cannot change your own status", variant: "destructive" });
      return;
    }
    const newStatus = staff.status === "active" ? "suspended" : "active";
    updateStaffMutation.mutate({ id: staff.id, updates: { status: newStatus } });
  };

  const handleChangeRole = (staff: StaffUser, newRole: string) => {
    if (staff.id === currentUser?.id) {
      toast({ title: "You cannot change your own role", variant: "destructive" });
      return;
    }
    updateStaffMutation.mutate({ id: staff.id, updates: { role: newRole } });
  };

  const handleRemoveStaff = (staff: StaffUser) => {
    if (staff.id === currentUser?.id) {
      toast({ title: "You cannot remove yourself", variant: "destructive" });
      return;
    }
    deleteStaffMutation.mutate(staff.id);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
            Staff Management
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage admin and staff accounts
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-invite-team">
              <Send className="h-4 w-4 mr-2" />
              Invite by Email
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleInvite}>
              <DialogHeader>
                <DialogTitle>Invite a Team Member</DialogTitle>
                <DialogDescription>
                  Send an email invite. They set their own password — you never type one for them. The link is valid for 7 days.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-name">Full Name</Label>
                  <Input
                    id="invite-name"
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="John Smith"
                    data-testid="input-invite-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="person@pharmaoasis.com"
                    data-testid="input-invite-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "admin" | "staff")}>
                    <SelectTrigger id="invite-role" data-testid="select-invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff — limited access (Products, Categories, Brands)</SelectItem>
                      <SelectItem value="admin">Admin — full access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={inviteMutation.isPending} data-testid="button-submit-invite">
                  {inviteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Send Invite
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" data-testid="button-create-staff">
              <Plus className="h-4 w-4 mr-2" />
              Add with Password
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateStaff}>
              <DialogHeader>
                <DialogTitle>Add New Staff Member</DialogTitle>
                <DialogDescription>
                  Create a new staff account with admin panel access
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="staff-name">Full Name</Label>
                  <Input
                    id="staff-name"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="John Smith"
                    data-testid="input-staff-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-email">Email</Label>
                  <Input
                    id="staff-email"
                    type="email"
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    placeholder="staff@pharmaoasis.com"
                    data-testid="input-staff-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-password">Password</Label>
                  <Input
                    id="staff-password"
                    type="password"
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    data-testid="input-staff-password"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createStaffMutation.isPending} data-testid="button-submit-staff">
                  {createStaffMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Staff
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
          data-testid="input-staff-search"
        />
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
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Badge variant="default">{activeStaff.length}</Badge>
              Active Staff
            </h2>
            {activeStaff.length > 0 ? (
              <div className="space-y-4">
                {activeStaff.map((staff) => (
                  <StaffCard
                    key={staff.id}
                    staff={staff}
                    currentUserId={currentUser?.id}
                    onToggleStatus={() => handleToggleStatus(staff)}
                    onChangeRole={(role) => handleChangeRole(staff, role)}
                    onRemove={() => handleRemoveStaff(staff)}
                    onView={() => setSelectedStaff(staff)}
                    isPending={pendingActionId === staff.id}
                  />
                ))}
              </div>
            ) : (
              <Card className="text-center py-8">
                <CardContent>
                  <p className="text-muted-foreground">No active staff members</p>
                </CardContent>
              </Card>
            )}
          </div>

          {inactiveStaff.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Badge variant="secondary">{inactiveStaff.length}</Badge>
                Inactive/Suspended
              </h2>
              <div className="space-y-4">
                {inactiveStaff.map((staff) => (
                  <StaffCard
                    key={staff.id}
                    staff={staff}
                    currentUserId={currentUser?.id}
                    onToggleStatus={() => handleToggleStatus(staff)}
                    onChangeRole={(role) => handleChangeRole(staff, role)}
                    onRemove={() => handleRemoveStaff(staff)}
                    onView={() => setSelectedStaff(staff)}
                    isPending={pendingActionId === staff.id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={!!selectedStaff} onOpenChange={() => setSelectedStaff(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "DM Sans, sans-serif" }}>Staff Details</DialogTitle>
            <DialogDescription>
              View and manage staff member information
            </DialogDescription>
          </DialogHeader>
          {selectedStaff && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{selectedStaff.primaryContactName || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedStaff.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <Badge variant="outline">
                    {roleConfig[selectedStaff.role]?.label || selectedStaff.role}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={statusConfig[selectedStaff.status]?.variant || "secondary"}>
                    {statusConfig[selectedStaff.status]?.label || selectedStaff.status}
                  </Badge>
                </div>
              </div>

              {selectedStaff.id !== currentUser?.id && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Role Management</h4>
                  <div className="flex items-center gap-4">
                    <Select
                      value={selectedStaff.role}
                      onValueChange={(value) => {
                        handleChangeRole(selectedStaff, value);
                        setSelectedStaff({ ...selectedStaff, role: value });
                      }}
                      disabled={pendingActionId === selectedStaff.id}
                    >
                      <SelectTrigger className="w-40" data-testid="select-staff-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      {selectedStaff.role === "admin" 
                        ? "Full admin access" 
                        : "Limited access (Products, Categories, Brands)"}
                    </p>
                  </div>
                </div>
              )}

              <div className="border-t pt-4 text-xs text-muted-foreground">
                Joined: {format(new Date(selectedStaff.createdAt), "PPpp")}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedStaff(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface StaffCardProps {
  staff: StaffUser;
  currentUserId?: number;
  onToggleStatus: () => void;
  onChangeRole: (role: string) => void;
  onRemove: () => void;
  onView: () => void;
  isPending: boolean;
}

function StaffCard({ staff, currentUserId, onToggleStatus, onChangeRole, onRemove, onView, isPending }: StaffCardProps) {
  const status = statusConfig[staff.status] || { label: staff.status, variant: "secondary" as const };
  const role = roleConfig[staff.role] || roleConfig.staff;
  const RoleIcon = role.icon;
  const isSelf = staff.id === currentUserId;

  return (
    <Card data-testid={`card-staff-${staff.id}`}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <RoleIcon className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium truncate">
                {staff.primaryContactName || staff.email}
                {isSelf && <span className="text-muted-foreground ml-2">(You)</span>}
              </h3>
              <Badge variant={status.variant}>{status.label}</Badge>
              <Badge variant="outline">{role.label}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {staff.email}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Joined {format(new Date(staff.createdAt), "MMM d, yyyy")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!isSelf && (
              <>
                <Select
                  value={staff.role}
                  onValueChange={onChangeRole}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-28" data-testid={`select-role-${staff.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  variant={staff.status === "active" ? "outline" : "default"}
                  onClick={onToggleStatus}
                  disabled={isPending}
                  data-testid={`button-toggle-status-${staff.id}`}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : staff.status === "active" ? (
                    <>
                      <UserX className="h-4 w-4 mr-1" />
                      Suspend
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4 mr-1" />
                      Activate
                    </>
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={onRemove}
                  disabled={isPending}
                  data-testid={`button-remove-${staff.id}`}
                >
                  Remove
                </Button>
              </>
            )}

            <Button size="sm" variant="outline" onClick={onView} data-testid={`button-view-${staff.id}`}>
              <Eye className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">View</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
