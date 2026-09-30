// EANs are identifiers, never numbers. Keep leading zeros and historic snapshots.
export function quoteEan(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== "string" || !value.trim()) continue;
    const compact = value.replace(/\s/g, "");
    return /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(compact) ? compact : value.trim();
  }
  return null;
}

export function quoteLineIdentity<T extends { ean?: string | null; description?: string | null }>(
  item: T,
  product?: { ean?: string | null; productName?: string | null },
  priceItem?: { ean?: string | null; description?: string | null },
) {
  return {
    ...item,
    ean: quoteEan(item.ean, product?.ean, priceItem?.ean),
    description: item.description?.trim() || product?.productName || priceItem?.description || null,
  };
}

export function quoteVersionLine<T extends { id: number; quoteId: number; createdAt: Date }>(item: T, quoteId: number) {
  const { id: _id, createdAt: _createdAt, quoteId: _oldQuoteId, ...snapshot } = item;
  return { ...snapshot, quoteId };
}

export function quoteTotalLabel(lines: { unitPrice?: unknown }[], total: number): string {
  return lines.some(l => l.unitPrice == null || l.unitPrice === "")
    ? "Price on request — sales team to confirm"
    : `£${total.toFixed(2)}`;
}
