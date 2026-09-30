import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import type { User, SupplierLead, Quote, Order } from "@shared/schema";

export type WorkspaceUser = Pick<User, "id" | "role" | "status" | "companyName" | "primaryContactName" | "email" | "billingCountry" | "createdAt">;
export type WorkspaceSupplier = Pick<SupplierLead, "id" | "status" | "companyName" | "contactName" | "email" | "country" | "createdAt">;
export type WorkspaceOrder = Order & { companyName: string | null; email: string | null };
export interface WorkspaceStats { totalProducts: number; pendingQuotes: number; activeCustomers: number }
export interface OrderStats { newCount: number; toFulfil: number; doneThisWeek: number; activeTotal: number }

export function useWorkspaceAccounts() {
  const { isAdmin } = useAuth();
  const options = { enabled: isAdmin, staleTime: 30_000, refetchOnWindowFocus: true };
  const users = useQuery<WorkspaceUser[]>({ queryKey: ["/api/admin/users"], ...options });
  const suppliers = useQuery<WorkspaceSupplier[]>({ queryKey: ["/api/admin/supplier-leads"], ...options });
  return { users, suppliers };
}

export function useWorkspaceSales() {
  const { isAdmin } = useAuth();
  const options = { enabled: isAdmin, staleTime: 30_000, refetchOnWindowFocus: true };
  const quotes = useQuery<Quote[]>({ queryKey: ["/api/admin/quotes"], ...options });
  const orders = useQuery<WorkspaceOrder[]>({ queryKey: ["/api/admin/orders?archived=false"], ...options });
  const orderStats = useQuery<OrderStats>({ queryKey: ["/api/admin/orders/stats"], ...options });
  const stats = useQuery<WorkspaceStats>({ queryKey: ["/api/admin/stats"], ...options });
  return { quotes, orders, orderStats, stats };
}

export const workspaceLabels: Record<string, string> = {
  pending: "To review", active: "Active", rejected: "Rejected", suspended: "Suspended",
  new: "New application", contacted: "Contacted", qualified: "Qualified", converted: "Converted",
  submitted: "New order", confirmed: "To fulfil", processing: "Processing", completed: "Completed",
  entered: "Entered into inventory", cancelled: "Cancelled", quoted: "Quote sent", accepted: "Accepted",
  declined: "Declined", closed: "Closed",
};

export function workspaceMoney(value: string | number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "Price on request";
  return Number(value).toLocaleString("en-GB", { style: "currency", currency: "GBP" });
}

export function workspaceDate(value: string | Date) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
