import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

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

export interface PortalBasketItem {
  product: PortalProduct;
  quantity: number;
}

interface PortalBasketContextType {
  items: PortalBasketItem[];
  addItem: (product: PortalProduct, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearBasket: () => void;
  itemCount: number;
  total: number;
}

const STORAGE_KEY = "pharma_oasis_portal_basket";
const PortalBasketContext = createContext<PortalBasketContextType | undefined>(undefined);

export function PortalBasketProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<PortalBasketItem[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try { return JSON.parse(stored); } catch { return []; }
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (product: PortalProduct, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + quantity, product } : i));
      }
      return [...prev, { product, quantity }];
    });
  };

  const removeItem = (productId: number) => setItems((prev) => prev.filter((i) => i.product.id !== productId));

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) return removeItem(productId);
    setItems((prev) => prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i)));
  };

  const clearBasket = () => setItems([]);

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);
  const total = items.reduce((s, i) => s + (i.product.price ?? 0) * i.quantity, 0);

  return (
    <PortalBasketContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearBasket, itemCount, total }}>
      {children}
    </PortalBasketContext.Provider>
  );
}

export function usePortalBasket() {
  const ctx = useContext(PortalBasketContext);
  if (ctx === undefined) throw new Error("usePortalBasket must be used within a PortalBasketProvider");
  return ctx;
}
