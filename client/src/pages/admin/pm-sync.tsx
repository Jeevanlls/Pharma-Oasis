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
  ArrowRight, Barcode, PlugZap, FileSpreadsheet, Tags,
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

interface BrandFlag {
  brand: string;
  productCount: number;
  hex: string;
  reason: string;
}

interface BrandReport {
  ranAt: string;
  distinctSpellings: number;
  productsWithABrand: number;
  productsWithNoBrand: number;
  nonAscii: BrandFlag[];
  corrupted: BrandFlag[];
  nearDuplicates: { normalised: string; spellings: { brand: string; productCount: number }[]; totalProducts: number }[];
  spellingsUnder60Products: number;
}

interface ProductCount {
  total: number;
  archived: number;
}

interface BrandResult {
  pmBrandId: string;
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
  const { data: productCount } = useQuery<ProductCount>({
    queryKey: ["/api/admin/product-count"],
  });

  const [showBrands, setShowBrands] = useState(false);
  const { data: brandReport, isFetching: brandsLoading } = useQuery<BrandReport>({
    queryKey: ["/api/admin/brand-report/summary"],
    enabled: showBrands,
  });

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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Tags className="h-4 w-4" /> Brand list for the Price Manager clean-up
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground max-w-3xl">
            Every distinct brand spelling in the inventory app, with its product count and the exact bytes
            of each name. RD had been reading brands through a search endpoint that only returns the top 25
            matches, so smaller brands never reached him. This reads the database directly, in one pass.
            Nothing is renamed or merged here &mdash; it is a report.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowBrands(true)} disabled={brandsLoading}>
              {brandsLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Eye className="h-4 w-4 mr-1" />}
              Check the brand list
            </Button>
            <a href="/api/admin/brand-report.csv" download>
              <Button variant="outline" size="sm">
                <FileSpreadsheet className="h-4 w-4 mr-1" /> Download brand CSV
              </Button>
            </a>
            <a href="/api/admin/product-export.csv" download>
              <Button variant="outline" size="sm">
                <FileSpreadsheet className="h-4 w-4 mr-1" /> Download full product CSV
              </Button>
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            The product CSV lists every product with its brand, category, pack size, status and
            archived flag &mdash; enough to map products to brands. Trade price, RRP and selling
            price are deliberately left out.
            {productCount ? (
              <>
                {" "}
                <strong>{productCount.total.toLocaleString()}</strong> rows
                {productCount.archived ? <> ({productCount.archived.toLocaleString()} archived)</> : null}.
                It is a large file and takes a moment to start.
              </>
            ) : null}
          </p>

          {brandReport ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-xl font-semibold tabular-nums">{brandReport.distinctSpellings}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Distinct brand spellings</div>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-xl font-semibold tabular-nums">{brandReport.spellingsUnder60Products}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Below RD&rsquo;s search cut-off</div>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-xl font-semibold tabular-nums text-amber-600">
                    {brandReport.nearDuplicates.length}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">Same name, different spelling</div>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-xl font-semibold tabular-nums">{brandReport.productsWithNoBrand}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Products with no brand at all</div>
                </div>
              </div>

              {brandReport.corrupted.length ? (
                <div>
                  <h4 className="text-sm font-medium mb-1">
                    {brandReport.corrupted.length} name(s) genuinely corrupted
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    These hold the Unicode replacement character &mdash; the original letter was already lost
                    before it reached the database, so it has to be retyped.
                  </p>
                  <div className="divide-y text-sm">
                    {brandReport.corrupted.map((b) => (
                      <div key={b.brand} className="flex justify-between gap-3 py-1">
                        <span>{b.brand}</span>
                        <span className="text-muted-foreground text-xs">{b.productCount} products</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 inline mr-1 -mt-0.5" />
                  No corrupted characters. {brandReport.nonAscii.length} name(s) hold real accented letters,
                  stored correctly &mdash; anything that looked broken was broken in transit, not in the database.
                </p>
              )}

              {brandReport.nearDuplicates.length ? (
                <div>
                  <h4 className="text-sm font-medium mb-1">Spellings that look like the same brand</h4>
                  <div className="divide-y text-sm">
                    {brandReport.nearDuplicates.slice(0, 40).map((g) => (
                      <div key={g.normalised} className="py-1.5">
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          {g.spellings.map((sp) => (
                            <span key={sp.brand}>
                              {sp.brand}{" "}
                              <span className="text-muted-foreground text-xs">({sp.productCount})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {brandReport.nearDuplicates.length > 40 ? (
                    <p className="text-xs text-muted-foreground mt-2">
                      Showing the 40 largest. The CSV has them all.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

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
