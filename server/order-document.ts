// ============================================================
// E3 — Sales-order documents. Renders a confirmed order as a
// human-readable PDF and an .xlsx the salesman processes manually
// in the inventory SaaS (until the E6 API push replaces this).
// Locked default columns (SALES_WORKSPACE_PLAN.md):
//   Order Ref, Date, Customer, EAN, Description, Quantity, Unit Price, Line Total, Delivery Notes
// ============================================================
import * as XLSX from "xlsx";
import PDFDocument from "pdfkit";
import type { Order, OrderItem } from "@shared/schema";

export interface OrderDocCustomer {
  companyName?: string | null;
  primaryContactName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  deliveryAddressLine1?: string | null;
  deliveryAddressLine2?: string | null;
}

export interface OrderDocData {
  order: Order;
  items: (OrderItem & { productName?: string | null })[];
  customer: OrderDocCustomer | null;
}

const money = (n: any) => (n === null || n === undefined || n === "" ? "" : Number(n).toFixed(2));
const dateStr = (d: any) => (d ? new Date(d).toLocaleDateString("en-GB") : "");
const itemName = (it: any) => it.productName || it.description || it.ean || "Item";
const customerName = (c: OrderDocCustomer | null) => (c ? c.companyName || c.primaryContactName || c.email || "" : "");

export function buildOrderXlsx(data: OrderDocData): Buffer {
  const { order, items, customer } = data;
  const ref = `O-${order.id}`;
  const cust = customerName(customer);
  const notes = order.customerNotes || "";

  const header = ["Order Ref", "Date", "Customer", "EAN", "Description", "Quantity", "Unit Price", "Line Total", "Delivery Notes"];
  const rows = items.map((it) => [
    ref,
    dateStr(order.createdAt),
    cust,
    it.ean || "",
    itemName(it),
    it.quantity,
    money(it.unitPrice),
    money(it.lineTotal),
    notes,
  ]);
  const grandTotal = items.reduce((s, it) => s + (it.lineTotal != null ? Number(it.lineTotal) : 0), 0);

  const aoa: any[][] = [
    [`Sales Order ${ref}`],
    [`Customer: ${cust}`],
    [`Date: ${dateStr(order.createdAt)}`],
    [],
    header,
    ...rows,
    [],
    ["", "", "", "", "", "", "Order Total", grandTotal.toFixed(2), ""],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [{ wch: 10 }, { wch: 12 }, { wch: 26 }, { wch: 16 }, { wch: 40 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 30 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sales Order");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

export function buildOrderPdf(data: OrderDocData): Promise<Buffer> {
  const { order, items, customer } = data;
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const ref = `O-${order.id}`;

    // Header
    doc.fontSize(18).fillColor("#0f766e").text("Pharma Oasis", { continued: false });
    doc.fontSize(14).fillColor("#111").text(`Sales Order ${ref}`);
    doc.fontSize(9).fillColor("#666").text(`Date: ${dateStr(order.createdAt)}   ·   Status: ${order.status}`);
    doc.moveDown(0.8);

    // Customer block
    doc.fontSize(10).fillColor("#111").text("Customer", { underline: true });
    doc.fontSize(9).fillColor("#333");
    if (customer?.companyName) doc.text(customer.companyName);
    if (customer?.primaryContactName) doc.text(customer.primaryContactName);
    if (customer?.email) doc.text(customer.email);
    if (customer?.phoneNumber) doc.text(customer.phoneNumber);
    const addr = [customer?.deliveryAddressLine1, customer?.deliveryAddressLine2].filter(Boolean).join(", ");
    if (addr) doc.text(addr);
    doc.moveDown(0.8);

    // Line-item table
    const cols = [
      { label: "EAN", w: 95 },
      { label: "Description", w: 215 },
      { label: "Qty", w: 45, right: true },
      { label: "Unit £", w: 65, right: true },
      { label: "Line £", w: 75, right: true },
    ];
    const startX = doc.page.margins.left;
    const tableW = cols.reduce((s, c) => s + c.w, 0);
    const rowH = 18;

    const drawHeader = (y: number) => {
      doc.rect(startX, y, tableW, rowH).fill("#0f766e");
      doc.fillColor("#fff").fontSize(8.5);
      let x = startX;
      for (const c of cols) {
        doc.text(c.label, x + 4, y + 5, { width: c.w - 8, align: c.right ? "right" : "left", ellipsis: true });
        x += c.w;
      }
      return y + rowH;
    };

    let y = drawHeader(doc.y);
    let i = 0;
    for (const it of items) {
      if (y + rowH > doc.page.height - doc.page.margins.bottom - 60) {
        doc.addPage();
        y = drawHeader(doc.page.margins.top);
      }
      if (i % 2 === 0) doc.rect(startX, y, tableW, rowH).fill("#f1f5f9");
      doc.fillColor("#111").fontSize(8);
      const cells = [it.ean || "", itemName(it), String(it.quantity), money(it.unitPrice) || "On request", money(it.lineTotal) || "—"];
      let x = startX;
      cells.forEach((val, idx) => {
        doc.text(String(val), x + 4, y + 5, { width: cols[idx].w - 8, align: cols[idx].right ? "right" : "left", ellipsis: true, lineBreak: false });
        x += cols[idx].w;
      });
      y += rowH;
      i++;
    }
    if (items.length === 0) {
      doc.fillColor("#666").fontSize(10).text("No line items.", startX, y + 10);
      y += 30;
    }

    // Grand total
    const grandTotal = items.reduce((s, it) => s + (it.lineTotal != null ? Number(it.lineTotal) : 0), 0);
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor("#111").text(`Order Total: £${grandTotal.toFixed(2)}`, startX, y + 8, { width: tableW, align: "right" });

    // Delivery / notes
    if (order.customerNotes) {
      doc.moveDown(1.2);
      doc.fontSize(9).fillColor("#111").text("Delivery notes", { underline: true });
      doc.fontSize(9).fillColor("#333").text(order.customerNotes, { width: tableW });
    }

    doc.end();
  });
}
