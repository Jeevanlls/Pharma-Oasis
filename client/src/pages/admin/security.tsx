import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { ShieldCheck, ShieldAlert, KeyRound, Loader2 } from "lucide-react";

export default function AdminSecurityPage() {
  const { user, refetch } = useAuth();
  const { toast } = useToast();
  const enabled = !!(user as any)?.twoFactorEnabled;

  const [regenOpen, setRegenOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCodes, setNewCodes] = useState<string[] | null>(null);

  const closeDialogs = () => {
    setRegenOpen(false);
    setDisableOpen(false);
    setPassword("");
    setError(null);
  };

  const regenerate = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/2fa/backup-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setNewCodes(data.backupCodes || []);
      setRegenOpen(false);
      setPassword("");
    } else {
      setError(data.message || "Could not regenerate codes.");
    }
  };

  const disable = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/2fa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      toast({ title: "Two-factor turned off", description: "You'll be asked to set it up again next time you sign in." });
      closeDialogs();
      await refetch();
    } else {
      setError(data.message || "Could not disable 2FA.");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "DM Sans, sans-serif" }}>Security</h1>
        <p className="mt-2 text-muted-foreground">Two-factor authentication for your admin account.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {enabled ? <ShieldCheck className="h-6 w-6 text-emerald-600" /> : <ShieldAlert className="h-6 w-6 text-amber-600" />}
              <div>
                <CardTitle className="text-lg">Authenticator app (2FA)</CardTitle>
                <CardDescription>Required for all admin accounts.</CardDescription>
              </div>
            </div>
            <Badge variant={enabled ? "default" : "secondary"} data-testid="badge-2fa-status">
              {enabled ? "On" : "Off"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {enabled ? (
            <>
              <p className="text-sm text-muted-foreground">
                When you sign in, you'll enter a 6-digit code from your authenticator app. Keep your backup codes safe in case you lose your phone.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setRegenOpen(true)} data-testid="button-regen-backup">
                  <KeyRound className="h-4 w-4 mr-2" /> Regenerate backup codes
                </Button>
                <Button variant="destructive" onClick={() => setDisableOpen(true)} data-testid="button-disable-2fa">
                  Turn off 2FA
                </Button>
              </div>
            </>
          ) : (
            <Alert>
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                2FA isn't set up on this account. Sign out and sign back in — you'll be guided through setup (it's required for admins).
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Newly generated backup codes */}
      {newCodes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><KeyRound className="h-5 w-5" /> New backup codes</CardTitle>
            <CardDescription>Save these now — each works once and they replace any previous codes. They won't be shown again.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {newCodes.map((c) => (
                <code key={c} className="text-sm font-mono bg-muted px-2 py-1 rounded text-center" data-testid="text-new-backup-code">{c}</code>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={async () => { await navigator.clipboard?.writeText(newCodes.join("\n")).catch(() => {}); toast({ title: "Copied" }); }}>
                Copy codes
              </Button>
              <Button onClick={() => setNewCodes(null)}>Done</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Regenerate dialog */}
      <Dialog open={regenOpen} onOpenChange={(o) => (o ? setRegenOpen(true) : closeDialogs())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regenerate backup codes</DialogTitle>
            <DialogDescription>Confirm your password. This replaces your existing backup codes.</DialogDescription>
          </DialogHeader>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="space-y-2 py-2">
            <Label htmlFor="regen-pw">Password</Label>
            <Input id="regen-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="input-regen-password" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs}>Cancel</Button>
            <Button onClick={regenerate} disabled={busy} data-testid="button-confirm-regen">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable dialog */}
      <Dialog open={disableOpen} onOpenChange={(o) => (o ? setDisableOpen(true) : closeDialogs())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Turn off two-factor authentication</DialogTitle>
            <DialogDescription>Confirm your password. 2FA is required for admins, so you'll be asked to set it up again at your next sign-in.</DialogDescription>
          </DialogHeader>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="space-y-2 py-2">
            <Label htmlFor="disable-pw">Password</Label>
            <Input id="disable-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="input-disable-password" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs}>Cancel</Button>
            <Button variant="destructive" onClick={disable} disabled={busy} data-testid="button-confirm-disable">
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Turn off 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
