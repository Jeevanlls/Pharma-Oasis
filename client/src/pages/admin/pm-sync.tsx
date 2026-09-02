import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  RefreshCw, CheckCircle2, AlertTriangle, Loader2, Eye, Download,
  ArrowRight, Barcode, PlugZap,
} from "lucide-react";

/**
 * Step 3b — Sync from Price Manager.
 * Pulls SUPPLIER COSTS from RD's Price Manager and raises draft cost uploads.
 * It never sets a customer price: drafts go to Cost Uploads for review, and the
 * margin is applied later in the Price Builder.
 */

interface Health {
  configured: boolean;
  reachable: boolean;
  brands?: number;
  products?: number;
  error?: string;
}

interface BrandResult {
  pmBrandId: number;
  brand: string;
  category: string | null;
  brandCreated: boolean;
  lines: number;
  noEan: number;
  newCount: number;
  changedCount: number;
  removedCount: number;
  unchangedCount: number;
  duplicateCount: number;
  draftRaised: boolean;
  draftUploadId?: number;
  skipped?: string;
}

interface SyncResult {
  ranAt: string;
  dryRun: boolean;
  pmBrands: number;
  pmProducts: number;
  brandsWithChanges: number;
  draftsRaised: number;
  totalNew: number;
  totalChanged: number;
  totalRemoved: number;
  totalNoEan: number;
  brandsCreated: string[];
  categoriesSeen: string[];
  results: BrandResult[];
}

interface NoEanBrand { brand: string; category: string | null; lines: number }

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "good" | "warn" }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div
        className={
          "text-2xl font-semibold tabular-nums " +
          (tone === "warn" ? "text-amber-600" : tone === "good" ? "text-emerald-600" : "")
        }
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

