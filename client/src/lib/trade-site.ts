import { useQuery } from "@tanstack/react-query";
import type { Offer } from "@shared/schema";
export function useTradeSettings() {
  return useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
    staleTime: 60_000,
  });
}
export function whatsappHref(settings?: Record<string, string>) {
  const number = settings?.whatsapp_number?.replace(/\D/g, "");
  return number
    ? `https://wa.me/${number}?text=${encodeURIComponent("Hello Pharma Oasis, I'd like to hear about your trade offers.")}`
    : "/contact";
}
// Recheck scheduled offers on open tabs too; never leave an expired edit on screen.
export function currentOffers(offers: Offer[], now = Date.now()) {
  return offers.filter(
    (offer) =>
      offer.isActive &&
      new Date(offer.startDate).getTime() <= now &&
      new Date(offer.endDate).getTime() >= now,
  );
}
export function useCurrentOffers() {
  const query = useQuery<Offer[]>({
    queryKey: ["/api/offers"],
    staleTime: 0,
    refetchInterval: 60_000,
  });
  return { ...query, data: currentOffers(query.data ?? []) };
}
