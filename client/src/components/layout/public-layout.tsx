import type { ReactNode } from "react";
import { Header } from "./header";
import { Footer } from "./footer";
import { WhatsAppButton } from "../whatsapp-button";
import { ChatWidget } from "../chat-widget";

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
      <WhatsAppButton />
      <ChatWidget />
    </div>
  );
}
