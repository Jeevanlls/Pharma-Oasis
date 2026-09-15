import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  PoundSterling, Loader2, Plus, X, AlertTriangle, CheckCircle2, Search,
} from "lucide-react";

/**
 * Rates — what we charge, and to whom.
 *
 * The margin used to live on each of sixty price lists, which meant the answer
 * to "what do we charge?" was sixty answers you had to go and read. A rate card
 * holds the decision once; the lists are generated from it. An exception is one
 * brand for one customer at its own rate, and a house-wide change never touches
 * one — that is the whole reason this page exists.
 */

interface CardRow {
  id: number;
  name: string;
  marginPercent: string;
  isDefault: boolean;
  customers: number;
  lists: number;
  missingLists: number;
}
interface ExceptionRow {
  customerId: number;
  customer: string;
  brandId: number;
  brand: string;
  marginPercent: string;
  cardMarginPercent: string | null;
  cardName: string | null;
  note: string | null;
}
interface Summary {
  houseMargin: string | null;
  cards: CardRow[];
  exceptions: ExceptionRow[];
  customersWithoutCard: number;
  brandsPriced: number;
}
interface AppUser {
  id: number; email: string; role: string; status: string;
  companyName: string | null; primaryContactName: string | null;
}
interface PricingBrand { id: number; name: string; }

const custName = (c: AppUser) => c.companyName?.trim() || c.primaryContactName?.trim() || c.email;
const pct = (v: string | null | undefined) => (v === null || v === undefined ? "—" : `${Number(v).toFixed(2).replace(/\.00$/, "")}%`);

async function send(method: string, url: string, body?: unknown) {
  const r = await fetch(url, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || "Failed");
  return r.json();
}

