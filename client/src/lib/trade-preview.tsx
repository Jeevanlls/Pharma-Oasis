import { useLiveTradeState } from "./trade-live";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
export type TradeProduct = {
    id: number;
    productName: string;
    ean?: string | null;
    sku: string;
    imageUrl?: string | null;
    brandId: number;
    categoryId: number;
    packSize?: string | null;
    caseSize?: string | null;
    slug?: string | null;
};
export type QuoteLine = {
    product: TradeProduct;
    quantity: string;
    unit: "units" | "cases";
};
export type RequestRecord = {
    id?: number;
    reference: string;
    title: string;
    status: string;
    count: number;
    date: string;
    lines?: QuoteLine[];
    delivery?: Delivery;
};
type Delivery = {
    country: string;
    city: string;
    date: string;
    reference: string;
    notes: string;
};
type State = {
    lines: QuoteLine[];
    saved: TradeProduct[];
    requests: RequestRecord[];
    delivery: Delivery;
};
const initial: State = { lines: [], saved: [], requests: [], delivery: { country: "United Kingdom", city: "", date: "", reference: "", notes: "" } };
const KEY = "pharmaoasis-trade-design-preview-pm-v2";
const Context = createContext<(ReturnType<typeof usePreviewState> | ReturnType<typeof useLiveTradeState>) | null>(null);
function usePreviewState() {
    const [state, setState] = useState<State>(() => { try {
        const stored = JSON.parse(localStorage.getItem(KEY) || "null");
        return stored && Array.isArray(stored.lines) && Array.isArray(stored.saved) && Array.isArray(stored.requests) && stored.delivery ? stored : initial;
    }
    catch {
        return initial;
    } });
    useEffect(() => { try {
        localStorage.setItem(KEY, JSON.stringify(state));
    }
    catch { /* Browser storage may be unavailable; this session still works. */ } }, [state]);
    const add = (product: TradeProduct) => setState(s => s.lines.some(l => l.product.id === product.id) ? s : { ...s, lines: [...s.lines, { product, quantity: "1", unit: "units" }] });
    const remove = (id: number) => setState(s => ({ ...s, lines: s.lines.filter(l => l.product.id !== id) }));
    const update = (id: number, patch: Partial<Pick<QuoteLine, "quantity" | "unit">>) => setState(s => ({ ...s, lines: s.lines.map(l => l.product.id === id ? { ...l, ...patch } : l) }));
    const save = (product: TradeProduct) => setState(s => ({ ...s, saved: s.saved.some(p => p.id === product.id) ? s.saved.filter(p => p.id !== product.id) : [...s.saved, product] }));
    const delivery = (patch: Partial<Delivery>) => setState(s => ({ ...s, delivery: { ...s.delivery, ...patch } }));
    const submit = () => { const reference = `DEMO-${Date.now().toString().slice(-7)}`; setState(s => ({ ...s, requests: [{ reference, title: s.delivery.reference || "New product enquiry", status: "Preview submitted", count: s.lines.length, date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }), lines: s.lines, delivery: { ...s.delivery } }, ...s.requests], lines: [], delivery: initial.delivery })); return reference; };
    const repeat = (lines: QuoteLine[]) => setState(s => ({ ...s, lines: [...s.lines, ...lines.filter(l => !s.lines.some(current => current.product.id === l.product.id))] }));
    return { ...state, add, remove, update, save, setDelivery: delivery, submit, repeat, submitting: false, error: "", canSubmit: true };
}
export function TradePreviewProvider({ children }: {
    children: ReactNode;
}) { const value = import.meta.env.VITE_REVIEW_PREVIEW === "true" ? usePreviewState() : useLiveTradeState(); return <Context.Provider value={value}>{children}</Context.Provider>; }
export function useTradePreview() { const value = useContext(Context); if (!value)
    throw new Error("Trade preview provider is missing"); return value; }
