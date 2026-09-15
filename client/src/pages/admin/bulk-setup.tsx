import { useState } from "react";
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
} from "lucide-react";

/**
 * Go live — the bulk versions of steps 3, 5 and 6.
 * Publish every cost, build a list for every brand, assign the lists to
 * customers. Each step previews first and writes nothing until you press.
 */

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

interface RepricePreview {
  lists: number;
  onMargin: number;
  handSet: number;
  targets: {
    listId: number; name: string; brand: string | null; status: string;
    currentMargin: string | null; onMargin: number; handSet: number; noCost: number;
  }[];
}

interface PriceListSummary {
  id: number; name: string; brandId: number | null; brandName: string | null;
  status: string; itemCount: number; customerCount: number;
}

interface AppUser {
  id: number; email: string; role: string; status: string;
  companyName: string | null; primaryContactName: string | null;
}

const custName = (c: AppUser) => c.companyName?.trim() || c.primaryContactName?.trim() || c.email;

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
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/bulk/build-preview"] });
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
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/v2/price-lists"] });
      toast({
        title: `${res.built} price list(s) created`,
        description: res.failed ? `${res.failed} failed — see below.` : `At ${margin}% margin.`,
      });
    },
    onError: (e: any) => toast({ title: "Build failed", description: e.message, variant: "destructive" }),
  });

  // ---- Step 2b: change the margin on lists that already exist ----
  const { data: reprice, refetch: refetchReprice } =
    useQuery<RepricePreview>({ queryKey: ["/api/admin/bulk/reprice-preview"] });
  const [newMargin, setNewMargin] = useState("25");
  const [repriceResult, setRepriceResult] = useState<any>(null);
  const [confirmReprice, setConfirmReprice] = useState(false);

  const doReprice = useMutation({
    mutationFn: () => post("/api/admin/bulk/reprice", { marginPercent: Number(newMargin) }),
    onSuccess: async (res) => {
      setRepriceResult(res);
      setConfirmReprice(false);
      await refetchReprice();
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/v2/price-lists"] });
      toast({
        title: `${res.repriced} price(s) changed`,
        description: `${res.lists} list(s) now at ${newMargin}%.`,
      });
    },
    onError: (e: any) => toast({ title: "Reprice failed", description: e.message, variant: "destructive" }),
  });

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Rocket className="h-6 w-6 text-emerald-600" /> Go live
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          The bulk versions of steps 3, 5 and 6 — for when there are sixty brands rather than one.
          Each step shows what it will do before it does it, and each uses exactly the same code as
          the per-brand buttons, so nothing behaves differently here.
        </p>
      </div>

      {/* STEP 1 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" /> 1. Make the costs live
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      {/* STEP 2 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Coins className="h-4 w-4" /> 2. Build a price list for every brand
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      {/* STEP 2b */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Coins className="h-4 w-4" /> Change the margin on lists you already built
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground max-w-3xl">
            Step 2 will not rebuild a brand that already has a list, because rebuilding throws away
            anything you priced by hand. This changes the margin on the lists as they stand instead:
            every line still priced off the margin is recalculated, and every line where you typed a
            price yourself is left exactly where it is.
          </p>

          {reprice ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat label="Lists that would change" value={reprice.lists} tone="good" />
              <Stat label="Prices recalculated" value={reprice.onMargin} />
              <Stat label="Hand-set prices left alone" value={reprice.handSet} />
            </div>
          ) : null}

          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label htmlFor="new-margin" className="text-xs">New margin %</Label>
              <Input
                id="new-margin"
                className="w-24"
                value={newMargin}
                onChange={(e) => { setNewMargin(e.target.value); setConfirmReprice(false); }}
              />
            </div>
            {!confirmReprice ? (
              <Button variant="outline" onClick={() => setConfirmReprice(true)} disabled={!reprice?.lists}>
                Reprice {reprice?.lists ?? 0} list(s) at {newMargin}%
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  disabled={doReprice.isPending}
                  onClick={() => doReprice.mutate()}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {doReprice.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  Yes — change {reprice?.onMargin ?? 0} live price(s)
                </Button>
                <Button variant="ghost" onClick={() => setConfirmReprice(false)}>Cancel</Button>
              </div>
            )}
          </div>
          {confirmReprice ? (
            <p className="text-xs text-amber-700 flex items-center gap-1.5 -mt-2">
              <AlertTriangle className="h-3.5 w-3.5" />
              These lists are published and assigned, so the new prices are what customers see as soon
              as this finishes.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground -mt-2">
              A margin of {newMargin || "x"}% means cost &times; {(1 + (Number(newMargin) || 0) / 100).toFixed(2)}.
              Price endings are left as each list already has them.
            </p>
          )}

          {repriceResult ? (
            <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
              <p className="font-medium">
                {repriceResult.repriced} price(s) changed across {repriceResult.lists} list(s)
                {repriceResult.untouched ? `, ${repriceResult.untouched} left alone` : ""}
                {repriceResult.failed ? `, ${repriceResult.failed} failed` : ""}
              </p>
              {repriceResult.results
                .filter((r: any) => !r.ok)
                .map((r: any) => (
                  <div key={r.listId} className="flex justify-between gap-3">
                    <span>{r.name}</span>
                    <span className="text-red-600 text-xs text-right">{r.error}</span>
                  </div>
                ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* STEP 3 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> 3. Give customers the lists
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground flex items-center gap-1">
        <ArrowRight className="h-4 w-4" />
        Once this is done, sign in as a customer and check the portal shows the right prices.
      </p>
    </div>
  );
}