export default function RatesPage() {
  const { toast } = useToast();
  const { data: summary, refetch } = useQuery<Summary>({ queryKey: ["/api/admin/rates/summary"] });
  const { data: users = [] } = useQuery<AppUser[]>({ queryKey: ["/api/admin/users"] });
  const { data: brands = [] } = useQuery<PricingBrand[]>({ queryKey: ["/api/admin/pricing-brands"] });

  const customers = useMemo(
    () => users.filter((u) => u.role === "customer" && u.status === "active").sort((a, b) => custName(a).localeCompare(custName(b))),
    [users],
  );

  const [editing, setEditing] = useState<number | null>(null);
  const [draftMargin, setDraftMargin] = useState("");
  const [newName, setNewName] = useState("");
  const [newMargin, setNewMargin] = useState("");
  const [moveCardId, setMoveCardId] = useState<string>("");
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [custSearch, setCustSearch] = useState("");
  const [exCustomer, setExCustomer] = useState<string>("");
  const [exBrand, setExBrand] = useState<string>("");
  const [exMargin, setExMargin] = useState("");
  const [exNote, setExNote] = useState("");

  async function reload() {
    await refetch();
    await queryClient.invalidateQueries({ queryKey: ["/api/admin/v2/price-lists"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/admin/v2/assignments"] });
  }

  const adopt = useMutation({
    mutationFn: () => send("POST", "/api/admin/rates/adopt"),
    onSuccess: async (r) => {
      await reload();
      toast({ title: "House rate set up", description: `${r.adopted} existing list(s) adopted, ${r.placed} customer(s) placed.` });
    },
    onError: (e: any) => toast({ title: "Setup failed", description: e.message, variant: "destructive" }),
  });

  const saveMargin = useMutation({
    mutationFn: ({ id, margin }: { id: number; margin: number }) =>
      send("PATCH", `/api/admin/rates/cards/${id}`, { marginPercent: margin }),
    onSuccess: async (r: any) => {
      setEditing(null);
      await reload();
      toast({ title: `${r.repriced ?? 0} price(s) changed`, description: `Across ${r.lists ?? 0} list(s).` });
    },
    onError: (e: any) => toast({ title: "Could not change the rate", description: e.message, variant: "destructive" }),
  });

  const createCard = useMutation({
    mutationFn: () => send("POST", "/api/admin/rates/cards", { name: newName, marginPercent: Number(newMargin) }),
    onSuccess: async (r: any) => {
      setNewName(""); setNewMargin("");
      await reload();
      toast({ title: `${r.card.name} created`, description: `${r.built} brand list(s) built at ${newMargin}%.` });
    },
    onError: (e: any) => toast({ title: "Could not create it", description: e.message, variant: "destructive" }),
  });

  const moveCustomers = useMutation({
    mutationFn: () =>
      send("POST", "/api/admin/rates/customers", {
        rateCardId: Number(moveCardId),
        customerIds: Array.from(picked),
      }),
    onSuccess: async (r: any) => {
      setPicked(new Set());
      await reload();
      toast({ title: `${r.moved} customer(s) moved` });
    },
    onError: (e: any) => toast({ title: "Could not move them", description: e.message, variant: "destructive" }),
  });

  const addException = useMutation({
    mutationFn: () =>
      send("POST", "/api/admin/rates/exceptions", {
        customerId: Number(exCustomer),
        brandId: Number(exBrand),
        marginPercent: Number(exMargin),
        note: exNote || null,
      }),
    onSuccess: async () => {
      setExCustomer(""); setExBrand(""); setExMargin(""); setExNote("");
      await reload();
      toast({ title: "Rate saved" });
    },
    onError: (e: any) => toast({ title: "Could not save it", description: e.message, variant: "destructive" }),
  });

  const dropException = useMutation({
    mutationFn: ({ customerId, brandId }: { customerId: number; brandId: number }) =>
      send("DELETE", `/api/admin/rates/exceptions?customerId=${customerId}&brandId=${brandId}`),
    onSuccess: async () => {
      await reload();
      toast({ title: "Back on their rate card" });
    },
    onError: (e: any) => toast({ title: "Could not remove it", description: e.message, variant: "destructive" }),
  });

  const shown = customers.filter((c) =>
    !custSearch.trim() || custName(c).toLowerCase().includes(custSearch.trim().toLowerCase()),
  );

  const noCards = summary && summary.cards.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PoundSterling className="h-6 w-6 text-emerald-600" /> Rates
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          What we charge, and to whom. A rate card is the decision, held once &mdash; the price lists
          are built from it. A brand negotiated for one customer sits on top as an exception, and a
          change to a card never touches one.{" "}
          <Link href="/admin/pricing-guide"><span className="underline cursor-pointer">How it all works</span></Link>.
        </p>
      </div>

      {noCards ? (
        <Card className="border-emerald-300">
          <CardContent className="pt-6 space-y-3">
            <p className="text-sm">
              Every brand list is currently at one margin and assigned to everybody &mdash; which is
              a rate card that has never been named. Adopting it gives it a name and a home.
              <strong> No price moves.</strong>
            </p>
            <Button
              onClick={() => adopt.mutate()}
              disabled={adopt.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {adopt.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Set up the house rate from what is already live
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* ---- CARDS ---- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">What we charge</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border divide-y">
            {summary?.cards.map((c) => (
              <div key={c.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
                <div className="min-w-0">
                  <div className="font-medium flex items-center gap-2">
                    {c.name}
                    {c.isDefault ? (
                      <Badge variant="outline" className="text-emerald-700 border-emerald-500">house rate</Badge>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {c.customers} customer{c.customers === 1 ? "" : "s"} · {c.lists} brand list{c.lists === 1 ? "" : "s"}
                    {c.missingLists ? ` · ${c.missingLists} brand(s) not built yet` : ""}
                  </div>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  {editing === c.id ? (
                    <>
                      <Input
                        className="w-24"
                        value={draftMargin}
                        onChange={(e) => setDraftMargin(e.target.value)}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        disabled={saveMargin.isPending}
                        onClick={() => saveMargin.mutate({ id: c.id, margin: Number(draftMargin) })}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {saveMargin.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <span className="text-xl font-semibold tabular-nums">{pct(c.marginPercent)}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setEditing(c.id); setDraftMargin(Number(c.marginPercent).toString()); }}
                      >
                        Change
                      </Button>
                    </>
                  )}
                </div>

                {editing === c.id ? (
                  <p className="w-full text-xs text-amber-700 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Applies to all {c.customers} customer(s) on this card straight away. Negotiated
                    brands below keep their own rate.
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          {summary?.customersWithoutCard ? (
            <p className="text-xs text-amber-700 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              {summary.customersWithoutCard} customer(s) are on no card and can see no prices.
            </p>
          ) : summary ? (
            <p className="text-xs text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Every customer is on a rate.
            </p>
          ) : null}

          <div className="flex flex-wrap items-end gap-3 pt-2 border-t">
            <div className="space-y-1">
              <Label htmlFor="new-name" className="text-xs">New rate card</Label>
              <Input
                id="new-name"
                className="w-56"
                placeholder="Key account"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-margin" className="text-xs">Margin %</Label>
              <Input id="new-margin" className="w-24" value={newMargin} onChange={(e) => setNewMargin(e.target.value)} />
            </div>
            <Button
              variant="outline"
              disabled={!newName.trim() || !newMargin || createCard.isPending}
              onClick={() => createCard.mutate()}
            >
              {createCard.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Create and build its {summary?.brandsPriced ?? 0} brand lists
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ---- MOVE CUSTOMERS ---- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Put customers on a rate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[14rem]">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search customers…"
                value={custSearch}
                onChange={(e) => setCustSearch(e.target.value)}
              />
            </div>
            <Select value={moveCardId} onValueChange={setMoveCardId}>
              <SelectTrigger className="w-56"><SelectValue placeholder="Move to which rate?" /></SelectTrigger>
              <SelectContent>
                {summary?.cards.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name} — {pct(c.marginPercent)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={!picked.size || !moveCardId || moveCustomers.isPending}
              onClick={() => moveCustomers.mutate()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {moveCustomers.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Move {picked.size || ""}
            </Button>
          </div>

          <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
            {shown.map((c) => (
              <label key={c.id} className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={picked.has(c.id)}
                  onChange={() =>
                    setPicked((prev) => {
                      const next = new Set(prev);
                      if (next.has(c.id)) next.delete(c.id);
                      else next.add(c.id);
                      return next;
                    })
                  }
                />
                <span>{custName(c)}</span>
                <span className="text-muted-foreground text-xs ml-auto">{c.email}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ---- EXCEPTIONS ---- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Negotiated brands {summary?.exceptions.length ? `— ${summary.exceptions.length}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground max-w-3xl">
            One brand, one customer, its own rate. It beats their rate card for that brand and
            nothing else moves it &mdash; putting the house rate up will not undo a deal.
          </p>

          {summary?.exceptions.length ? (
            <div className="rounded-md border divide-y">
              {summary.exceptions.map((e) => (
                <div key={`${e.customerId}-${e.brandId}`} className="px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-medium">{e.customer}</span>
                  <span className="text-muted-foreground">·</span>
                  <span>{e.brand}</span>
                  {e.note ? <span className="text-xs text-muted-foreground">({e.note})</span> : null}
                  <span className="ml-auto tabular-nums font-medium">{pct(e.marginPercent)}</span>
                  {e.cardMarginPercent ? (
                    <span className="text-xs text-muted-foreground">
                      instead of {pct(e.cardMarginPercent)}{e.cardName ? ` (${e.cardName})` : ""}
                    </span>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dropException.mutate({ customerId: e.customerId, brandId: e.brandId })}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              None. Every customer pays their rate card on every brand.
            </p>
          )}

          <div className="flex flex-wrap items-end gap-3 pt-2 border-t">
            <div className="space-y-1">
              <Label className="text-xs">Customer</Label>
              <Select value={exCustomer} onValueChange={setExCustomer}>
                <SelectTrigger className="w-56"><SelectValue placeholder="Which customer?" /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{custName(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Brand</Label>
              <Select value={exBrand} onValueChange={setExBrand}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Which brand?" /></SelectTrigger>
                <SelectContent>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Margin %</Label>
              <Input className="w-24" value={exMargin} onChange={(e) => setExMargin(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Note (optional)</Label>
              <Input className="w-56" placeholder="agreed with RD, Sept" value={exNote} onChange={(e) => setExNote(e.target.value)} />
            </div>
            <Button
              variant="outline"
              disabled={!exCustomer || !exBrand || !exMargin || addException.isPending}
              onClick={() => addException.mutate()}
            >
              {addException.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Save this rate
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Line-by-line prices are still edited in{" "}
        <Link href="/admin/price-builder" className="underline">Price Lists</Link>, and who can see
        what is shown in <Link href="/admin/assignments" className="underline">Who Sees What</Link>.
      </p>
    </div>
  );
}
