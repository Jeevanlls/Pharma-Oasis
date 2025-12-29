import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Upload, 
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  Info,
  XCircle,
  FileWarning,
  RefreshCw,
  History,
  Clock,
  RotateCcw,
} from "lucide-react";

interface ImportJob {
  id: number;
  userId: number;
  filename: string;
  totalRows: number;
  processedRows: number;
  successCount: number;
  errorCount: number;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  errorSummary: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const requiredColumns = [
  "sku", "productname", "brand", "category"
];

const optionalColumns = [
  "ean", "subcategory", "shortDescription", "longDescription", "packSize", "caseSize",
  "uom", "wholesalePrice", "rrp", "moq", "vatRate", "isActive", "isFeatured", "imageUrl",
  "countryOfOrigin", "productType", "storageConditions"
];

const sampleCsvData = `sku,productName,brand,category,subcategory,packSize,caseSize,isActive,isFeatured
SKU-001,Sample Vitamin C 1000mg,VitaBoost,Vitamins & Supplements,Multivitamins,60 tablets,12,true,true
SKU-002,Pain Relief Gel,PharmaCare Plus,OTC Medicines,Pain Relief,100ml,24,true,false`;

export default function AdminImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [originalHeaders, setOriginalHeaders] = useState<string[]>([]);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch import history
  const { data: importJobs, refetch: refetchJobs } = useQuery<ImportJob[]>({
    queryKey: ["/api/admin/import-jobs"],
    refetchInterval: (query) => {
      // Poll every 2s if any job is processing or queued
      const jobs = query.state.data as ImportJob[] | undefined;
      const hasActiveJob = jobs?.some(j => j.status === "queued" || j.status === "processing");
      return hasActiveJob ? 2000 : false;
    },
  });

  // Derive active job from history (first processing/queued job, or the one we just started)
  const activeJob = importJobs?.find(j => 
    j.id === activeJobId || j.status === "queued" || j.status === "processing"
  );
  
  // Auto-clear active job when completed
  useEffect(() => {
    if (activeJob && (activeJob.status === "completed" || activeJob.status === "failed")) {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      
      if (activeJob.status === "completed" && activeJob.errorCount === 0) {
        toast({ 
          title: "Import completed successfully",
          description: `${activeJob.successCount} products imported`
        });
      } else if (activeJob.errorCount > 0) {
        toast({ 
          title: "Import completed with errors",
          description: `${activeJob.successCount} succeeded, ${activeJob.errorCount} failed`,
          variant: "destructive"
        });
      }
    }
  }, [activeJob?.status, activeJob?.errorCount, toast]);

