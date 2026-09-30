export interface QuoteEmailLine {
  ean?: string | null;
  description?: string | null;
  quantity: number;
  unitPrice?: string | number | null;
}

export function escapeEmail(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function quoteEmailLines(lines: QuoteEmailLine[]): string {
  return `<table style="width:100%;border-collapse:collapse;margin-top:20px"><thead><tr>
    <th style="text-align:left;padding:8px;border-bottom:1px solid #cbd5e1">Product</th>
    <th style="text-align:left;padding:8px;border-bottom:1px solid #cbd5e1">EAN</th>
    <th style="text-align:right;padding:8px;border-bottom:1px solid #cbd5e1">Quantity (units)</th>
    </tr></thead><tbody>${lines.map(l => `<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">${escapeEmail(l.description || "Product description unavailable")}</td>
    <td style="padding:8px;border-bottom:1px solid #e2e8f0;font-family:monospace">${escapeEmail(l.ean || "EAN not available — review required")}</td>
    <td style="text-align:right;padding:8px;border-bottom:1px solid #e2e8f0">${escapeEmail(l.quantity)}</td></tr>`).join("")}</tbody></table>`;
}
