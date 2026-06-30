import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Upload, Download, AlertTriangle, CheckCircle2, Trash2, Loader2, FileUp, Clock, Save, Filter, ClipboardCheck,
} from "lucide-react";

interface Brand { id: number; name: string; }
type RowStatus = "duplicate" | "missing_info" | "changed" | "new" | "ok";
interface PreviewRow {
  ean: string; description: string; caseSize: string;
  costPrice: number | null; supplierQty: number | null; categoryName: string;
  comment: string | null;
  productId: number | null; matchStatus: "matched" | "new"; rowStatus: RowStatus;
  previousCost: number | null; changePercent: number | null;
  flagged: boolean; flagReason: string; publishable: boolean;
}
interface RemovedRow { ean: string; description: string; previousCost: number | null; }
interface PreviewSummary {
  brandNameInFile: string | null; rows: PreviewRow[]; removed: RemovedRow[];
  total: number; matched: number; newCount: number; removedCount: number;
  changedCount: number; okCount: number; duplicateCount: number; missingInfoCount: number;
  publishableCount: number; flagged: number; hasDuplicates: boolean; threshold: number;
}
interface CostUpload {
  id: number; brandId: number; brandName: string | null; supplierName: string | null;
  validFrom: string | null; validUntil: string | null; comment: string | null;
  status: string; rowCount: number; matchedCount: number; unmatchedCount: number;
  createdAt: string; fileName: string | null;
}

const money = (n: number | null) => (n === null ? "—" : `£${Number(n).toFixed(2)}`);

