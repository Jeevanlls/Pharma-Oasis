import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CheckCircle2, AlertTriangle, Loader2, Send, PlugZap } from "lucide-react";

/**
 * Website requests — what has and has not reached the inventory app.
 *
 * Every price request and order placed on the portal is pushed to
 * app.pharmaoasis.co.uk as an enquiry. The push retries on its own for about a
 * minute and a half; anything still listed here needs a manual nudge, usually
 * because the inventory app was down longer than that.
 *
 * Re-sending is always safe: the inventory app refuses to create the same
 * request twice.
 */

interface Pending {
  id: number;
  createdAt: string | null;
  error: string | null;
}

interface Queue {
  enabled: boolean;
  quotes: Pending[];
  orders: Pending[];
}

const KEY = ["/api/admin/inventory-handoff"];

function when(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export default function WebsiteRequestsPage() {
  const { toast } = useToast();
  const { data, isLoading } = useQuery<Queue>({ queryKey: KEY, refetchInterval: 60_000 });

  const retry = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/inventory-handoff/retry", {});
      return res.json();
    },
    onSuccess: (result: any) => {
      toast({
        title: result.failed > 0 ? "Some are still failing" : "Sent",
        description: result.message,
        variant: result.failed > 0 ? "destructive" : "default",
      });
      queryClient.invalidateQueries({ queryKey: KEY });
    },
    onError: (err: any) =>
      toast({
        title: "Could not send",
        description: err?.message ?? "Please try again",
        variant: "destructive",
      }),
  });

  const quotes = data?.quotes ?? [];
  const orders = data?.orders ?? [];
  const waiting = quotes.length + orders.length;

  return (
    <div className="space-y-6 p-4 sm:p-6" data-testid="page-website-requests">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Website requests</h1>
        <p className="mt-1 text-muted-foreground">
          Price requests and orders placed on pharmaoasis.co.uk become enquiries in the inventory
          app, where a salesperson picks them up. Anything listed here has not got there yet.
        </p>
      </div>

      {data && !data.enabled && (
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="flex items-start gap-3 p-4">
            <PlugZap className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-medium">The link to the inventory app is switched off</p>
              <p className="text-sm text-muted-foreground">
                Nothing is being sent through. Add <code>INVENTORY_API_URL</code> and{" "}
                <code>INVENTORY_API_TOKEN</code> to this service in Render → Environment, then come
                back here and send the backlog.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {waiting === 0 ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            )}
            {isLoading
              ? "Checking…"
              : waiting === 0
                ? "Everything has reached the inventory app"
                : `${waiting} waiting to be sent`}
            {waiting > 0 && (
              <Button
                size="sm"
                className="ml-auto"
                disabled={retry.isPending}
                onClick={() => retry.mutate()}
                data-testid="button-retry-handoff"
              >
                {retry.isPending ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="mr-1 h-4 w-4" />
                    Send them now
                  </>
                )}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {waiting === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">
              Nothing outstanding. Every quote request and order has an enquiry against it.
            </p>
          ) : (
            <ul className="divide-y">
              {[
                ...orders.map((o) => ({ ...o, kind: "Order" as const })),
                ...quotes.map((q) => ({ ...q, kind: "Price request" as const })),
              ].map((row) => (
                <li key={`${row.kind}-${row.id}`} className="py-3" data-testid={`row-pending-${row.kind}-${row.id}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={row.kind === "Order" ? "default" : "secondary"}>{row.kind}</Badge>
                    <span className="font-medium">#{row.id}</span>
                    <span className="text-sm text-muted-foreground">{when(row.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-amber-700 dark:text-amber-500">
                    {row.error ?? "Not sent yet."}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
