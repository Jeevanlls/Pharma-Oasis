import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Upload, 
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  Clock,
  XCircle,
  RotateCw,
  FileDown,
} from "lucide-react";
import type { UploadJob } from "@shared/schema";

interface PricingStatus {
  total: number;
  withPrice: number;
  withoutPrice: number;
  percentComplete: number;
}

export default function AdminGooglePricingPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const { data: status, isLoading: statusLoading } = useQuery<PricingStatus>({
    queryKey: ["/api/admin/pricing/status"],
  });

  const { data: uploadJobs, refetch: refetchJobs } = useQuery<UploadJob[]>({
    queryKey: ["/api/admin/upload-jobs", "google_price_import"],
    queryFn: async () => {
      const res = await fetch("/api/admin/upload-jobs?jobType=google_price_import");
      return res.json();
    },
  });

  const hasActiveJobs = uploadJobs?.some(j => j.status === "pending" || j.status === "processing");

  useEffect(() => {
    if (hasActiveJobs) {
      const interval = setInterval(() => {
        refetchJobs();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [hasActiveJobs, refetchJobs]);

  useEffect(() => {
    if (uploadJobs) {
      const completedJobs = uploadJobs.filter(j => j.status === "completed" || j.status === "failed");
      const latestCompleted = completedJobs[0];
      
      if (latestCompleted && latestCompleted.finishedAt) {
        const finishedAt = new Date(latestCompleted.finishedAt);
        const now = new Date();
        const diff = now.getTime() - finishedAt.getTime();
        
        if (diff < 10000 && diff > 0) {
          if (latestCompleted.status === "completed") {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing/status"] });
          }
        }
      }
    }
  }, [uploadJobs]);

  const parseCSV = (text: string): any[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values: string[] = [];
      let current = "";
      let inQuotes = false;

      for (const char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.replace(/^"|"$/g, "") || "";
      });
      rows.push(row);
    }

    return rows;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        toast({ title: "No valid data found in CSV", variant: "destructive" });
        setIsUploading(false);
        return;
      }

      const res = await apiRequest("POST", "/api/admin/google-pricing/upload", { 
        rows, 
        fileName: file.name 
      });
      const data = await res.json();

      toast({ 
        title: "Upload Queued",
        description: `Processing ${data.totalRows} rows in the background. You can leave this page.`,
      });

      setFile(null);
      refetchJobs();
    } catch (error) {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadMissing = () => {
    window.open("/api/admin/pricing/download-missing", "_blank");
  };

  const handleDownloadAll = () => {
    window.open("/api/admin/pricing/download-all", "_blank");
  };

  const handleDownloadErrors = (jobId: number) => {
    window.open(`/api/admin/upload-jobs/${jobId}/errors`, "_blank");
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case "processing":
        return <Badge variant="default" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Processing</Badge>;
      case "completed":
        return <Badge variant="outline" className="gap-1 text-green-600 border-green-600"><CheckCircle2 className="h-3 w-3" />Completed</Badge>;
      case "failed":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
          Google Shopping Prices
        </h1>
        <p className="mt-2 text-muted-foreground">
          Upload and manage prices for your Google Shopping feed
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{status?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">With Google Price</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{status?.withPrice || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Missing Google Price</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{status?.withoutPrice || 0}</div>
          </CardContent>
        </Card>
      </div>

      {status && status.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pricing Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={status.percentComplete} className="h-3" />
            <p className="mt-2 text-sm text-muted-foreground">
              {status.percentComplete}% of products have Google prices set
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download CSV
            </CardTitle>
            <CardDescription>
              Download product list to fill in Google prices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleDownloadMissing} 
              variant="outline" 
              className="w-full gap-2"
              data-testid="button-download-missing"
            >
              <Download className="h-4 w-4" />
              Download Products Missing Price ({status?.withoutPrice || 0})
            </Button>
            <Button 
              onClick={handleDownloadAll} 
              variant="outline" 
              className="w-full gap-2"
              data-testid="button-download-all"
            >
              <Download className="h-4 w-4" />
              Download All Products ({status?.total || 0})
            </Button>
            <p className="text-xs text-muted-foreground">
              CSV includes: SKU, Product Name, Brand, Category, Google Price
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload CSV
            </CardTitle>
            <CardDescription>
              Upload CSV with SKU and Google Price (supports 17k+ rows)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
                data-testid="input-csv-file"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">
                  {file ? file.name : "Click to select CSV file"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Required columns: sku, googleFeedPrice (or price)
                </p>
              </label>
            </div>

            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="w-full gap-2"
              data-testid="button-upload-prices"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Queueing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Prices
                </>
              )}
            </Button>

            <Alert>
              <Clock className="h-4 w-4" />
              <AlertTitle>Background Processing</AlertTitle>
              <AlertDescription className="text-sm">
                Uploads are processed in the background. You can close this page and check back later.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle>Upload History</CardTitle>
            <CardDescription>Recent Google price uploads and their status</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={() => refetchJobs()} data-testid="button-refresh-jobs">
            <RotateCw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {uploadJobs && uploadJobs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Results</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploadJobs.map((job) => (
                  <TableRow key={job.id} data-testid={`row-job-${job.id}`}>
                    <TableCell className="font-medium">{job.fileName}</TableCell>
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                    <TableCell>
                      {job.status === "processing" ? (
                        <div className="w-24">
                          <Progress value={(job.processedRows || 0) / (job.totalRows || 1) * 100} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {job.processedRows}/{job.totalRows}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">{job.totalRows} rows</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {job.status === "completed" && (
                        <div className="text-xs space-y-0.5">
                          <p className="text-green-600">{job.successCount} updated</p>
                          {(job.skippedCount || 0) > 0 && (
                            <p className="text-muted-foreground">{job.skippedCount} skipped</p>
                          )}
                          {(job.failureCount || 0) > 0 && (
                            <p className="text-destructive">{job.failureCount} errors</p>
                          )}
                        </div>
                      )}
                      {job.status === "failed" && (
                        <span className="text-xs text-destructive">{job.summaryMessage?.slice(0, 50)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(job.queuedAt)}
                    </TableCell>
                    <TableCell>
                      {job.status === "completed" && (job.failureCount || 0) > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadErrors(job.id)}
                          className="gap-1"
                          data-testid={`button-download-errors-${job.id}`}
                        >
                          <FileDown className="h-3 w-3" />
                          Errors
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileSpreadsheet className="mx-auto h-10 w-10 mb-3 opacity-50" />
              <p>No uploads yet</p>
              <p className="text-sm">Upload a CSV file to see it here</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
            <p>Click "Download Products Missing Price" to get a CSV of all products without Google prices</p>
          </div>
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
            <p>Open in Excel/Google Sheets and fill in the <strong>googleFeedPrice</strong> column</p>
          </div>
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
            <p>Save as CSV and upload here - the file will be processed in the background</p>
          </div>
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">4</span>
            <p>Check the Upload History table to see progress and results</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
