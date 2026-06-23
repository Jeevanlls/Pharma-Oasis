import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { FileSpreadsheet, FileText, Download } from "lucide-react";

interface Brand { id: number; name: string; }
interface Category { id: number; name: string; }

function CheckList({ title, items, selected, onToggle, onAll, onClear }: {
  title: string; items: { id: number; name: string }[]; selected: Set<number>;
  onToggle: (id: number) => void; onAll: () => void; onClear: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onAll}>All</Button>
            <Button variant="ghost" size="sm" onClick={onClear}>Clear</Button>
          </div>
        </div>
        <CardDescription>{selected.size === 0 ? "All included" : `${selected.size} selected`}</CardDescription>
      </CardHeader>
      <CardContent className="max-h-72 overflow-auto space-y-1">
        {items.map((it) => (
          <label key={it.id} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
            <Checkbox checked={selected.has(it.id)} onCheckedChange={() => onToggle(it.id)} />
            {it.name}
          </label>
        ))}
      </CardContent>
    </Card>
  );
}

export default function PortalDownloadsPage() {
  const { data: brands = [] } = useQuery<Brand[]>({ queryKey: ["/api/brands"] });
  const { data: categories = [] } = useQuery<Category[]>({ queryKey: ["/api/categories"] });
  const [brandSel, setBrandSel] = useState<Set<number>>(new Set());
  const [catSel, setCatSel] = useState<Set<number>>(new Set());

  const toggle = (set: Set<number>, setter: (s: Set<number>) => void, id: number) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    setter(next);
  };

  const download = (format: "xlsx" | "pdf") => {
    const params = new URLSearchParams();
    params.set("format", format);
    if (brandSel.size) params.set("brands", Array.from(brandSel).join(","));
    if (catSel.size) params.set("categories", Array.from(catSel).join(","));
    window.open(`/api/portal/price-list/download?${params.toString()}`, "_blank");
  };

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Download Price List</h1>
        <p className="text-muted-foreground">Pick brands and/or categories (or leave empty for everything), then download at your account prices.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CheckList title="Brands" items={brands} selected={brandSel}
          onToggle={(id) => toggle(brandSel, setBrandSel, id)} onAll={() => setBrandSel(new Set(brands.map((b) => b.id)))} onClear={() => setBrandSel(new Set())} />
        <CheckList title="Categories" items={categories} selected={catSel}
          onToggle={(id) => toggle(catSel, setCatSel, id)} onAll={() => setCatSel(new Set(categories.map((c) => c.id)))} onClear={() => setCatSel(new Set())} />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 py-4">
          <Download className="h-5 w-5 text-muted-foreground" />
          <Button onClick={() => download("xlsx")}><FileSpreadsheet className="h-4 w-4 mr-2" /> Download Excel</Button>
          <Button variant="outline" onClick={() => download("pdf")}><FileText className="h-4 w-4 mr-2" /> Download PDF</Button>
        </CardContent>
      </Card>
    </div>
  );
}
