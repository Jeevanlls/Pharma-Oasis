import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Header } from "./header";
import { Footer } from "./footer";
import { WhatsAppButton } from "../whatsapp-button";

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const [location] = useLocation();
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [location]);
  return (
    <div className="po-design min-h-screen flex flex-col bg-background">
      <a className="po-skip" href="#main-content">
        Skip to content
      </a>
      <Header />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
