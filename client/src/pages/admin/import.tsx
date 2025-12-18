import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
} from "lucide-react";

interface FailedRow {
  rowNumber: number;
  data: Record<string, any>;
  error: string;
}

interface ImportResult {
  created: number;
  updated: number;
  failed: number;
  total: number;
  errors: string[];
  failedRows: FailedRow[];
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
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  const importMutation = useMutation({
    mutationFn: async (products: any[]): Promise<ImportResult> => {
      const res = await apiRequest("POST", "/api/admin/products/import", { products });
      return res.json();
    },
    onSuccess: (result: ImportResult) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      
      if (result.failed > 0) {
        toast({ 
          title: "Import completed with errors",
          description: `${result.created + result.updated} succeeded, ${result.failed} failed`,
          variant: "destructive"
        });
      } else {
        toast({ 
          title: "Import completed successfully",
          description: `${result.created} created, ${result.updated} updated`
        });
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Import failed", 
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
    setImportResult(null);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({ title: "CSV file is empty or has no data rows", variant: "destructive" });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
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

      const products = lines.slice(1).map((line, index) => {
        const values = parseCSVLine(line);
        const product: any = { _originalLine: line, _rowIndex: index };
        
        headers.forEach((header, i) => {
          let value = values[i] || '';
          
          if (header === 'isactive' || header === 'isfeatured') {
            product[header === 'isactive' ? 'isActive' : 'isFeatured'] = 
              value.toLowerCase() === 'true' || value === '1';
          } else if (header === 'moq') {
            product.moq = parseInt(value) || 1;
          } else if (header === 'productname') {
            product.productName = value;
          } else if (header === 'wholesaleprice') {
            product.wholesalePrice = value;
          } else if (header === 'shortdescription') {
            product.shortDescription = value;
          } else if (header === 'longdescription') {
            product.longDescription = value;
          } else if (header === 'packsize') {
            product.packSize = value;
          } else if (header === 'casesize') {
            product.caseSize = value;
          } else if (header === 'vatrate') {
            product.vatRate = value;
          } else if (header === 'imageurl') {
            product.imageUrl = value;
          } else if (header === 'countryoforigin') {
            product.countryOfOrigin = value;
          } else if (header === 'producttype') {
            product.productType = value;
          } else if (header === 'storageconditions') {
            product.storageConditions = value;
          } else {
            product[header] = value;
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
    if (!parsedData || parsedData.length === 0) return;
    importMutation.mutate(parsedData);
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

  const downloadFailedRows = () => {
    if (!importResult || importResult.failedRows.length === 0) return;
    
    const headers = originalHeaders.length > 0 ? originalHeaders : Object.keys(importResult.failedRows[0].data);
    const headerLine = [...headers, 'error_message'].join(',');
    
    const dataLines = importResult.failedRows.map(row => {
      const values = headers.map(h => {
        const key = h.toLowerCase();
        let value = row.data[key] || row.data[h] || '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      values.push(`"${row.error.replace(/"/g, '""')}"`);
      return values.join(',');
    });
    
    const csvContent = [headerLine, ...dataLines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `failed-imports-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const successCount = importResult ? importResult.created + importResult.updated : 0;
  const successRate = importResult && importResult.total > 0 
    ? Math.round((successCount / importResult.total) * 100) 
    : 0;

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
                Select a CSV file containing your product data
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
                  disabled={!parsedData || parsedData.length === 0 || importMutation.isPending}
                  className="w-full"
                  data-testid="button-import-products"
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
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

          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {importResult.failed > 0 ? (
                    <FileWarning className="h-5 w-5 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  Import Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Success Rate</span>
                    <span className="font-medium">{successRate}%</span>
                  </div>
                  <Progress value={successRate} className="h-2" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-foreground">{importResult.total}</div>
                    <div className="text-xs text-muted-foreground">Total Rows</div>
                  </div>
                  <div className="text-center p-4 bg-green-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{importResult.created}</div>
                    <div className="text-xs text-muted-foreground">Created</div>
                  </div>
                  <div className="text-center p-4 bg-blue-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{importResult.updated}</div>
                    <div className="text-xs text-muted-foreground">Updated</div>
                  </div>
                  <div className="text-center p-4 bg-red-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                </div>

                {importResult.failed > 0 && (
                  <>
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertTitle>{importResult.failed} rows failed to import</AlertTitle>
                      <AlertDescription>
                        Download the failed rows to fix the errors and re-upload them.
                      </AlertDescription>
                    </Alert>

                    <Button 
                      variant="outline" 
                      className="w-full gap-2"
                      onClick={downloadFailedRows}
                      data-testid="button-download-failed"
                    >
                      <Download className="h-4 w-4" />
                      Download Failed Rows ({importResult.failed})
                    </Button>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Error Details (first 10)</h4>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                        {importResult.errors.slice(0, 10).map((error, i) => (
                          <div key={i} className="text-xs p-2 bg-red-500/5 rounded text-red-700 dark:text-red-400">
                            {error}
                          </div>
                        ))}
                        {importResult.errors.length > 10 && (
                          <div className="text-xs text-muted-foreground p-2">
                            ...and {importResult.errors.length - 10} more errors
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {importResult.failed === 0 && (
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>All products imported successfully</AlertTitle>
                    <AlertDescription>
                      {importResult.created} new products created and {importResult.updated} existing products updated.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