// Mirror the server's EAN normalisation + rounding so the review screen can
// re-validate duplicates and cost changes live as the admin types, before Save.
const normEan = (v: string | null | undefined) =>
  (v ?? "").toString().replace(/\s+/g, "").replace(/\.0$/, "").trim();
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export default function AdminCostUploadsPage() {
  const { toast } = useToast();
  const [brandId, setBrandId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [supplierName, setSupplierName] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [bulkFiles, setBulkFiles] = useState<FileList | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<any | null>(null);
  const [preview, setPreview] = useState<{ uploadId: number; summary: PreviewSummary } | null>(null);
  const [uploading, setUploading] = useState(false);

  // Interactive review state (editable rows, keep/remove decisions, status filter).
  const [editRows, setEditRows] = useState<PreviewRow[]>([]);
  const [editComment, setEditComment] = useState("");
  const [keepRemoved, setKeepRemoved] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<RowStatus | "all">("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dirty, setDirty] = useState(false);
  // Big cost changes the admin has explicitly ticked to confirm. Keyed by EAN+cost
  // so that editing the cost (or EAN) invalidates an earlier confirmation.
  const [confirmedChanges, setConfirmedChanges] = useState<Record<string, boolean>>({});

  // Re-seed the editable copy whenever a fresh preview arrives (upload or save).
  useEffect(() => {
    setSelected(new Set());
    if (!preview) { setEditRows([]); return; }
    setEditRows(preview.summary.rows.map((r) => ({ ...r })));
    setKeepRemoved((prev) => {
      const next: Record<string, boolean> = {};
      for (const r of preview.summary.removed) next[r.ean] = prev[r.ean] ?? true; // default: keep at old price
      return next;
    });
    setStatusFilter("all");
    setDirty(false);
  }, [preview]);

  function patchRow(i: number, patch: Partial<PreviewRow>) {
    setEditRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    setDirty(true);
  }

  function removeRow(i: number) {
    setEditRows((rows) => rows.filter((_, idx) => idx !== i));
    setDirty(true);
  }

  const { data: brands = [] } = useQuery<Brand[]>({ queryKey: ["/api/admin/pricing-brands"] });
  const { data: pricingCategories = [] } = useQuery<{ id: number; name: string }[]>({ queryKey: ["/api/admin/pricing-categories"] });
  const { data: uploads = [] } = useQuery<CostUpload[]>({ queryKey: ["/api/admin/cost-uploads"] });
  const { data: alerts = [] } = useQuery<{ brandId: number; brandName: string | null; count: number }[]>({
    queryKey: ["/api/admin/cost-alerts"],
  });
  const { data: settings } = useQuery<Record<string, string>>({ queryKey: ["/api/admin/settings"] });

  const [threshold, setThreshold] = useState<string>("");
  const effectiveThreshold = threshold || settings?.cost_change_threshold || "30";

  const saveThreshold = useMutation({
    mutationFn: async (v: string) => apiRequest("PATCH", "/api/admin/settings", { cost_change_threshold: v }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "Threshold saved" });
    },
  });

  async function handleBulkUpload() {
    if (!bulkFiles || bulkFiles.length === 0) { toast({ title: "Select one or more files first", variant: "destructive" }); return; }
    setBulkUploading(true); setBulkResult(null);
    try {
      const fd = new FormData();
      Array.from(bulkFiles).forEach((f) => fd.append("files", f));
      if (supplierName) fd.append("supplierName", supplierName);
      const res = await fetch("/api/admin/cost-uploads/bulk", { method: "POST", body: fd, credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Bulk upload failed");
      setBulkResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cost-uploads"] });
      toast({ title: `Created ${data.created} draft upload(s)`, description: `from ${data.total} file(s)` });
    } catch (e: any) {
      toast({ title: "Bulk upload failed", description: e.message, variant: "destructive" });
    } finally {
      setBulkUploading(false);
    }
  }

  async function handleUpload() {
    if (!brandId) { toast({ title: "Select a brand first", variant: "destructive" }); return; }
    if (!categoryId) { toast({ title: "Select a category first", variant: "destructive" }); return; }
    if (!file) { toast({ title: "Choose a file", variant: "destructive" }); return; }
    setUploading(true);
    setPreview(null);
    setConfirmedChanges({});
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("brandId", brandId);
      if (categoryId) fd.append("categoryId", categoryId);
      fd.append("supplierName", supplierName);
      fd.append("validFrom", validFrom);
      fd.append("validUntil", validUntil);
      fd.append("comment", comment);
      const res = await fetch("/api/admin/cost-uploads", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).message || "Upload failed");
      const data = await res.json();
      setEditComment(comment);
      setPreview({ uploadId: data.upload.id, summary: data.summary });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cost-uploads"] });
      toast({ title: "File parsed", description: `${data.summary.matched} updated, ${data.summary.newCount} new, ${data.summary.removedCount} removed, ${data.summary.flagged} flagged. Review then publish.` });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  const publishMut = useMutation({
    mutationFn: async (id: number) => apiRequest("POST", `/api/admin/cost-uploads/${id}/publish`),
    onSuccess: async (res) => {
      const data = await res.json();
      toast({ title: "Published", description: `${data.updated} cost(s) now live${data.skipped ? `, ${data.skipped} incomplete line(s) skipped` : ""}.` });
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cost-uploads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cost-alerts"] });
    },
    onError: (e: any) => toast({ title: "Publish failed", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/admin/cost-uploads/${id}`),
    onSuccess: () => {
      toast({ title: "Upload deleted" });
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cost-uploads"] });
    },
  });

  const saveDraftMut = useMutation({
    mutationFn: async (uploadId: number) => {
      const keepMissingEans = Object.entries(keepRemoved).filter(([, keep]) => keep).map(([ean]) => ean);
      const res = await apiRequest("PATCH", `/api/admin/cost-uploads/${uploadId}/draft`, {
        rows: editRows,
        keepMissingEans,
        comment: editComment,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setPreview((p) => (p ? { ...p, summary: data.summary } : p));
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cost-uploads"] });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  async function handleResetTest() {
    const c = window.prompt("This permanently deletes ALL cost uploads, price lists, items and customer assignments. Your brands & categories are KEPT. Type DELETE to confirm:");
    if (c !== "DELETE") return;
    try {
      const res = await fetch("/api/admin/pricing/reset-test-data", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Reset failed");
      const cc = data.counts || {};
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cost-uploads"] });
      setPreview(null);
      toast({ title: "Pricing data cleared", description: `${cc.costUploads ?? 0} upload(s) and ${cc.priceLists ?? 0} price list(s) removed. Brands & categories kept.` });
    } catch (e: any) {
      toast({ title: "Reset failed", description: e.message, variant: "destructive" });
    }
  }

  async function openDraft(uploadId: number) {
    try {
      const res = await fetch(`/api/admin/cost-uploads/${uploadId}/review`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to open draft");
      setEditComment(data.upload?.comment ?? "");
      setPreview({ uploadId, summary: data.summary });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      toast({ title: "Couldn't open draft", description: e.message, variant: "destructive" });
    }
  }

  async function handlePublish(uploadId: number) {
    try {
      // Always persist the latest edits + keep/remove decisions before publishing.
      await saveDraftMut.mutateAsync(uploadId);
      const res = await apiRequest("POST", `/api/admin/cost-uploads/${uploadId}/publish`);
      const data = await res.json();
      toast({
        title: "Published",
        description: `${data.updated} cost(s) now live${data.skipped ? `, ${data.skipped} incomplete line(s) skipped` : ""}.`,
      });
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cost-uploads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cost-alerts"] });
    } catch (e: any) {
      toast({ title: "Publish failed", description: e.message, variant: "destructive" });
    }
  }

  const statusColor: Record<string, string> = {
    draft: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    superseded: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    archived: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          <Upload className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cost Uploads</h1>
          <p className="text-muted-foreground"><b>Step 3.</b> Upload a supplier cost file for a brand. Review the preview, then <b>Publish</b> to make those costs live.</p>
        </div>
      </div>

      {alerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Expired costs need attention</AlertTitle>
          <AlertDescription>
            {alerts.map((a) => `${a.brandName ?? "Brand " + a.brandId} (${a.count})`).join(", ")} — customers still see the last price. Re-upload to refresh.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileUp className="h-5 w-5" /> New cost upload</CardTitle>
          <CardDescription>One brand per file, in the template format. Brand &amp; categories are read from the file; matching is by EAN.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <Button variant="outline" asChild>
              <a href="/api/admin/cost-template"><Download className="h-4 w-4 mr-2" /> Download template</a>
            </Button>
            <div className="flex items-end gap-2 ml-auto">
              <div>
                <Label className="text-xs">Cost-change alert threshold (±%)</Label>
                <Input type="number" className="w-28" value={effectiveThreshold}
                  onChange={(e) => setThreshold(e.target.value)} />
              </div>
              <Button variant="secondary" onClick={() => saveThreshold.mutate(effectiveThreshold)}>Save</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Brand *</Label>
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                <SelectContent>
                  {brands.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Assign a category" /></SelectTrigger>
                <SelectContent>
                  {pricingCategories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Supplier name</Label>
              <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="e.g. Acme Pharma Ltd" />
            </div>
            <div>
              <Label>Valid from</Label>
              <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
            </div>
            <div>
              <Label>Valid until</Label>
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Comment (internal)</Label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="e.g. Promo batch, min order 5 cases" />
          </div>
          <div className="flex items-center gap-3">
            <Input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <Button onClick={handleUpload} disabled={uploading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload &amp; preview
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileUp className="h-5 w-5" /> Bulk upload (many brands at once)</CardTitle>
          <CardDescription>Select multiple brand files — one draft is created per brand, matched (or created) by the brand name in each file. Review &amp; publish each in the history below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Input type="file" accept=".xlsx,.xls,.csv" multiple onChange={(e) => setBulkFiles(e.target.files)} className="max-w-md" />
            <Button onClick={handleBulkUpload} disabled={bulkUploading} variant="outline">
              {bulkUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload {bulkFiles?.length ? `${bulkFiles.length} file(s)` : "selected"}
            </Button>
          </div>
          {bulkResult && (
            <div className="rounded-md border divide-y text-sm max-h-72 overflow-auto">
              <div className="p-2 bg-muted/50 font-medium sticky top-0">Created {bulkResult.created} of {bulkResult.total} draft(s) — review &amp; publish each below.</div>
              {bulkResult.results.map((r: any, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2">
                  {r.ok
                    ? <span className="truncate"><CheckCircle2 className="h-4 w-4 text-emerald-600 inline mr-1" /><b>{r.brand}</b> — {r.rows} rows{r.brandCreated ? " (new brand)" : ""}</span>
                    : <span className="truncate"><AlertTriangle className="h-4 w-4 text-red-600 inline mr-1" />{r.file} — {r.error}</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {preview && (() => {
        const s = preview.summary;
        const busy = saveDraftMut.isPending;
        const statusMeta: Record<RowStatus, { label: string; cls: string }> = {
          duplicate: { label: "duplicate", cls: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300" },
          missing_info: { label: "missing info", cls: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300" },
          changed: { label: "cost changed", cls: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" },
          new: { label: "new", cls: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300" },
          ok: { label: "unchanged", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" },
        };

        // Re-derive each row's status LIVE from the current edits (duplicate EANs,
        // cost change %, missing info) so the screen reacts instantly to typing —
        // no Save round-trip needed. The server re-checks authoritatively on save/publish.
        const eanCounts: Record<string, number> = {};
        for (const r of editRows) { const k = normEan(r.ean); if (k) eanCounts[k] = (eanCounts[k] ?? 0) + 1; }
        const liveRows = editRows.map((r) => {
          const key = normEan(r.ean);
          const prev = r.previousCost;
          const hasCost = r.costPrice !== null && r.costPrice > 0;
          const changePercent =
            prev !== null && prev > 0 && r.costPrice !== null ? round2(((r.costPrice - prev) / prev) * 100) : null;
          const isDuplicate = !!key && (eanCounts[key] ?? 0) > 1;
          const missingEan = !key;
          const missingCost = !hasCost;
          const costChanged = prev !== null && r.costPrice !== null && round2(r.costPrice) !== round2(prev);
          let rowStatus: RowStatus;
          if (isDuplicate) rowStatus = "duplicate";
          else if (missingEan || missingCost) rowStatus = "missing_info";
          else if (r.matchStatus === "new") rowStatus = "new";
          else if (costChanged) rowStatus = "changed";
          else rowStatus = "ok";
          return { ...r, changePercent, rowStatus, publishable: !isDuplicate && !missingEan && !missingCost };
        });

        const counts: Record<RowStatus, number> = { duplicate: 0, missing_info: 0, changed: 0, new: 0, ok: 0 };
        for (const r of liveRows) counts[r.rowStatus]++;
        const total = liveRows.length;
        const liveHasDuplicates = counts.duplicate > 0;

        const visible = liveRows
          .map((r, i) => ({ r, i }))
          .filter(({ r }) => statusFilter === "all" || r.rowStatus === statusFilter);

        // A "big" cost change (beyond the ± threshold) must be ticked to confirm
        // before publishing — guards against a mistyped cost going live unnoticed.
        const changeKey = (r: PreviewRow) => `${r.ean}|${r.costPrice}`;
        const needsConfirm = (r: PreviewRow) =>
          r.rowStatus === "changed" && r.changePercent !== null && Math.abs(r.changePercent) > s.threshold;
        const unconfirmed = liveRows.filter((r) => needsConfirm(r) && !confirmedChanges[changeKey(r)]).length;
        const canPublish = !liveHasDuplicates && unconfirmed === 0;
        return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5" /> Review before publishing</CardTitle>
            <CardDescription className="flex flex-wrap gap-2 pt-1">
              <Badge variant="outline">{total} rows</Badge>
              {counts.changed > 0 && <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">{counts.changed} cost changed</Badge>}
              {counts.new > 0 && <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">{counts.new} new</Badge>}
              {s.removedCount > 0 && <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">{s.removedCount} missing</Badge>}
              {counts.duplicate > 0 && <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">{counts.duplicate} duplicate</Badge>}
              {counts.missing_info > 0 && <Badge className="bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">{counts.missing_info} missing info</Badge>}
              {counts.ok > 0 && <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">{counts.ok} unchanged</Badge>}
              {s.brandNameInFile && <Badge variant="outline">File brand: {s.brandNameInFile}</Badge>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {liveHasDuplicates && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Duplicate EANs must be fixed before publishing</AlertTitle>
                <AlertDescription>
                  {counts.duplicate} line(s) share an EAN with another line. The same EAN can't carry two products or costs.
                  Filter to “Duplicate” below, then correct the EAN or delete the extra line — the status updates as you type. Click <strong>Save changes</strong> to store your fixes.
                </AlertDescription>
              </Alert>
            )}
            {dirty && (
              <p className="text-xs text-amber-700 dark:text-amber-400">Statuses update live as you edit. Click <strong>Save changes</strong> to store them (Publish also saves automatically).</p>
            )}

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as RowStatus | "all")}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All rows ({total})</SelectItem>
                  <SelectItem value="changed">Cost changed ({counts.changed})</SelectItem>
                  <SelectItem value="new">New ({counts.new})</SelectItem>
                  <SelectItem value="duplicate">Duplicate ({counts.duplicate})</SelectItem>
                  <SelectItem value="missing_info">Missing info ({counts.missing_info})</SelectItem>
                  <SelectItem value="ok">Unchanged ({counts.ok})</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">Showing {visible.length} of {total}. Description, Category, Case, Cost, EAN, QTY &amp; Notes are editable.</span>
              {selected.size > 0 && (
                <Button size="sm" variant="destructive" className="ml-auto"
                  onClick={() => { setEditRows((rows) => rows.filter((_, idx) => !selected.has(idx))); setSelected(new Set()); setDirty(true); }}>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete selected ({selected.size})
                </Button>
              )}
            </div>

            <div className="max-h-[460px] overflow-auto border rounded-lg">
              <Table className="min-w-[1400px]">
                <TableHeader className="sticky top-0 z-10">
                  <TableRow className="bg-muted/60 hover:bg-muted/60 border-b [&>th]:text-[11px] [&>th]:uppercase [&>th]:tracking-wider [&>th]:font-semibold [&>th]:text-muted-foreground">
                    <TableHead className="w-[44px]">
                      <Checkbox
                        checked={visible.length > 0 && visible.every((v) => selected.has(v.i))}
                        onCheckedChange={(v) => setSelected((prev) => {
                          const next = new Set(prev);
                          if (v) visible.forEach((x) => next.add(x.i)); else visible.forEach((x) => next.delete(x.i));
                          return next;
                        })}
                        aria-label="Select all shown"
                      />
                    </TableHead>
                    <TableHead className="w-[150px]">EAN</TableHead>
                    <TableHead className="min-w-[400px]">Description</TableHead>
                    <TableHead className="w-[160px]">Category</TableHead>
                    <TableHead className="w-[80px]">Case</TableHead>
                    <TableHead className="text-right w-[70px]">Prev</TableHead>
                    <TableHead className="text-right w-[100px]">New cost</TableHead>
                    <TableHead className="text-right w-[70px]">Change</TableHead>
                    <TableHead className="w-[72px]">QTY</TableHead>
                    <TableHead className="w-[150px]">Notes</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                    <TableHead className="w-[44px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.length === 0 && (
                    <TableRow><TableCell colSpan={12} className="text-center text-muted-foreground text-sm">No rows for this filter</TableCell></TableRow>
                  )}
                  {visible.map(({ r, i }) => (
                    <TableRow key={i} className={r.rowStatus === "duplicate" || r.rowStatus === "missing_info" ? "bg-red-50 dark:bg-red-950/30" : ""}>
                      <TableCell>
                        <Checkbox checked={selected.has(i)}
                          onCheckedChange={(v) => setSelected((prev) => { const n = new Set(prev); v ? n.add(i) : n.delete(i); return n; })}
                          aria-label="Select row" />
                      </TableCell>
                      <TableCell>
                        <Input value={r.ean} onChange={(e) => patchRow(i, { ean: e.target.value })}
                          className="h-8 font-mono text-[11px] px-2" placeholder="EAN" />
                      </TableCell>
                      <TableCell>
                        <Input value={r.description} onChange={(e) => patchRow(i, { description: e.target.value })}
                          title={r.description} className="h-8 text-xs" placeholder="Description" />
                      </TableCell>
                      <TableCell>
                        <Select value={r.categoryName || ""} onValueChange={(v) => patchRow(i, { categoryName: v })}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            {pricingCategories.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input value={r.caseSize} onChange={(e) => patchRow(i, { caseSize: e.target.value })}
                          className="h-8 text-xs px-2" placeholder="—" />
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{money(r.previousCost)}</TableCell>
                      <TableCell>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">£</span>
                          <Input type="number" step="0.01" value={r.costPrice ?? ""}
                            onChange={(e) => patchRow(i, { costPrice: e.target.value === "" ? null : Number(e.target.value) })}
                            className="h-8 text-xs text-right tabular-nums pl-4" placeholder="0.00" />
                        </div>
                      </TableCell>
                      <TableCell className={`text-right text-xs ${r.changePercent && Math.abs(r.changePercent) > s.threshold ? "text-red-600 dark:text-red-400 font-semibold" : ""}`}>
                        {r.changePercent === null ? "—" : `${r.changePercent > 0 ? "+" : ""}${r.changePercent}%`}
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={r.supplierQty ?? ""}
                          onChange={(e) => patchRow(i, { supplierQty: e.target.value === "" ? null : Number(e.target.value) })}
                          className="h-8 text-xs text-right" placeholder="—" />
                      </TableCell>
                      <TableCell>
                        <Input value={r.comment ?? ""} onChange={(e) => patchRow(i, { comment: e.target.value })}
                          className="h-8 text-xs" placeholder="Internal note" />
                      </TableCell>
                      <TableCell>
                        <Badge className={`font-normal ${statusMeta[r.rowStatus].cls}`} title={r.flagReason}>
                          {statusMeta[r.rowStatus].label}
                        </Badge>
                        {needsConfirm(r) && (
                          <label className="flex items-center gap-1 mt-1 text-xs text-red-600 dark:text-red-400 cursor-pointer">
                            <Checkbox checked={!!confirmedChanges[changeKey(r)]}
                              onCheckedChange={(v) => setConfirmedChanges((p) => ({ ...p, [changeKey(r)]: !!v }))} />
                            confirm {r.changePercent! > 0 ? "+" : ""}{r.changePercent}%
                          </label>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          title="Delete this line" onClick={() => removeRow(i)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {s.removed.length > 0 && (
              <div className="border border-amber-200 dark:border-amber-900/50 rounded-lg bg-amber-50 dark:bg-amber-950/20 p-3.5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1 text-amber-800 dark:text-amber-300 text-sm font-medium">
                    <AlertTriangle className="h-4 w-4" /> {s.removed.length} product(s) in the brand's last costs are NOT in this file
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => { setKeepRemoved(Object.fromEntries(s.removed.map((r) => [r.ean, true]))); setDirty(true); }}>Keep all</Button>
                    <Button size="sm" variant="outline" onClick={() => { setKeepRemoved(Object.fromEntries(s.removed.map((r) => [r.ean, false]))); setDirty(true); }}>Remove all</Button>
                  </div>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
                  For each, choose <strong>Keep</strong> (carried into this upload at its old cost) or <strong>Remove</strong> (dropped). Then <strong>Save changes</strong>.
                </p>
                <div className="max-h-[200px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 hover:bg-muted/40 [&>th]:text-[11px] [&>th]:uppercase [&>th]:tracking-wider [&>th]:font-semibold [&>th]:text-muted-foreground">
                        <TableHead>EAN</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Old cost</TableHead>
                        <TableHead className="w-[170px]">Decision</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {s.removed.map((r) => (
                        <TableRow key={r.ean}>
                          <TableCell className="font-mono text-xs">{r.ean || "—"}</TableCell>
                          <TableCell className="max-w-[220px] truncate text-xs">{r.description || "—"}</TableCell>
                          <TableCell className="text-right text-xs">{money(r.previousCost)}</TableCell>
                          <TableCell>
                            <Select value={keepRemoved[r.ean] ? "keep" : "remove"}
                              onValueChange={(v) => { setKeepRemoved((p) => ({ ...p, [r.ean]: v === "keep" })); setDirty(true); }}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="keep">Keep at old price</SelectItem>
                                <SelectItem value="remove">Remove</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div>
              <Label>Comment (internal — editable until published)</Label>
              <Textarea value={editComment} onChange={(e) => { setEditComment(e.target.value); setDirty(true); }}
                placeholder="e.g. Promo batch, min order 5 cases" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={() => saveDraftMut.mutate(preview.uploadId)} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save changes
              </Button>
              <Button onClick={() => handlePublish(preview.uploadId)} disabled={busy || !canPublish}
                className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Publish — make these costs live
              </Button>
              <Button variant="outline" onClick={() => deleteMut.mutate(preview.uploadId)} disabled={busy}>
                <Trash2 className="h-4 w-4 mr-2" /> Discard draft
              </Button>
              {liveHasDuplicates
                ? <span className="text-xs text-red-600 dark:text-red-400">Resolve duplicate EANs to enable publishing.</span>
                : unconfirmed > 0
                  ? <span className="text-xs text-red-600 dark:text-red-400">{unconfirmed} large cost change(s) need confirming (tick the box) before publishing.</span>
                  : counts.missing_info > 0
                    ? <span className="text-xs text-amber-700 dark:text-amber-400">{counts.missing_info} incomplete line(s) will be skipped on publish.</span>
                    : null}
            </div>
          </CardContent>
        </Card>
        );
      })()}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Upload history</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 [&>th]:text-[11px] [&>th]:uppercase [&>th]:tracking-wider [&>th]:font-semibold [&>th]:text-muted-foreground">
                <TableHead>Date</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Valid until</TableHead>
                <TableHead className="text-right">Rows</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No uploads yet</TableCell></TableRow>}
              {uploads.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="text-xs">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{u.brandName ?? u.brandId}</TableCell>
                  <TableCell>{u.supplierName ?? "—"}</TableCell>
                  <TableCell className="text-xs">{u.validUntil ? new Date(u.validUntil).toLocaleDateString() : "—"}</TableCell>
                  <TableCell className="text-right">{u.matchedCount}/{u.rowCount}</TableCell>
                  <TableCell><Badge className={statusColor[u.status] ?? ""}>{u.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    {u.status === "draft" && (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => openDraft(u.id)}>Review</Button>
                        <Button size="sm" variant="ghost" onClick={() => publishMut.mutate(u.id)}>Publish</Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteMut.mutate(u.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-300 dark:border-red-900/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400"><AlertTriangle className="h-5 w-5" /> Danger zone</CardTitle>
          <CardDescription>Clear all test pricing data — deletes every cost upload, price list and customer assignment. Your <b>brands and categories are kept</b>. Use this once before uploading real costs.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleResetTest}>
            <Trash2 className="h-4 w-4 mr-2" /> Clear all test pricing data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
