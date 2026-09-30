import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./auth";
import { useBasket } from "./basket";
import { apiRequest, queryClient } from "./queryClient";
import type { TradeProduct, QuoteLine, RequestRecord } from "./trade-preview";
type Delivery = {
    country: string;
    city: string;
    date: string;
    reference: string;
    notes: string;
};
const blankDelivery: Delivery = { country: "United Kingdom", city: "", date: "", reference: "", notes: "" };
export function quoteQuantity(line: QuoteLine) {
    const amount = Number(line.quantity), caseSize = Number(line.product.caseSize);
    if (!/^\d+$/.test(line.quantity) || !Number.isSafeInteger(amount) || amount < 1 || amount > 1000000)
        throw new Error("Enter a whole quantity between 1 and 1,000,000.");
    if (line.unit === "cases" && (!Number.isSafeInteger(caseSize) || caseSize < 1))
        throw new Error("Case size is not confirmed. Request units and include your case requirement in the notes.");
    const result = line.unit === "cases" ? amount * caseSize : amount;
    if (result > 1000000)
        throw new Error("The total units on one line cannot exceed 1,000,000.");
    return result;
}
export function useLiveTradeState() {
    const { user, isCustomer, isAdmin } = useAuth();
    const basket = useBasket();
    const key = "pharmaoasis-trade-live-draft";
    const [preferences, setPreferences] = useState<{
        saved: TradeProduct[];
        products: Record<number, TradeProduct>;
        units: Record<number, "units" | "cases">;
        quantities?: Record<number, string>;
        delivery: Delivery;
    }>({ saved: [], products: {}, units: {}, delivery: blankDelivery });
    const [loadedKey, setLoadedKey] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    useEffect(() => { try {
        const data = JSON.parse(localStorage.getItem(key) || "null");
        setPreferences(data && Array.isArray(data.saved) && data.products && data.units && data.delivery ? data : { saved: [], products: {}, units: {}, delivery: blankDelivery });
    }
    catch {
        setPreferences({ saved: [], products: {}, units: {}, delivery: blankDelivery });
    } setLoadedKey(key); }, [key]);
    useEffect(() => { if (loadedKey === key)
        try {
            localStorage.setItem(key, JSON.stringify(preferences));
        }
        catch { } }, [preferences, key, loadedKey]);
    const quotes = useQuery<any[]>({ queryKey: ["/api/quotes", user?.id], enabled: isCustomer || isAdmin, staleTime: 0, queryFn: async () => { const r = await fetch("/api/quotes", { credentials: "include" }); if (!r.ok)
            throw new Error("Could not load your quotations"); return r.json(); } });
    const statusLabel = (status: string) => ({ pending: "With your account team", draft: "With your account team", sent: "Response ready", quoted: "Response ready", accepted: "Accepted", declined: "Declined", closed: "Completed" }[status] || status);
    const requests: RequestRecord[] = (quotes.data || []).map(q => ({ id: q.id, reference: `Q-${q.id}`, title: `Quotation Q-${q.id}`, status: statusLabel(q.status), count: q.itemCount || 0, date: new Date(q.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) }));
    const lines: QuoteLine[] = basket.lines.filter(l => l.kind === "catalog").map(l => ({ product: preferences.products[l.refId] || { id: l.refId, productName: l.name, sku: l.sku || "", ean: l.sku, imageUrl: l.imageUrl, brandId: 0, categoryId: 0, packSize: l.packSize }, quantity: preferences.quantities?.[l.refId] ?? String(l.quantity), unit: preferences.units[l.refId] || "units" }));
    const add = (p: TradeProduct) => { if (lines.some(l => l.product.id === p.id))
        return; setPreferences(s => ({ ...s, products: { ...s.products, [p.id]: p }, units: { ...s.units, [p.id]: "units" }, quantities: { ...s.quantities, [p.id]: "1" } })); basket.add({ kind: "catalog", refId: p.id, name: p.productName, sku: p.ean || p.sku, imageUrl: p.imageUrl, packSize: p.packSize, price: null, quantity: 1 }); };
    const update = (id: number, patch: Partial<Pick<QuoteLine, "quantity" | "unit">>) => { if (patch.quantity !== undefined) {
        setPreferences(s => ({ ...s, quantities: { ...s.quantities, [id]: patch.quantity! } }));
        if (/^\d+$/.test(patch.quantity) && Number(patch.quantity) > 0)
            basket.setQty(`catalog:${id}`, Number(patch.quantity));
    } if (patch.unit)
        setPreferences(s => ({ ...s, units: { ...s.units, [id]: patch.unit! } })); };
    const remove = (id: number) => basket.remove(`catalog:${id}`);
    const save = (p: TradeProduct) => setPreferences(s => ({ ...s, saved: s.saved.some(x => x.id === p.id) ? s.saved.filter(x => x.id !== p.id) : [...s.saved, p] }));
    const setDelivery = (patch: Partial<Delivery>) => setPreferences(s => ({ ...s, delivery: { ...s.delivery, ...patch } }));
    const submit = async () => {
        setError("");
        if (!isCustomer && !isAdmin) {
            setError("Sign in to your approved trade account to send this enquiry.");
            return "";
        }
        if (submitting)
            return "";
        setSubmitting(true);
        try {
            const d = preferences.delivery;
            const notes = [`Destination: ${d.city}, ${d.country}`, d.date ? `Preferred delivery: ${d.date}` : "", d.reference ? `Customer reference: ${d.reference}` : "", d.notes,
                ...lines.filter(l => l.unit === "cases").map(l => `${l.product.ean || l.product.sku}: ${l.quantity} cases × ${l.product.caseSize} = ${quoteQuantity(l)} units`)].filter(Boolean).join("\n");
            const response = await apiRequest("POST", "/api/quotes", { items: lines.map(l => ({ productId: l.product.id, quantity: quoteQuantity(l) })), customerNotes: notes });
            const result = await response.json();
            lines.forEach(l => remove(l.product.id));
            setPreferences(s => ({ ...s, delivery: blankDelivery }));
            await queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
            return `Q-${result.quote.id}`;
        }
        catch (e) {
            setError((e as Error).message || "Your enquiry could not be sent. Your draft has been kept.");
            return "";
        }
        finally {
            setSubmitting(false);
        }
    };
    return { lines, saved: preferences.saved, requests, delivery: preferences.delivery, add, remove, update, save, setDelivery, submit, repeat: (items: QuoteLine[]) => items.forEach(l => add(l.product)), submitting, error, canSubmit: isCustomer || isAdmin };
}
