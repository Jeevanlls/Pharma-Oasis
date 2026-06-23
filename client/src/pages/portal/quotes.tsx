import { FileText } from "lucide-react";

export default function PortalQuotesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Quotes</h1>
      <div className="flex flex-col items-center py-20 text-muted-foreground">
        <FileText className="h-12 w-12 mb-3" />
        <p>Your quote &amp; availability requests will appear here.</p>
      </div>
    </div>
  );
}
