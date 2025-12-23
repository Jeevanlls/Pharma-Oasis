import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Upload, 
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  DollarSign,
} from "lucide-react";

interface UploadResult {
  updated: number;
  skipped: number;
  notFound: number;
  total: number;
  errors: string[];
}

interface PricingStatus {
  total: number;
  withPrice: number;
  withoutPrice: number;
  percentComplete: number;
}

export default function AdminGooglePricingPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const { toast } = useToast();

  const { data: status, isLoading: statusLoading } = useQuery<PricingStatus>({
    queryKey: ["/api/admin/pricing/status"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (rows: any[]): Promise<UploadResult> => {
      const res = await apiRequest("POST", "/api/admin/pricing/upload", { rows });
      return res.json();
    },
    onSuccess: (result) => {
      setUploadResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ 
        title: "Upload Complete",
        description: `Updated ${result.updated} products`,
      });
    },
    onError: () => {
      toast({ title: "Upload failed", variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadResult(null);
    }
  };

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

  const handleUpload = async () => {
    if (!file) return;

    const text = await file.text();
    const rows = parseCSV(text);

    if (rows.length === 0) {
      toast({ title: "No valid data found in CSV", variant: "destructive" });
      return;
    }

    uploadMutation.mutate(rows);
  };

  const handleDownloadMissing = () => {
    window.open("/api/admin/pricing/download-missing", "_blank");
  };

  const handleDownloadAll = () => {
    window.open("/api/admin/pricing/download-all", "_blank");
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
              disabled={!file || uploadMutation.isPending}
              className="w-full gap-2"
              data-testid="button-upload-prices"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Prices
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {uploadResult && (
        <Alert variant={uploadResult.updated > 0 ? "default" : "destructive"}>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Upload Complete</AlertTitle>
          <AlertDescription>
            <div className="mt-2 space-y-1">
              <p><strong>{uploadResult.updated}</strong> products updated with new prices</p>
              <p><strong>{uploadResult.skipped}</strong> rows skipped (no valid price)</p>
              <p><strong>{uploadResult.notFound}</strong> SKUs not found in database</p>
              <p className="text-muted-foreground">Total rows processed: {uploadResult.total}</p>
            </div>
            {uploadResult.errors.length > 0 && (
              <div className="mt-3">
                <p className="font-medium text-destructive">Errors:</p>
                <ul className="text-sm list-disc list-inside">
                  {uploadResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

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
            <p>Save as CSV and upload here - prices will be matched by SKU</p>
          </div>
          <div className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">4</span>
            <p>Products with matching SKUs will be updated, others will be ignored</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
