import { ClipboardList } from "lucide-react";

export default function PortalOrdersPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Orders</h1>
      <div className="flex flex-col items-center py-20 text-muted-foreground">
        <ClipboardList className="h-12 w-12 mb-3" />
        <p>Your placed orders will appear here.</p>
      </div>
    </div>
  );
}
