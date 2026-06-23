import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Upload, Download, AlertTriangle, CheckCircle2, Trash2, Loader2, FileUp, Clock,
} from "lucide-react";

interface Brand { id: number; name: string; }
interface PreviewRow {
  ean: string; description: string; caseSize: string;
  costPrice: number | null; supplierQty: number | null; categoryName: string;
  productId: number | null; matchStatus: "matched" | "unmatched";
  previousCost: number | null; changePercent: number | null;
  flagged: boolean; flagReason: string;
}
interface PreviewSummary {
  brandNameInFile: string | null; rows: PreviewRow[];
  total: number; matched: number; unmatched: number; flagged: number; threshold: number;
}
interface CostUpload {
  id: number; brandId: number; brandName: string | null; supplierName: string | null;
  validFrom: string | null; validUntil: string | null; comment: string | null;
  status: string; rowCount: number; matchedCount: number; unmatchedCount: number;
  createdAt: string; fileName: string | null;
}

const money = (n: number | null) => (n === null ? "—" : `£${Number(n).toFixed(2)}`);

export default function AdminCostUploadsPage() {
  const { toast } = useToast();
  const [brandId, setBrandId] = useState<string>("");
  const [supplierName, setSupplierName] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ uploadId: number; summary: PreviewSummary } | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: brands = [] } = useQuery<Brand[]>({ queryKey: ["/api/brands"] });
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

  async function handleUpload() {
    if (!brandId) { toast({ title: "Select a brand first", variant: "destructive" }); return; }
    if (!file) { toast({ title: "Choose a file", variant: "destructive" }); return; }
    setUploading(true);
    setPreview(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("brandId", brandId);
      fd.append("supplierName", supplierName);
      fd.append("validFrom", validFrom);
      fd.append("validUntil", validUntil);
      fd.append("comment", comment);
      const res = await fetch("/api/admin/cost-uploads", { method: "POST", body: fd, credentials: "include" });
      if (!res.ok) throw new Error((await res.json()).message || "Upload failed");
      const data = await res.json();
      setPreview({ uploadId: data.upload.id, summary: data.summary });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cost-uploads"] });
      toast({ title: "File parsed", description: `${data.summary.matched} matched, ${data.summary.flagged} flagged. Review then publish.` });
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
      toast({ title: "Published", description: `${data.updated} product costs updated and now live.` });
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

  const statusColor: Record<string, string> = {
    draft: "bg-amber-100 text-amber-800",
    published: "bg-green-100 text-green-800",
    superseded: "bg-gray-100 text-gray-600",
    archived: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold">Cost Uploads</h1>
        <p className="text-muted-foreground">Upload supplier cost prices per brand. Review the preview, then publish to make costs live.</p>
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
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload &amp; preview
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle>Preview — review before publishing</CardTitle>
            <CardDescription className="flex flex-wrap gap-2 pt-1">
              <Badge variant="outline">{preview.summary.total} rows</Badge>
              <Badge className="bg-green-100 text-green-800">{preview.summary.matched} matched</Badge>
              {preview.summary.unmatched > 0 && <Badge className="bg-gray-100 text-gray-600">{preview.summary.unmatched} unmatched</Badge>}
              {preview.summary.flagged > 0 && <Badge className="bg-red-100 text-red-800">{preview.summary.flagged} flagged</Badge>}
              {preview.summary.brandNameInFile && <Badge variant="outline">File brand: {preview.summary.brandNameInFile}</Badge>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[420px] overflow-auto border rounded">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>EAN</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Prev</TableHead>
                    <TableHead className="text-right">New cost</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead className="text-right">QTY</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.summary.rows.map((r, i) => (
                    <TableRow key={i} className={r.flagged ? "bg-red-50" : ""}>
                      <TableCell className="font-mono text-xs">{r.ean || "—"}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{r.description}</TableCell>
                      <TableCell className="text-xs">{r.categoryName || "—"}</TableCell>
                      <TableCell className="text-right">{money(r.previousCost)}</TableCell>
                      <TableCell className="text-right font-medium">{money(r.costPrice)}</TableCell>
                      <TableCell className={`text-right ${r.changePercent && Math.abs(r.changePercent) > preview.summary.threshold ? "text-red-600 font-semibold" : ""}`}>
                        {r.changePercent === null ? "—" : `${r.changePercent > 0 ? "+" : ""}${r.changePercent}%`}
                      </TableCell>
                      <TableCell className="text-right">{r.supplierQty ?? "—"}</TableCell>
                      <TableCell>
                        {r.flagged
                          ? <span className="flex items-center gap-1 text-red-600 text-xs" title={r.flagReason}><AlertTriangle className="h-3 w-3" /> {r.flagReason}</span>
                          : r.matchStatus === "matched"
                            ? <span className="flex items-center gap-1 text-green-700 text-xs"><CheckCircle2 className="h-3 w-3" /> ok</span>
                            : <span className="text-gray-500 text-xs">unmatched</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => publishMut.mutate(preview.uploadId)} disabled={publishMut.isPending}>
                {publishMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Publish — make these costs live
              </Button>
              <Button variant="outline" onClick={() => deleteMut.mutate(preview.uploadId)}>
                <Trash2 className="h-4 w-4 mr-2" /> Discard draft
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Upload history</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
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
                        <Button size="sm" variant="ghost" onClick={() => publishMut.mutate(u.id)}>Publish</Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteMut.mutate(u.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
