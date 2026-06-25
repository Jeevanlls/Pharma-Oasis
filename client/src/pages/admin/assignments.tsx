import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Search, Coins, ArrowRight } from "lucide-react";

interface Assignment {
  brandId: number | null;
  brandName: string | null;
  priceListId: number;
  listName: string | null;
  listStatus: string | null;
  customerId: number;
  customerEmail: string;
  customerCompany: string | null;
}
interface PriceListSummary {
  id: number; name: string; brandId: number | null; brandName: string | null;
  status: string; itemCount: number; customerCount: number;
}

const cust = (a: Pick<Assignment, "customerCompany" | "customerEmail">) =>
  a.customerCompany?.trim() || a.customerEmail;

export default function AssignmentsPage() {
  const [search, setSearch] = useState("");
  const { data: assignments = [] } = useQuery<Assignment[]>({ queryKey: ["/api/admin/v2/assignments"] });
  const { data: lists = [] } = useQuery<PriceListSummary[]>({ queryKey: ["/api/admin/v2/price-lists"] });

  // Group: brand -> list -> customers. Seed from all lists so empty lists show up too.
  const grouped = useMemo(() => {
    const brands = new Map<string, { brandName: string; lists: Map<number, { name: string; status: string; customers: Assignment[] }> }>();
    const brandKey = (id: number | null, name: string | null) => `${id ?? "none"}|${name ?? "—"}`;

    for (const l of lists) {
      const bk = brandKey(l.brandId, l.brandName);
      if (!brands.has(bk)) brands.set(bk, { brandName: l.brandName ?? "— (no brand)", lists: new Map() });
      brands.get(bk)!.lists.set(l.id, { name: l.name, status: l.status, customers: [] });
    }
    for (const a of assignments) {
      const bk = brandKey(a.brandId, a.brandName);
      if (!brands.has(bk)) brands.set(bk, { brandName: a.brandName ?? "— (no brand)", lists: new Map() });
      const b = brands.get(bk)!;
      if (!b.lists.has(a.priceListId)) b.lists.set(a.priceListId, { name: a.listName ?? `List #${a.priceListId}`, status: a.listStatus ?? "draft", customers: [] });
      b.lists.get(a.priceListId)!.customers.push(a);
    }
    return Array.from(brands.values()).sort((x, y) => x.brandName.localeCompare(y.brandName));
  }, [assignments, lists]);

  const q = search.trim().toLowerCase();
  const matches = (brandName: string, listName: string, customers: Assignment[]) =>
    !q ||
    brandName.toLowerCase().includes(q) ||
    listName.toLowerCase().includes(q) ||
    customers.some((c) => cust(c).toLowerCase().includes(q) || c.customerEmail.toLowerCase().includes(q));

  const totalCustomers = assignments.length;
  const customersWithAList = new Set(assignments.map((a) => a.customerId)).size;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" /> Customer Assignments
          </h1>
          <p className="text-muted-foreground">
            A clear picture of which customers see which price list, for each brand. A customer can only be on
            one list per brand — change assignments from the <b>Price List Builder</b>.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
          <Badge variant="secondary">{customersWithAList} customer(s) assigned</Badge>
          <Badge variant="secondary">{totalCustomers} assignment(s) across brands</Badge>
        </div>

        <div className="relative max-w-md">
          <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
          <Input className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer, price list, or brand…" data-testid="input-assignments-search" />
        </div>

        {grouped.length === 0 && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            No price lists yet. Create one in the Price List Builder.
          </CardContent></Card>
        )}

        {grouped.map((brand) => {
          const visibleLists = Array.from(brand.lists.values()).filter((l) => matches(brand.brandName, l.name, l.customers));
          if (visibleLists.length === 0) return null;
          return (
            <Card key={brand.brandName}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Coins className="h-4 w-4 text-muted-foreground" /> {brand.brandName}
                </CardTitle>
                <CardDescription>{visibleLists.length} price list(s)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {visibleLists.sort((a, b) => a.name.localeCompare(b.name)).map((l) => (
                  <div key={l.name} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{l.name}</span>
                        <Badge variant={l.status === "published" ? "default" : "secondary"}>{l.status}</Badge>
                        <span className="text-xs text-muted-foreground">{l.customers.length} customer(s)</span>
                      </div>
                    </div>
                    {l.customers.length === 0 ? (
                      <p className="text-xs text-muted-foreground mt-2">No customers assigned yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {l.customers
                          .slice()
                          .sort((a, b) => cust(a).localeCompare(cust(b)))
                          .map((c) => (
                            <Badge key={c.customerId} variant="outline" className="font-normal" title={c.customerEmail}>
                              {cust(c)}
                            </Badge>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}

        <div>
          <Link href="/admin/price-builder">
            <Button variant="outline" size="sm">
              Manage assignments in Price List Builder <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
