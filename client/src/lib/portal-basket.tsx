// Compatibility shim — the portal basket is now backed by the single unified
// basket store (see ./basket). Kept so existing imports keep working.
export { usePortalBasket, BasketProvider as PortalBasketProvider, type PortalProduct } from "./basket";
