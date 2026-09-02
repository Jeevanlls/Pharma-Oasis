import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  Users, CheckCircle2, AlertTriangle, Loader2, Send, PlugZap, Search, Mail, Link2,
} from "lucide-react";

/**
 * Customer logins — invite approved inventory customers to the portal.
 * No password is ever emailed: each invite is a one-time link where the
 * customer sets their own.
 */

type State = "ready" | "linked" | "link_only" | "no_email" | "duplicate_email";

interface Row {
  inventoryCustomerId: number;
  company: string | null;
  contact: string | null;
  email: string | null;
  customerNumber: string | null;
  state: State;
  portalUserId?: number;
  note?: string;
}

interface Preview {
  ranAt: string;
  inventoryCustomers: number;
  ready: number;
  linked: number;
  linkOnly: number;
  noEmail: number;
  duplicateEmail: number;
  rows: Row[];
}

interface Health {
  configured: boolean;
  reachable: boolean;
  customers?: number;
  error?: string;
}

interface InviteResult {
  sent: number;
  linked: number;
  failed: number;
  results: { company: string | null; email: string | null; result: string; detail?: string }[];
}

const BATCH = 10;

const LABEL: Record<State, string> = {
  ready: "Ready to invite",
  linked: "Already has a login",
  link_only: "Account exists — link only",
  no_email: "No email address",
  duplicate_email: "Duplicate email",
};

