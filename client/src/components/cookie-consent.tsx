import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Cookie, X } from "lucide-react";

const COOKIE_CONSENT_KEY = "pharma_oasis_cookie_consent";

type ConsentStatus = "pending" | "accepted" | "rejected";

export function CookieConsentBanner() {
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>("pending");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const storedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (storedConsent === "accepted" || storedConsent === "rejected") {
      setConsentStatus(storedConsent as ConsentStatus);
      setIsVisible(false);
    } else {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setConsentStatus("accepted");
    setIsVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "rejected");
    setConsentStatus("rejected");
    setIsVisible(false);
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
      role="dialog"
      aria-label="Cookie consent"
      data-testid="cookie-consent-banner"
    >
      <Card className="mx-auto max-w-4xl border-2 shadow-lg">
        <div className="p-4 md:p-6">
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Cookie className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Cookie Preferences</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    We use essential cookies to make our website work. We'd also like to set optional 
                    analytics cookies to help us improve our services. You can manage your preferences 
                    at any time. For more information, please read our{" "}
                    <Link href="/cookies" className="text-primary hover:underline">
                      Cookie Policy
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-primary hover:underline">
                      Privacy Policy
                    </Link>.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  className="shrink-0 -mt-1 -mr-2"
                  aria-label="Close cookie banner"
                  data-testid="button-close-cookie-banner"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={handleAccept}
                  data-testid="button-accept-cookies"
                >
                  Accept All Cookies
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleReject}
                  data-testid="button-reject-cookies"
                >
                  Essential Cookies Only
                </Button>
                <Link href="/cookies">
                  <Button variant="ghost" data-testid="link-manage-cookies">
                    Manage Preferences
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function useCookieConsent() {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);

  useEffect(() => {
    const storedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    setHasConsent(storedConsent === "accepted");
  }, []);

  return hasConsent;
}
