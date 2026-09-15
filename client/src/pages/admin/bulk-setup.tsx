import { useState, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  Rocket, Loader2, CheckCircle2, AlertTriangle, Upload, Coins, Users, ArrowRight,
  ChevronDown, Clock, CircleAlert,
} from "lucide-react";

/**
 * Go live.
 *
 * Two questions bring anyone to this page: am I live, and what is stuck? The
 * page answers those first, in sentences, and only then offers the machinery.
 * A step with nothing to do collapses to a single tick — it is not hidden, but
 * it does not compete with the step that needs attention either.
 *
 * Every action still previews before it writes, and every one of them goes
 * through exactly the same code as the per-brand buttons.
 */

interface GoLiveState {
  live: boolean;
  headline: string;
  brandsPriced: number;
  pricesLive: number;
  customersSeeing: number;
  margins: string[];
  steps: {
    costs: { done: number; total: number; blocked: number; drafts: number };
    lists: { built: number; toBuild: number; noCosts: number };
    customers: { withLists: number; total: number };
  };
  todo: {
    key: string;
    text: string;
    detail?: string;
    count: number;
    severity: "blocked" | "waiting" | "todo";
  }[];
}

interface PublishPreview {
  drafts: { uploadId: number; brand: string; rows: number; fromPriceManager: boolean }[];
  fromPriceManager: number;
  other: number;
}

interface Blockers {
  checked: number;
  cleanRepeats: number;
  blocked: {
    uploadId: number;
    brandId: number;
    brand: string;
    rows: number;
    repeated: number;
    conflicts: { ean: string; description: string | null; costs: string[] }[];
  }[];
}

interface BuildPreview {
  rows: { brandId: number; brand: string; action: string; existingListName?: string }[];
  toBuild: number;
  alreadyHaveList: number;
  noCosts: number;
}

interface PriceListSummary {
  id: number; name: string; brandId: number | null; brandName: string | null;
  status: string; itemCount: number; customerCount: number;
}

interface AppUser {
  id: number; email: string; role: string; status: string;
  companyName: string | null; primaryContactName: string | null;
}

interface RefreshPreview {
  stale: number;
  changed: number;
  up: number;
  down: number;
  newProducts: number;
  missing: number;
  handSet: number;
  bigMovers: number;
  brands: {
    listId: number; name: string; brand: string | null;
    changed: number; up: number; down: number; unchanged: number;
    newProducts: number; missing: number; handSet: number;
    bigMovers: { ean: string | null; description: string | null; oldCost: number | null; newCost: number | null; changePercent: number | null }[];
  }[];
}

const custName = (c: AppUser) => c.companyName?.trim() || c.primaryContactName?.trim() || c.email;

const money = (n: number | null) => (n === null ? "—" : n.toFixed(2));

/** A step that has nothing to do collapses to one line; click to open it anyway. */
function Step({
  title,
  status,
  tone = "neutral",
  defaultOpen,
  children,
}: {
  title: string;
  status: string;
  tone?: "done" | "attention" | "neutral";
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 rounded-lg"
      >
        {tone === "done" ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
        ) : tone === "attention" ? (
          <CircleAlert className="h-4 w-4 text-amber-600 shrink-0" />
        ) : (
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="font-medium text-sm">{title}</span>
        <span className="text-sm text-muted-foreground ml-auto text-right">{status}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? <div className="px-4 pb-4 pt-1 space-y-4 border-t">{children}</div> : null}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "good" | "warn" }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className={
        "text-xl font-semibold tabular-nums " +
        (tone === "warn" ? "text-amber-600" : tone === "good" ? "text-emerald-600" : "")
      }>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

async function post(url: string, body: unknown) {
  const r = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || "Failed");
  return r.json();
}

