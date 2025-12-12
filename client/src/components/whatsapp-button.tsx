import { useQuery } from "@tanstack/react-query";
import { SiWhatsapp } from "react-icons/si";

interface SiteSettings {
  whatsapp_number?: string;
}

export function WhatsAppButton() {
  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ["/api/site-settings"],
  });

  const whatsappNumber = settings?.whatsapp_number;

  if (!whatsappNumber) {
    return null;
  }

  const cleanNumber = whatsappNumber.replace(/[^0-9]/g, "");
  const whatsappUrl = `https://wa.me/${cleanNumber}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
      aria-label="Chat on WhatsApp"
      data-testid="button-whatsapp-chat"
    >
      <SiWhatsapp className="w-7 h-7" />
    </a>
  );
}