export default function AdminPmSyncPage() {
  const { toast } = useToast();
  const [result, setResult] = useState<SyncResult | null>(null);
  const [showNoEan, setShowNoEan] = useState(false);

  const { data: health, isLoading: healthLoading } = useQuery<Health>({
    queryKey: ["/api/admin/v2/pm-sync/health"],
  });

  const { data: noEan } = useQuery<{ brands: NoEanBrand[] }>({
    queryKey: ["/api/admin/v2/pm-sync/no-ean"],
    enabled: showNoEan && !!health?.reachable,
  });

  const preview = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/v2/pm-sync/preview", { credentials: "include" });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || "Preview failed");
      return (await r.json()) as SyncResult;
    },
    onSuccess: (res) => {
      setResult(res);
      toast({
        title: "Preview only — nothing written",
        description: `${res.brandsWithChanges} brand(s) would raise a draft.`,
      });
    },
    onError: (e: any) => toast({ title: "Preview failed", description: e.message, variant: "destructive" }),
  });

  const run = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/admin/v2/pm-sync/run", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || "Sync failed");
      return (await r.json()) as SyncResult;
    },
    onSuccess: async (res) => {
      setResult(res);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/cost-uploads"] });
      toast({
        title: `${res.draftsRaised} draft(s) raised`,
        description: "Review them in Cost Uploads before anything reaches a customer.",
      });
    },
    onError: (e: any) => toast({ title: "Sync failed", description: e.message, variant: "destructive" }),
  });

  const busy = preview.isPending || run.isPending;
  const changed = result?.results.filter((r) => r.draftRaised) ?? [];
  const unchanged = result?.results.filter((r) => !r.draftRaised) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <RefreshCw className="h-6 w-6 text-emerald-600" /> Sync from Price Manager
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          <strong>Step 3b.</strong> Brings in supplier <strong>costs</strong> — what we buy at. It never sets a
          customer price. Anything that changed arrives as a <strong>draft</strong> in{" "}
          <Link href="/admin/cost-uploads" className="underline">Cost Uploads</Link> for you to check and publish.
        </p>
      </div>

      {/* connection */}
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
                Not connected yet. The read-only Price Manager connection string needs adding as{" "}
                <code className="text-xs">PM_DATABASE_URL</code> in Render → Environment.
              </span>
            </div>
          ) : !health.reachable ? (
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <span>Configured, but could not read Price Manager: {health.error}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Connected — <strong>{health.brands}</strong> brands and{" "}
                <strong>{health.products?.toLocaleString()}</strong> active products in Price Manager.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy || !health?.reachable} onClick={() => preview.mutate()}>
          {preview.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Eye className="h-4 w-4 mr-1" />}
          Preview changes
        </Button>
        <Button
          disabled={busy || !health?.reachable}
          onClick={() => run.mutate()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {run.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
          Sync now
        </Button>
        <Button variant="ghost" disabled={!health?.reachable} onClick={() => setShowNoEan((v) => !v)}>
          <Barcode className="h-4 w-4 mr-1" /> {showNoEan ? "Hide" : "Show"} lines with no barcode
        </Button>
      </div>
      <p className="text-xs text-muted-foreground -mt-3">
        Preview writes nothing at all. Sync now only creates drafts — no customer price moves until you publish one.
      </p>

      {showNoEan && noEan?.brands?.length ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Lines Price Manager holds with no barcode</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              These cannot be priced yet. Send this list to RD — the fix belongs in Price Manager.
            </p>
            <div className="divide-y">
              {noEan.brands.map((b) => (
                <div key={b.brand} className="flex items-center justify-between py-1.5 text-sm">
                  <span>
                    {b.brand}
                    {b.category ? <span className="text-muted-foreground"> · {b.category}</span> : null}
                  </span>
                  <span className="tabular-nums font-medium">{b.lines}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {result ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Brands in Price Manager" value={result.pmBrands} />
            <Stat label="Active products read" value={result.pmProducts.toLocaleString()} />
            <Stat label="Brands with changes" value={result.brandsWithChanges} tone="good" />
            <Stat label="Lines with no barcode" value={result.totalNoEan} tone={result.totalNoEan ? "warn" : undefined} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="New products" value={result.totalNew} />
            <Stat label="Cost changes" value={result.totalChanged} />
            <Stat label="Dropped by supplier" value={result.totalRemoved} />
          </div>

          {result.dryRun ? (
            <div className="rounded-md border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm">
              This was a <strong>preview</strong>. Nothing has been written. Press <strong>Sync now</strong> to raise
              the drafts.
            </div>
          ) : (
            <div className="rounded-md border-l-4 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-sm flex items-center gap-2">
              <span>
                <strong>{result.draftsRaised}</strong> draft(s) raised. Nothing is live until you publish them.
              </span>
              <Link href="/admin/cost-uploads" className="underline inline-flex items-center gap-1">
                Go to Cost Uploads <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}

          {result.brandsCreated.length ? (
            <p className="text-sm text-muted-foreground">
              New brand(s) added from Price Manager: {result.brandsCreated.join(", ")}
            </p>
          ) : null}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {changed.length} brand(s) with changes
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b">
                    <th className="py-2 pr-3">Brand</th>
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3 text-right">Lines</th>
                    <th className="py-2 pr-3 text-right">New</th>
                    <th className="py-2 pr-3 text-right">Changed</th>
                    <th className="py-2 pr-3 text-right">Dropped</th>
                    <th className="py-2 pr-3 text-right">No barcode</th>
                  </tr>
                </thead>
                <tbody>
                  {changed.map((r) => (
                    <tr key={r.pmBrandId} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">
                        {r.brand}{" "}
                        {r.brandCreated ? <Badge variant="outline" className="ml-1 text-xs">new</Badge> : null}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{r.category ?? "—"}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{r.lines}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{r.newCount || "—"}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{r.changedCount || "—"}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{r.removedCount || "—"}</td>
                      <td className="py-2 pr-3 text-right tabular-nums text-amber-600">{r.noEan || "—"}</td>
                    </tr>
                  ))}
                  {!changed.length ? (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-muted-foreground">
                        Nothing has moved since the last sync.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {unchanged.length ? (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">
                {unchanged.length} brand(s) with nothing to do
              </summary>
              <div className="mt-2 divide-y">
                {unchanged.map((r) => (
                  <div key={r.pmBrandId} className="flex items-center justify-between py-1.5">
                    <span>{r.brand}</span>
                    <span className="text-muted-foreground text-xs">{r.skipped}</span>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