export default function BulkSetupPage() {
  const { toast } = useToast();

  // ---- Step 1: publish costs ----
  const { data: pub, refetch: refetchPub, isFetching: pubLoading } =
    useQuery<PublishPreview>({ queryKey: ["/api/admin/bulk/publish-preview"] });
  const [pubResult, setPubResult] = useState<any>(null);
  const { data: blockers, refetch: refetchBlockers } =
    useQuery<Blockers>({ queryKey: ["/api/admin/bulk/blockers"] });

  const doPublish = useMutation({
    mutationFn: () => post("/api/admin/bulk/publish", {}),
    onSuccess: async (res) => {
      setPubResult(res);
      await refetchPub();
      await refetchBlockers();
      await reloadEverything();
      toast({
        title: `${res.published} brand(s) published`,
        description: res.failed ? `${res.failed} could not publish — see below.` : "Costs are live.",
      });
    },
    onError: (e: any) => toast({ title: "Publish failed", description: e.message, variant: "destructive" }),
  });

  // ---- Step 2: build price lists ----
  const { data: build, refetch: refetchBuild, isFetching: buildLoading } =
    useQuery<BuildPreview>({ queryKey: ["/api/admin/bulk/build-preview"] });
  const [margin, setMargin] = useState("20");
  const [rounding, setRounding] = useState("none");
  const [publishLists, setPublishLists] = useState(true);
  const [buildResult, setBuildResult] = useState<any>(null);

  const doBuild = useMutation({
    mutationFn: () =>
      post("/api/admin/bulk/build-price-lists", {
        marginPercent: Number(margin),
        roundingMode: rounding,
        publish: publishLists,
      }),
    onSuccess: async (res) => {
      setBuildResult(res);
      await refetchBuild();
      await reloadEverything();
      toast({
        title: `${res.built} price list(s) created`,
        description: res.failed ? `${res.failed} failed — see below.` : `At ${margin}% margin.`,
      });
    },
    onError: (e: any) => toast({ title: "Build failed", description: e.message, variant: "destructive" }),
  });

  // ---- Where the whole thing stands, and today's cost movement ----
  const { data: state, refetch: refetchState } =
    useQuery<GoLiveState>({ queryKey: ["/api/admin/bulk/state"] });
  const { data: refresh, refetch: refetchRefresh } =
    useQuery<RefreshPreview>({ queryKey: ["/api/admin/bulk/refresh-preview"] });
  const [refreshResult, setRefreshResult] = useState<any>(null);
  const [showMovers, setShowMovers] = useState(false);

  async function reloadEverything() {
    await Promise.all([
      refetchState(),
      refetchRefresh(),
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bulk/publish-preview"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bulk/blockers"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bulk/build-preview"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/admin/v2/price-lists"] }),
    ]);
  }

  const doRefresh = useMutation({
    mutationFn: () => post("/api/admin/bulk/refresh", {}),
    onSuccess: async (res) => {
      setRefreshResult(res);
      await reloadEverything();
      toast({
        title: `${res.updated} price(s) updated${res.added ? `, ${res.added} added` : ""}`,
        description: res.fixedToReview
          ? `${res.fixedToReview} hand-set price(s) had their cost move — worth a look.`
          : `Across ${res.lists} brand(s).`,
      });
    },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  // ---- Step 2b: change the margin on lists that already exist ----
  // ---- Step 3: assign ----
  const { data: lists = [] } = useQuery<PriceListSummary[]>({ queryKey: ["/api/admin/v2/price-lists"] });
  const { data: users = [] } = useQuery<AppUser[]>({ queryKey: ["/api/admin/users"] });
  const [pickedCustomers, setPickedCustomers] = useState<Set<number>>(new Set());
  const [assignResult, setAssignResult] = useState<any>(null);

  const publishedLists = lists.filter((l) => l.status === "published" && l.brandId != null);
  const customers = users.filter((u) => u.role === "customer" && u.status === "active");

  const doAssign = useMutation({
    mutationFn: () =>
      post("/api/admin/bulk/assign", {
        priceListIds: publishedLists.map((l) => l.id),
        customerIds: Array.from(pickedCustomers),
      }),
    onSuccess: async (res) => {
      setAssignResult(res);
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/v2/assignments"] });
      toast({
        title: `${res.assigned} assignment(s) made`,
        description: res.conflicts
          ? `${res.conflicts} left alone — those customers are already on another list for that brand.`
          : "Every chosen customer now sees every list.",
      });
    },
    onError: (e: any) => toast({ title: "Assign failed", description: e.message, variant: "destructive" }),
  });

  function toggleCustomer(id: number) {
    setPickedCustomers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const summaryMargins = state?.margins.length
    ? `${state.margins.map((m) => `${Number(m).toFixed(2).replace(/\.00$/, "")}%`).join(" / ")}`
    : "—";
  const blocked = state?.todo.filter((t) => t.severity === "blocked") ?? [];
  const actions = state?.todo.filter((t) => t.severity === "todo") ?? [];
  const waiting = state?.todo.filter((t) => t.severity === "waiting") ?? [];

  return (
    <div className="space-y-6">
      {/* ---- WHERE YOU STAND ---------------------------------------------- */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-5 py-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b bg-muted/30">
          <Rocket className="h-5 w-5 text-emerald-600 self-center" />
          <h1 className="text-xl font-semibold">{state?.headline ?? "Pricing"}</h1>
          {state?.margins.length ? (
            <span className="text-sm text-muted-foreground">
              standard margin {state.margins.join(" / ")}%
            </span>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => reloadEverything()}
          >
            Re-check
          </Button>
        </div>

        <div className="grid gap-px bg-border sm:grid-cols-3">
          <div className="bg-card px-5 py-4">
            <div className="text-2xl font-semibold tabular-nums">{state?.brandsPriced ?? "—"}</div>
            <div className="text-xs text-muted-foreground mt-0.5">brands priced</div>
          </div>
          <div className="bg-card px-5 py-4">
            <div className="text-2xl font-semibold tabular-nums">{state?.pricesLive?.toLocaleString() ?? "—"}</div>
            <div className="text-xs text-muted-foreground mt-0.5">prices customers can see</div>
          </div>
          <div className="bg-card px-5 py-4">
            <div className="text-2xl font-semibold tabular-nums">{state?.customersSeeing ?? "—"}</div>
            <div className="text-xs text-muted-foreground mt-0.5">customers with a price list</div>
          </div>
        </div>

        {blocked.length || actions.length || waiting.length ? (
          <div className="border-t divide-y">
            {[...blocked, ...actions].map((t) => (
              <div key={t.key} className="px-5 py-3 flex gap-3">
                {t.severity === "blocked" ? (
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <div className="text-sm font-medium">{t.text}</div>
                  {t.detail ? (
                    <div className="text-xs text-muted-foreground mt-0.5">{t.detail}</div>
                  ) : null}
                </div>
              </div>
            ))}
            {waiting.length ? (
              <div className="px-5 py-3 text-xs text-muted-foreground">
                Waiting on someone else:{" "}
                {waiting.map((t) => t.text).join(" · ")}
              </div>
            ) : null}
          </div>
        ) : state ? (
          <div className="border-t px-5 py-3 text-sm text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Nothing needs you.
          </div>
        ) : null}
      </div>

      {/* ---- THE DAILY RUN ------------------------------------------------ */}
      <Card className={refresh?.stale ? "border-emerald-300" : undefined}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Coins className="h-4 w-4" /> Today&rsquo;s cost changes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground max-w-3xl">
            A price list holds the cost it was built from, so a published cost does not reach a
            customer by itself. This carries it across &mdash; at each list&rsquo;s own margin,
            leaving hand-set prices alone.
          </p>

          {refresh && refresh.changed + refresh.newProducts === 0 ? (
            <p className="text-sm text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Every customer price matches the latest published cost.
            </p>
          ) : refresh ? (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                <Stat label="Prices changing" value={refresh.changed} tone="good" />
                <Stat label="Up" value={refresh.up} />
                <Stat label="Down" value={refresh.down} />
                <Stat label="New products to add" value={refresh.newProducts} tone={refresh.newProducts ? "good" : undefined} />
              </div>

              {refresh.bigMovers || refresh.missing || refresh.handSet ? (
                <p className="text-xs text-muted-foreground">
                  {refresh.bigMovers ? `${refresh.bigMovers} cost(s) moved more than 25%. ` : ""}
                  {refresh.missing ? `${refresh.missing} line(s) have left the supplier file — they keep their last price rather than vanishing. ` : ""}
                  {refresh.handSet ? `${refresh.handSet} hand-set price(s) had their cost move and will not change on their own.` : ""}
                </p>
              ) : null}

              <div className="rounded-md border divide-y">
                {refresh.brands.slice(0, 12).map((b) => (
                  <div key={b.listId} className="px-3 py-2 flex flex-wrap items-baseline gap-x-3 text-sm">
                    <span className="font-medium">{b.brand ?? b.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {b.changed} changing
                      {b.up ? `, ${b.up} up` : ""}
                      {b.down ? `, ${b.down} down` : ""}
                      {b.newProducts ? `, ${b.newProducts} new` : ""}
                      {b.missing ? `, ${b.missing} gone` : ""}
                    </span>
                    {b.bigMovers.length ? (
                      <span className="text-xs text-amber-700 ml-auto">
                        {b.bigMovers.length} big move{b.bigMovers.length === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </div>
                ))}
                {refresh.brands.length > 12 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    &hellip; and {refresh.brands.length - 12} more brands
                  </div>
                ) : null}
              </div>

              {refresh.bigMovers ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setShowMovers((v) => !v)}>
                    {showMovers ? "Hide" : "Check"} the {refresh.bigMovers} big move{refresh.bigMovers === 1 ? "" : "s"}
                  </Button>
                  {showMovers ? (
                    <div className="rounded-md border bg-amber-50 divide-y divide-amber-200">
                      {refresh.brands.flatMap((b) =>
                        b.bigMovers.map((m) => (
                          <div key={`${b.listId}-${m.ean}`} className="px-3 py-1.5 text-xs flex flex-wrap gap-x-3">
                            <span className="font-mono">{m.ean}</span>
                            <span className="truncate max-w-md">{m.description}</span>
                            <span className="ml-auto tabular-nums">
                              {money(m.oldCost)} &rarr; {money(m.newCost)}
                              <span className={(m.changePercent ?? 0) > 0 ? "text-red-700 ml-2" : "text-emerald-700 ml-2"}>
                                {(m.changePercent ?? 0) > 0 ? "+" : ""}{m.changePercent?.toFixed(1)}%
                              </span>
                            </span>
                          </div>
                        )),
                      )}
                    </div>
                  ) : null}
                </>
              ) : null}

              <Button
                disabled={doRefresh.isPending}
                onClick={() => doRefresh.mutate()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {doRefresh.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                {refresh.changed && refresh.newProducts
                  ? `Update ${refresh.changed} price(s) and add ${refresh.newProducts} product(s)`
                  : refresh.newProducts
                    ? `Add ${refresh.newProducts} new product(s) to the lists`
                    : `Send ${refresh.changed} new price(s) to customers`}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Checking&hellip;</p>
          )}

          {refreshResult ? (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-medium">
                {refreshResult.updated} price(s) updated
                {refreshResult.added ? `, ${refreshResult.added} product(s) added` : ""} across{" "}
                {refreshResult.lists} brand(s)
                {refreshResult.failed ? `, ${refreshResult.failed} failed` : ""}
              </p>
              {refreshResult.fixedToReview ? (
                <p className="text-xs text-amber-700 mt-1">
                  {refreshResult.fixedToReview} hand-set price(s) kept their value while the cost
                  underneath moved. Check those in{" "}
                  <Link href="/admin/price-lists" className="underline">Price Lists</Link>.
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="pt-1">
        <h2 className="text-sm font-semibold text-muted-foreground">Setup &mdash; occasional</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          New brands, a margin change, a new customer. Open one when you need it.
        </p>
      </div>

      {/* STEP 1 */}
      <Step
        title="Publish new supplier costs"
        status={
          blockers?.blocked.length
            ? `${blockers.blocked.length} brand(s) cannot publish`
            : pub?.drafts.length
              ? `${pub.drafts.length} waiting`
              : "nothing waiting"
        }
        tone={blockers?.blocked.length ? "attention" : pub?.drafts.length ? "neutral" : "done"}
        defaultOpen={!!blockers?.blocked.length || !!pub?.drafts.length}
      >
          <p className="text-sm text-muted-foreground max-w-3xl">
            Publishing a cost upload is what turns a draft into the brand&rsquo;s live buying price.
            Until that happens a price list has nothing to build from, so this comes first.
            Rows with no barcode are dropped; rows with a barcode but no cost are kept and show to
            the customer as <strong>price on request</strong>.
          </p>

          {pub ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Drafts from Price Manager" value={pub.fromPriceManager} tone="good" />
              <Stat label="Drafts from a file upload" value={pub.other} />
              <Stat label="Total waiting" value={pub.drafts.length} />
            </div>
          ) : null}

          {blockers?.blocked.length ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-3">
              <p className="text-sm font-medium flex items-center gap-1.5 text-amber-900">
                <AlertTriangle className="h-4 w-4" />
                {blockers.blocked.length} brand(s) will not publish
              </p>
              <p className="text-xs text-amber-900/80 max-w-3xl">
                In each of these the same barcode appears twice at two different costs, so there is
                no way to tell which price is right. A barcode repeated at the <em>same</em> cost is
                fine &mdash; publishing folds those away by itself. Send the lines below to whoever
                maintains Price Manager, then re-sync and publish again.
              </p>
              {blockers.blocked.map((b) => (
                <div key={b.uploadId} className="text-sm">
                  <div className="font-medium">
                    {b.brand}{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      &mdash; {b.conflicts.length} clash{b.conflicts.length === 1 ? "" : "es"} in {b.rows} rows
                    </span>
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {b.conflicts.slice(0, 8).map((c) => (
                      <li key={c.ean} className="text-xs flex flex-wrap gap-x-2">
                        <span className="font-mono">{c.ean}</span>
                        <span className="text-muted-foreground truncate max-w-xs">{c.description ?? ""}</span>
                        <span className="text-red-700">{c.costs.join("  vs  ")}</span>
                      </li>
                    ))}
                    {b.conflicts.length > 8 ? (
                      <li className="text-xs text-muted-foreground">
                        &hellip; and {b.conflicts.length - 8} more
                      </li>
                    ) : null}
                  </ul>
                </div>
              ))}
            </div>
          ) : blockers && blockers.checked ? (
            <p className="text-sm text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              All {blockers.checked} waiting draft(s) will publish cleanly.
            </p>
          ) : null}

          <Button
            disabled={doPublish.isPending || pubLoading || !pub?.drafts.length}
            onClick={() => doPublish.mutate()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {doPublish.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            Publish all {pub?.drafts.length ?? 0} drafts
          </Button>

          {pubResult ? (
            <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
              <p className="font-medium">
                {pubResult.published} published{pubResult.failed ? `, ${pubResult.failed} failed` : ""}
                {pubResult.results.reduce((n: number, r: any) => n + (r.collapsed ?? 0), 0)
                  ? `, ${pubResult.results.reduce((n: number, r: any) => n + (r.collapsed ?? 0), 0)} repeated row(s) folded away`
                  : ""}
              </p>
              {pubResult.results
                .filter((r: any) => !r.ok)
                .map((r: any) => (
                  <div key={r.uploadId} className="flex justify-between gap-3">
                    <span>{r.brand}</span>
                    <span className="text-red-600 text-xs text-right">{r.error}</span>
                  </div>
                ))}
            </div>
          ) : null}
      </Step>

      {/* STEP 2 */}
      <Step
        title="Build a price list for a new brand"
        status={
          build?.toBuild
            ? `${build.toBuild} brand(s) have costs but no list`
            : `${build?.alreadyHaveList ?? 0} built`
        }
        tone={build?.toBuild ? "attention" : "done"}
        defaultOpen={!!build?.toBuild}
      >
          <p className="text-sm text-muted-foreground max-w-3xl">
            One list per brand, at the same margin. A brand that already has a list is left
            alone &mdash; rebuilding would either duplicate it or throw away prices you had tweaked
            by hand. A brand with no live costs is skipped until it has some.
          </p>

          {build ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Will get a new list" value={build.toBuild} tone="good" />
              <Stat label="Already have a list" value={build.alreadyHaveList} />
              <Stat label="No live costs yet" value={build.noCosts} tone={build.noCosts ? "warn" : undefined} />
            </div>
          ) : null}

          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label htmlFor="margin" className="text-xs">Margin %</Label>
              <Input
                id="margin"
                className="w-24"
                value={margin}
                onChange={(e) => setMargin(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rounding" className="text-xs">Price endings</Label>
              <select
                id="rounding"
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={rounding}
                onChange={(e) => setRounding(e.target.value)}
              >
                <option value="none">Exact — keep 2 decimals</option>
                <option value="charm_x9">Nearest ending in 9p</option>
                <option value="charm_99">Always end .99</option>
                <option value="charm_49_99">End .49 or .99</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pb-1">
              <Switch id="publish-lists" checked={publishLists} onCheckedChange={setPublishLists} />
              <Label htmlFor="publish-lists" className="text-sm">Publish them straight away</Label>
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            A list has to be published before it can be assigned. Leave this off if you would rather
            check a few by hand in the Price List Builder first.
          </p>

          <Button
            disabled={doBuild.isPending || buildLoading || !build?.toBuild}
            onClick={() => doBuild.mutate()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {doBuild.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            Create {build?.toBuild ?? 0} price lists at {margin}%
          </Button>

          {buildResult ? (
            <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
              <p className="font-medium">
                {buildResult.built} created{buildResult.failed ? `, ${buildResult.failed} failed` : ""}
              </p>
              {buildResult.results
                .filter((r: any) => !r.ok || (r.onRequest ?? 0) > 0)
                .slice(0, 30)
                .map((r: any) => (
                  <div key={r.brandId} className="flex justify-between gap-3">
                    <span>{r.brand}</span>
                    <span className={r.ok ? "text-amber-700 text-xs text-right" : "text-red-600 text-xs text-right"}>
                      {r.ok ? `${r.onRequest} line(s) with no cost — price on request` : r.error}
                    </span>
                  </div>
                ))}
            </div>
          ) : null}
      </Step>

      {/* STEP 2b — moved to its own page */}
      <Step
        title="Change what we charge"
        status={summaryMargins}
        tone="neutral"
      >
        <p className="text-sm text-muted-foreground max-w-3xl">
          Margins moved to <Link href="/admin/rates" className="underline font-medium">Rates</Link>,
          where a rate lives once instead of once per list &mdash; so you can see every rate on one
          screen, change one for everybody on it, and give a customer their own rate on a brand
          without a house-wide change ever undoing it.
        </p>
        <Link href="/admin/rates">
          <Button variant="outline">Open Rates</Button>
        </Link>
      </Step>

      {/* STEP 3 */}
      <Step
        title="Give a customer the price lists"
        status={`${publishedLists.length} list(s) · ${customers.length} customer(s)`}
        tone="neutral"
      >
          <p className="text-sm text-muted-foreground max-w-3xl">
            Assigns every <strong>published</strong> brand list to the customers you pick. A customer
            already on a different list for a brand is left exactly where they are and reported as a
            conflict &mdash; those are usually your negotiated rates, and this must not overwrite them.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="Published brand lists" value={publishedLists.length} tone="good" />
            <Stat label="Customers selected" value={pickedCustomers.size} />
          </div>

          {customers.length ? (
            <>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPickedCustomers(new Set(customers.map((c) => c.id)))}
                >
                  Select all {customers.length}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPickedCustomers(new Set())}>
                  Clear
                </Button>
              </div>
              <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
                {customers.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pickedCustomers.has(c.id)}
                      onChange={() => toggleCustomer(c.id)}
                    />
                    <span>{custName(c)}</span>
                    <span className="text-muted-foreground text-xs ml-auto">{c.email}</span>
                  </label>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No active customer logins yet — create them in{" "}
              <Link href="/admin/customer-sync" className="underline">Customer Logins</Link>.
            </p>
          )}

          <Button
            disabled={doAssign.isPending || !pickedCustomers.size || !publishedLists.length}
            onClick={() => doAssign.mutate()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {doAssign.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            Assign {publishedLists.length} list(s) to {pickedCustomers.size} customer(s)
          </Button>

          {assignResult ? (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-medium">
                {assignResult.assigned} assigned
                {assignResult.conflicts ? `, ${assignResult.conflicts} left on their existing list` : ""}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Check the detail in{" "}
                <Link href="/admin/assignments" className="underline">Who Sees What</Link>.
              </p>
            </div>
          ) : null}
      </Step>

      <p className="text-xs text-muted-foreground">
        Everything here runs the same code as the per-brand buttons in Cost Uploads, Price Lists and
        Who Sees What &mdash; it just does sixty at a time.
      </p>
    </div>
  );
}
