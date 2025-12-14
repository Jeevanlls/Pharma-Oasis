import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

const SESSION_KEY = "po_session_id";

function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function usePageTracking(pageTitle?: string) {
  const [location] = useLocation();
  const lastTrackedRef = useRef<{ path: string; title: string } | null>(null);

  useEffect(() => {
    const pathOnly = location.split("?")[0].split("#")[0];
    const title = pageTitle || document.title;
    
    if (lastTrackedRef.current?.path === pathOnly && lastTrackedRef.current?.title === title) {
      return;
    }
    lastTrackedRef.current = { path: pathOnly, title };

    const trackPageView = async () => {
      try {
        await fetch("/api/analytics/pageview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            pagePath: pathOnly,
            pageTitle: title,
            sessionId: getSessionId(),
            referrer: document.referrer || null,
          }),
        });
      } catch (error) {
        // Silent fail - analytics should not break user experience
      }
    };

    trackPageView();
  }, [location, pageTitle]);
}

export function PageTracker({ title }: { title?: string }) {
  usePageTracking(title);
  return null;
}
