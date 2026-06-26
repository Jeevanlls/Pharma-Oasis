import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

// ============================================================
// UNIFIED BASKET — one shared basket across the public site and
// the customer portal (D2). A line is either a main-catalogue
// product (`kind:"catalog"`, refId = product id) or a prepared
// price-list item (`kind:"portal"`, refId = price-list-item id).
// Catalogue lines have no client-known price (main site shows no
// prices) → price:null = "on request"; the server resolves the
// customer's real price by EAN at submit time (see buildPricedLines).
// ============================================================

export type BasketKind = "catalog" | "portal";

export interface BasketLine {
  key: string; // `${kind}:${refId}` — stable identity, prevents catalog/portal collisions
  kind: BasketKind;
  refId: number;
  name: string;
  sku?: string | null;
  imageUrl?: string | null;
  price: number | null; // null = price on request / not known to the client
  availability?: string | null;
  packSize?: string | null;
  quantity: number;
}

interface BasketContextType {
  lines: BasketLine[];
  add: (line: Omit<BasketLine, "key">) => void;
  remove: (key: string) => void;
  setQty: (key: string, quantity: number) => void;
  clear: () => void;
  itemCount: number; // total units across both kinds (shared indicator)
  total: number; // sum of priced lines only
  allPriced: boolean; // true only if every line has a known price (→ may place an order)
}

const STORAGE_KEY = "pharma_oasis_basket";
const BasketContext = createContext<BasketContextType | undefined>(undefined);
const keyOf = (kind: BasketKind, refId: number) => `${kind}:${refId}`;

export function BasketProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<BasketLine[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines]);

  const add: BasketContextType["add"] = (line) => {
    const key = keyOf(line.kind, line.refId);
    const quantity = Math.max(1, Number(line.quantity) || 1);
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, ...line, key, quantity: l.quantity + quantity } : l));
      }
      return [...prev, { ...line, key, quantity }];
    });
  };

  const remove = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));

  const setQty = (key: string, quantity: number) => {
    if (quantity <= 0) return remove(key);
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, quantity } : l)));
  };

  const clear = () => setLines([]);

  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);
  const total = lines.reduce((s, l) => s + (l.price ?? 0) * l.quantity, 0);
  const allPriced = lines.length > 0 && lines.every((l) => l.price != null);

  return (
    <BasketContext.Provider value={{ lines, add, remove, setQty, clear, itemCount, total, allPriced }}>
      {children}
    </BasketContext.Provider>
  );
}

export function useBasket() {
  const ctx = useContext(BasketContext);
  if (ctx === undefined) throw new Error("useBasket must be used within a BasketProvider");
  return ctx;
}

// ============================================================
// Backward-compatible adapters over the single shared store, so
// existing add-to-basket call-sites and indicators keep working
// unchanged. `itemCount` is the SHARED total in both adapters.
// ============================================================

/** Public-site catalogue adapter (main/advertised products). */
export function useQuoteBasket() {
  const b = useBasket();
  return {
    addItem: (p: any, quantity = 1) => {
      const refId = p?.id ?? p?.productId;
      const qty = p?.quantity ?? quantity ?? 1; // product-detail passes quantity inside the object
      b.add({ kind: "catalog", refId, name: p?.productName ?? "Product", sku: p?.sku ?? null, imageUrl: p?.imageUrl ?? null, price: null, quantity: qty });
    },
    removeItem: (refId: number) => b.remove(keyOf("catalog", refId)),
    updateQuantity: (refId: number, quantity: number) => b.setQty(keyOf("catalog", refId), quantity),
    clearBasket: b.clear,
    itemCount: b.itemCount,
    totalEstimate: b.total,
    items: b.lines.filter((l) => l.kind === "catalog").map((l) => ({ product: { id: l.refId, productName: l.name, sku: l.sku, imageUrl: l.imageUrl }, quantity: l.quantity })),
  };
}

/** Portal adapter (prepared price-list items). */
export function usePortalBasket() {
  const b = useBasket();
  return {
    addItem: (p: any, quantity = 1) =>
      b.add({ kind: "portal", refId: p.id, name: p.productName, sku: p.sku ?? null, imageUrl: p.imageUrl ?? null, price: p.price ?? null, availability: p.availability, packSize: p.packSize ?? null, quantity }),
    removeItem: (refId: number) => b.remove(keyOf("portal", refId)),
    updateQuantity: (refId: number, quantity: number) => b.setQty(keyOf("portal", refId), quantity),
    clearBasket: b.clear,
    itemCount: b.itemCount,
    total: b.total,
    items: b.lines.filter((l) => l.kind === "portal").map((l) => ({ product: { id: l.refId, productName: l.name, sku: l.sku, imageUrl: l.imageUrl, price: l.price, availability: l.availability, packSize: l.packSize }, quantity: l.quantity })),
  };
}

export interface PortalProduct {
  id: number;
  productName: string;
  sku: string;
  imageUrl?: string | null;
  price: number | null;
  availability: string;
  availableQty?: number | null;
  packSize?: string | null;
  caseSize?: string | null;
}
