import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Download, Share, Plus, Smartphone } from "lucide-react";

function isStandalone(): boolean {
  return (
    (typeof window !== "undefined" &&
      (window.matchMedia?.("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true)) || false
  );
}
function isIOS(): boolean {
  return typeof window !== "undefined" && /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !(window as any).MSStream;
}

/** Shared install state: captures the Android/desktop install prompt and detects iOS. */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null);
  const [installed, setInstalled] = useState<boolean>(isStandalone());

  useEffect(() => {
    if (isStandalone()) { setInstalled(true); return; }
    const onBIP = (e: any) => { e.preventDefault(); setDeferred(e); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch {}
    setDeferred(null);
  };

  return { installed, canInstall: !!deferred, ios: isIOS(), promptInstall };
}

function IosInstallDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Install Pharma Oasis</DialogTitle>
          <DialogDescription>Add the app to your iPhone or iPad home screen — it opens full-screen like an app.</DialogDescription>
        </DialogHeader>
        <ol className="text-sm space-y-3">
          <li className="flex items-start gap-2"><Share className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" /> In Safari, tap the <strong>Share</strong> icon (square with an up-arrow) at the bottom.</li>
          <li className="flex items-start gap-2"><Plus className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" /> Scroll down and tap <strong>Add to Home Screen</strong>.</li>
          <li className="flex items-start gap-2"><Smartphone className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" /> Tap <strong>Add</strong> — the Pharma Oasis icon appears on your home screen.</li>
        </ol>
      </DialogContent>
    </Dialog>
  );
}

/** Compact install button for headers/toolbars. Renders nothing if already installed or not installable. */
export function InstallAppButton({ className }: { className?: string }) {
  const { installed, canInstall, ios, promptInstall } = useInstallPrompt();
  const [showIos, setShowIos] = useState(false);
  if (installed) return null;
  if (canInstall)
    return <Button variant="outline" size="sm" className={className} onClick={promptInstall}><Download className="h-4 w-4 mr-1.5" /> Install app</Button>;
  if (ios)
    return (
      <>
        <Button variant="outline" size="sm" className={className} onClick={() => setShowIos(true)}><Download className="h-4 w-4 mr-1.5" /> Install app</Button>
        <IosInstallDialog open={showIos} onClose={() => setShowIos(false)} />
      </>
    );
  return null;
}

/** Prominent install card for the dashboard. */
export function InstallAppCard() {
  const { installed, canInstall, ios, promptInstall } = useInstallPrompt();
  const [showIos, setShowIos] = useState(false);
  if (installed || (!canInstall && !ios)) return null;
  return (
    <Card className="border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <Smartphone className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Install the Pharma Oasis app</p>
          <p className="text-sm text-muted-foreground">Add it to your home screen — full-screen, one tap to open, works like an app.</p>
        </div>
        {canInstall ? (
          <Button onClick={promptInstall} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"><Download className="h-4 w-4 mr-1.5" /> Install</Button>
        ) : (
          <>
            <Button onClick={() => setShowIos(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"><Download className="h-4 w-4 mr-1.5" /> How to install</Button>
            <IosInstallDialog open={showIos} onClose={() => setShowIos(false)} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
