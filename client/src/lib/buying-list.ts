export interface BuyingLine {
  ean: string;
  quantity: number;
}
/** EANs are strings, preserving leading zeroes. All lines validate before lookup/add. */
export function parseBuyingList(raw: string): BuyingLine[] {
  const rows = raw
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);
  if (!rows.length) throw new Error("Enter at least one EAN and quantity.");
  if (rows.length > 50) throw new Error("Please use up to 50 lines at a time.");
  const combined = new Map<string, number>();
  rows.forEach((row, index) => {
    const parts = row.split(/[,;\t ]+/);
    if (
      parts.length !== 2 ||
      !/^\d{8,14}$/.test(parts[0]) ||
      !/^\d+$/.test(parts[1])
    )
      throw new Error(
        `Check line ${index + 1}: use an EAN and a whole quantity, separated by a comma or tab.`,
      );
    const quantity = Number(parts[1]);
    const total = (combined.get(parts[0]) || 0) + quantity;
    if (!Number.isSafeInteger(quantity) || quantity < 1 || total > 99999)
      throw new Error(
        `Check line ${index + 1}: the total quantity for one EAN must be 1–99,999.`,
      );
    combined.set(parts[0], total);
  });
  return Array.from(combined, ([ean, quantity]) => ({ ean, quantity }));
}

export interface BuyingProduct {
  itemId: number;
  description: string | null;
  ean: string | null;
  price: number | null;
  availability: string;
  imageUrl?: string | null;
  caseSize?: string | null;
}
export async function resolveBuyingList(
  lines: BuyingLine[],
  lookup: (ean: string) => Promise<BuyingProduct[]>,
) {
  const resolved: { product: BuyingProduct; quantity: number }[] = [];
  // Sequential reads avoid flooding the catalogue with 50 parallel searches.
  for (const line of lines) {
    const matches = (await lookup(line.ean)).filter(
      (product) => product.ean === line.ean,
    );
    if (matches.length !== 1)
      throw new Error(
        `${line.ean}: ${matches.length ? "more than one match; please ask the team" : "not found in your catalogue"}. Nothing has been added.`,
      );
    if (matches[0].availability === "out_of_stock")
      throw new Error(
        `${line.ean}: currently out of stock. Nothing has been added.`,
      );
    resolved.push({ product: matches[0], quantity: line.quantity });
  }
  return resolved;
}