function Stat({ label, value, tone }: { label: string; value: number; tone?: "good" | "warn" }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className={
        "text-2xl font-semibold tabular-nums " +
        (tone === "warn" ? "text-amber-600" : tone === "good" ? "text-emerald-600" : "")
      }>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

export default function AdminCustomerSyncPage() {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [lastRun, setLastRun] = useState<InviteResult | null>(null);

  const { data: health, isLoading: healthLoading } = useQuery<Health>({
    queryKey: ["/api/admin/customer-sync/health"],
  });

  const { data: preview, isLoading: previewLoading, refetch } = useQuery<Preview>({
    queryKey: ["/api/admin/customer-sync/preview"],
    enabled: !!health?.reachable,
  });

  const invite = useMutation({
    mutationFn: async (ids: number[]) => {
      const r = await fetch("/api/admin/customer-sync/invite", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventoryCustomerIds: ids }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || "Invites failed");
      return (await r.json()) as InviteResult;
    },
    onSuccess: async (res) => {
      setLastRun(res);
      setSelected(new Set());
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/customer-sync/preview"] });
      await refetch();
      toast({
        title: `${res.sent} invite(s) sent`,
        description: res.failed ? `${res.failed} failed — see the results below.` : "Customers can now set their own password.",
      });
    },
    onError: (e: any) => toast({ title: "Invites failed", description: e.message, variant: "destructive" }),
  });

  const rows = preview?.rows ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.company ?? "").toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q) ||
        (r.customerNumber ?? "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const actionable = filtered.filter((r) => r.state === "ready" || r.state === "link_only");
  const blocked = filtered.filter((r) => r.state === "no_email" || r.state === "duplicate_email");
  const done = filtered.filter((r) => r.state === "linked");

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectNextBatch() {
    const next = new Set<number>();
    for (const r of actionable) {
      if (next.size >= BATCH) break;
      next.add(r.inventoryCustomerId);
    }
    setSelected(next);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 text-emerald-600" /> Customer logins
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gives an approved customer from the inventory app a login here. They are emailed a link to{" "}
          <strong>set their own password</strong> — no password is ever sent by email. Approval stays in the
          inventory app; nothing is approved twice.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <PlugZap className="h-4 w-4" /> Connection
          </CardTitle>
        </CardHeader>
        <CardContent>
          {healthLoading ? (
            <p className="text-sm text-muted-foreground">Checking…</p>
          ) : !health?.configured ? (
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <span>
                Not connected yet. The inventory read-only connection string needs adding as{" "}
                <code className="text-xs">INVENTORY_DATABASE_URL</code> in Render → Environment.
              </span>
            </div>
          ) : !health.reachable ? (
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <span>Configured, but could not read the inventory app: {health.error}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span><strong>{health.customers}</strong> active customers in the inventory app.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {preview ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Ready to invite" value={preview.ready} tone="good" />
          <Stat label="Already have a login" value={preview.linked} />
          <Stat label="Account exists — link only" value={preview.linkOnly} />
          <Stat label="No email address" value={preview.noEmail} tone={preview.noEmail ? "warn" : undefined} />
          <Stat label="Duplicate email" value={preview.duplicateEmail} tone={preview.duplicateEmail ? "warn" : undefined} />
        </div>
      ) : null}

      {health?.reachable ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[14rem]">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search company, email or customer number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={selectNextBatch} disabled={!actionable.length}>
            Select next {BATCH}
          </Button>
          <Button
            disabled={!selected.size || invite.isPending}
            onClick={() => invite.mutate(Array.from(selected))}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {invite.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
            Send {selected.size ? selected.size : ""} invite{selected.size === 1 ? "" : "s"}
          </Button>
        </div>
      ) : null}

      {lastRun ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Last run — {lastRun.sent} invited, {lastRun.linked} linked
              {lastRun.failed ? `, ${lastRun.failed} failed` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {lastRun.results.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-sm border-b last:border-0 py-1.5">
                <span>{r.company ?? r.email}</span>
                <span className={r.result === "failed" ? "text-red-600" : "text-muted-foreground"}>
                  {r.result}{r.detail ? ` — ${r.detail}` : ""}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {previewLoading ? <p className="text-sm text-muted-foreground">Loading customers…</p> : null}

      {actionable.length ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{actionable.length} customer(s) to action</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b">
                  <th className="py-2 pr-3 w-8"></th>
                  <th className="py-2 pr-3">Company</th>
                  <th className="py-2 pr-3">Contact</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Customer #</th>
                  <th className="py-2 pr-3">What happens</th>
                </tr>
              </thead>
              <tbody>
                {actionable.map((r) => (
                  <tr key={r.inventoryCustomerId} className="border-b last:border-0">
                    <td className="py-2 pr-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${r.company ?? r.email}`}
                        checked={selected.has(r.inventoryCustomerId)}
                        onChange={() => toggle(r.inventoryCustomerId)}
                      />
                    </td>
                    <td className="py-2 pr-3 font-medium">{r.company ?? "—"}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{r.contact ?? "—"}</td>
                    <td className="py-2 pr-3">{r.email}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{r.customerNumber ?? "—"}</td>
                    <td className="py-2 pr-3">
                      {r.state === "ready" ? (
                        <Badge variant="outline" className="text-emerald-700 border-emerald-600">
                          <Mail className="h-3 w-3 mr-1" /> Invite
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <Link2 className="h-3 w-3 mr-1" /> Link only
                        </Badge>
                      )}
                      {r.note ? <span className="block text-xs text-muted-foreground mt-0.5">{r.note}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {blocked.length ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{blocked.length} cannot be invited yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Fix these in the inventory app, then reload this page.
            </p>
            <div className="divide-y">
              {blocked.map((r) => (
                <div key={r.inventoryCustomerId} className="flex items-start justify-between gap-3 py-1.5 text-sm">
                  <span>
                    {r.company ?? "—"}
                    {r.customerNumber ? <span className="text-muted-foreground"> · {r.customerNumber}</span> : null}
                  </span>
                  <span className="text-amber-700 text-xs text-right">{LABEL[r.state]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {done.length ? (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">
            {done.length} customer(s) already have a login
          </summary>
          <div className="mt-2 divide-y">
            {done.map((r) => (
              <div key={r.inventoryCustomerId} className="flex items-center justify-between py-1.5">
                <span>{r.company ?? "—"}</span>
                <span className="text-muted-foreground text-xs">{r.email}</span>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