  // Create background import job
  const importMutation = useMutation({
    mutationFn: async ({ products, filename }: { products: any[]; filename: string }) => {
      const res = await apiRequest("POST", "/api/admin/import-jobs", { products, filename });
      return res.json();
    },
    onSuccess: (result: { jobId: number; totalRows: number }) => {
      setActiveJobId(result.jobId);
      setFile(null);
      setParsedData(null);
      refetchJobs();
      toast({ 
        title: "Import started",
        description: `Processing ${result.totalRows} products in background`
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to start import", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Retry failed rows
  const retryMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const res = await apiRequest("POST", `/api/admin/import-jobs/${jobId}/retry`, {});
      return res.json();
    },
    onSuccess: (result, jobId) => {
      setActiveJobId(jobId);
      refetchJobs();
      toast({ 
        title: "Retry started",
        description: `Retrying ${result.retriedCount} failed rows`
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Retry failed", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast({ title: "Please select a CSV file", variant: "destructive" });
      return;
    }

    setFile(selectedFile);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({ title: "CSV file is empty or has no data rows", variant: "destructive" });
        return;
      }

      // Normalize headers: lowercase and remove spaces/underscores for matching
      const normalizeHeader = (h: string) => h.trim().toLowerCase().replace(/[\s_-]+/g, '');
      const headers = lines[0].split(',').map(normalizeHeader);
      setOriginalHeaders(lines[0].split(',').map(h => h.trim()));
      
      const missingRequired = requiredColumns.filter(col => !headers.includes(col));
      if (missingRequired.length > 0) {
        toast({ 
          title: "Missing required columns", 
          description: missingRequired.join(', '),
          variant: "destructive" 
        });
        return;
      }

      // Header mapping: normalized header -> camelCase property name
      const headerMap: Record<string, string> = {
        'sku': 'sku',
        'ean': 'ean',
        'productname': 'productName',
        'brand': 'brand',
        'category': 'category',
        'subcategory': 'subcategory',
        'shortdescription': 'shortDescription',
        'longdescription': 'longDescription',
        'packsize': 'packSize',
        'casesize': 'caseSize',
        'uom': 'uom',
        'wholesaleprice': 'wholesalePrice',
        'rrp': 'rrp',
        'moq': 'moq',
        'vatrate': 'vatRate',
        'isactive': 'isActive',
        'isfeatured': 'isFeatured',
        'imageurl': 'imageUrl',
        'countryoforigin': 'countryOfOrigin',
        'producttype': 'productType',
        'storageconditions': 'storageConditions',
      };

      const products = lines.slice(1).map((line, index) => {
        const values = parseCSVLine(line);
        const product: any = { _originalLine: line, _rowIndex: index };
        
        headers.forEach((header, i) => {
          const value = values[i] || '';
          const propertyName = headerMap[header] || header;
          
          // Handle boolean fields
          if (propertyName === 'isActive' || propertyName === 'isFeatured') {
            product[propertyName] = value.toLowerCase() === 'true' || value === '1';
          } 
          // Handle numeric fields
          else if (propertyName === 'moq') {
            product[propertyName] = parseInt(value) || 1;
          }
          // All other fields
          else {
            product[propertyName] = value;
          }
        });
        
        return product;
      }).filter(p => p.sku && p.productName);

      setParsedData(products);
    };
    
    reader.readAsText(selectedFile);
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    
    return result;
  };

  const handleImport = () => {
    if (!parsedData || parsedData.length === 0 || !file) return;
    importMutation.mutate({ products: parsedData, filename: file.name });
  };

  const downloadSampleCsv = () => {
    const blob = new Blob([sampleCsvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-products.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadErrorsCsv = (jobId: number) => {
    window.open(`/api/admin/import-jobs/${jobId}/errors.csv`, '_blank');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "queued":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Queued</Badge>;
      case "processing":
        return <Badge variant="default"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Completed</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Check if there's any job in progress
  const hasActiveJob = importJobs?.some(j => j.status === "queued" || j.status === "processing");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>
          CSV Product Import
        </h1>
        <p className="mt-2 text-muted-foreground">
          Bulk import or update products from a CSV file
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload CSV File
              </CardTitle>
              <CardDescription>
                Select a CSV file containing your product data. Import runs in background - you can leave this page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FileSpreadsheet className="w-8 h-8 mb-2 text-muted-foreground" />
                      <p className="mb-1 text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">CSV files only (up to 50MB)</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".csv"
                      onChange={handleFileChange}
                      data-testid="input-csv-file"
                    />
                  </label>
                </div>

                {file && (
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">{file.name}</span>
                    </div>
                    {parsedData && (
                      <Badge variant="secondary">{parsedData.length} products</Badge>
                    )}
                  </div>
                )}

                {parsedData && parsedData.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Preview (first 5 rows)</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">SKU</th>
                            <th className="text-left p-2">Product Name</th>
                            <th className="text-left p-2">Brand</th>
                            <th className="text-left p-2">Category</th>
                            <th className="text-left p-2">Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedData.slice(0, 5).map((product, i) => (
                            <tr key={i} className="border-b">
                              <td className="p-2">{product.sku}</td>
                              <td className="p-2 truncate max-w-[200px]">{product.productName}</td>
                              <td className="p-2">{product.brand}</td>
                              <td className="p-2">{product.category}</td>
                              <td className="p-2">{product.wholesalePrice ? `£${product.wholesalePrice}` : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleImport}
                  disabled={!parsedData || parsedData.length === 0 || importMutation.isPending || hasActiveJob}
                  className="w-full"
                  data-testid="button-import-products"
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting Import...
                    </>
                  ) : hasActiveJob ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Import in Progress...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import {parsedData?.length || 0} Products
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Active Job Progress */}
          {activeJob && (activeJob.status === "queued" || activeJob.status === "processing") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Import in Progress
                </CardTitle>
                <CardDescription>{activeJob.filename}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span className="font-medium">
                      {activeJob.processedRows} / {activeJob.totalRows} rows
                    </span>
                  </div>
                  <Progress 
                    value={activeJob.totalRows > 0 ? (activeJob.processedRows / activeJob.totalRows) * 100 : 0} 
                    className="h-2" 
                  />
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <div className="text-xl font-bold text-green-600">{activeJob.successCount}</div>
                    <div className="text-xs text-muted-foreground">Success</div>
                  </div>
                  <div className="p-3 bg-red-500/10 rounded-lg">
                    <div className="text-xl font-bold text-red-600">{activeJob.errorCount}</div>
                    <div className="text-xs text-muted-foreground">Errors</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-xl font-bold">{activeJob.totalRows - activeJob.processedRows}</div>
                    <div className="text-xs text-muted-foreground">Remaining</div>
                  </div>
                </div>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    You can leave this page - import continues in background. Check back for results.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Import History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Import History
                </span>
                <Button variant="ghost" size="icon" onClick={() => refetchJobs()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!importJobs || importJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No import history yet</p>
              ) : (
                <div className="space-y-3">
                  {importJobs.slice(0, 10).map((job) => (
                    <div 
                      key={job.id} 
                      className={`p-4 rounded-lg border ${activeJobId === job.id ? 'border-primary bg-primary/5' : 'bg-muted/30'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate max-w-[200px]">{job.filename}</span>
                          {getStatusBadge(job.status)}
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDate(job.createdAt)}</span>
                      </div>
                      
                      {job.status === "completed" || job.status === "failed" ? (
                        <div className="flex items-center justify-between">
                          <div className="text-sm">
                            <span className="text-green-600">{job.successCount} success</span>
                            {job.errorCount > 0 && (
                              <span className="text-red-600 ml-2">{job.errorCount} failed</span>
                            )}
                            <span className="text-muted-foreground ml-2">/ {job.totalRows} total</span>
                          </div>
                          <div className="flex gap-2">
                            {job.errorCount > 0 && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => downloadErrorsCsv(job.id)}
                                  data-testid={`button-download-errors-${job.id}`}
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  Errors
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => retryMutation.mutate(job.id)}
                                  disabled={retryMutation.isPending}
                                  data-testid={`button-retry-${job.id}`}
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Retry
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <Progress 
                          value={job.totalRows > 0 ? (job.processedRows / job.totalRows) * 100 : 0} 
                          className="h-1" 
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                CSV Format
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Required Columns</h4>
                <div className="flex flex-wrap gap-1">
                  {requiredColumns.map(col => (
                    <Badge key={col} variant="default">{col}</Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2">Optional Columns</h4>
                <div className="flex flex-wrap gap-1">
                  {optionalColumns.slice(0, 8).map(col => (
                    <Badge key={col} variant="secondary">{col}</Badge>
                  ))}
                  <Badge variant="outline">+{optionalColumns.length - 8} more</Badge>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={downloadSampleCsv}
              >
                <Download className="h-4 w-4" />
                Download Sample CSV
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>Existing products (by SKU) will be updated with new data.</p>
              <p>New brands and categories will be created automatically.</p>
              <p>Boolean fields accept: true/false or 1/0</p>
              <p>Prices should be in GBP without currency symbol.</p>
              <p>Maximum file size: 50MB</p>
              <p className="font-medium text-foreground">Import runs in background - you can leave the page!</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
