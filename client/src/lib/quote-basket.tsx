// Compatibility shim — the public-site quote basket is now backed by the single
// unified basket store (see ./basket). Kept so existing imports keep working.
export { useQuoteBasket, BasketProvider as QuoteBasketProvider } from "./basket";
