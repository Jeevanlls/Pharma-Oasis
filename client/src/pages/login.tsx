import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { loginSchema, type LoginData } from "@shared/schema";
import { PublicLayout } from "@/components/layout/public-layout";
import { Package, Loader2, AlertCircle, ShieldCheck, KeyRound } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Step = "credentials" | "code" | "setup";

export default function LoginPage({ adminMode = false }: { adminMode?: boolean }) {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("credentials");
  const [code, setCode] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);
  // Setup (first-time enrolment) state
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const { login, refetch, isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    const redirect = new URLSearchParams(window.location.search).get("redirect");
    setLocation(redirect || (isAdmin ? "/admin" : "/portal"));
  }, [authLoading, isAuthenticated, isAdmin]);

  const finishLogin = async () => {
    await refetch();
    toast({ title: "Welcome back!", description: "You have successfully logged in." });
    // The redirect effect fires once refetch() sets the authenticated user.
  };

  const startSetup = async () => {
    const res = await fetch("/api/admin/2fa/setup", { method: "POST", credentials: "include" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || "Could not start 2FA setup.");
      return;
    }
    setQrDataUrl(data.qrDataUrl);
    setSecret(data.secret);
    setStep("setup");
  };

  const onSubmit = async (data: LoginData) => {
    setIsLoading(true);
    setError(null);
    const result = await login(data.email, data.password);
    setIsLoading(false);

    if (result.success) {
      toast({ title: "Welcome back!", description: "You have successfully logged in." });
      // Redirect is handled reactively by the effect above once auth state commits.
    } else if (result.twoFactorRequired) {
      setStep("code");
    } else if (result.twoFactorSetupRequired) {
      await startSetup();
    } else {
      setError(result.error || "Login failed. Please check your credentials.");
    }
  };

  // Step 2: verify an authenticator (or backup) code to finish login.
  const onVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login/2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code, rememberDevice }),
    });
    const data = await res.json();
    setIsLoading(false);
    if (res.ok) {
      await finishLogin();
    } else {
      setError(data.message || "That code wasn't valid.");
    }
  };

  // Step 3a: confirm the first authenticator code to enable 2FA.
  const onEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    const res = await fetch("/api/admin/2fa/enable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    setIsLoading(false);
    if (res.ok) {
      setBackupCodes(data.backupCodes || []);
      setCode("");
    } else {
      setError(data.message || "That code wasn't valid.");
    }
  };

  const cardTitle =
    step === "credentials"
      ? adminMode ? "Staff & Admin sign-in" : "Welcome Back"
      : step === "code"
      ? "Two-step verification"
      : "Set up two-factor authentication";

  const cardDesc =
    step === "credentials"
      ? adminMode ? "Authorised access only." : "Sign in to access your account"
      : step === "code"
      ? "Enter the 6-digit code from your authenticator app."
      : "Admin accounts must use an authenticator app.";

  // Already signed in → don't flash the form; the effect redirects.
  if (!authLoading && isAuthenticated) return null;

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              {step === "credentials" ? <Package className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
            </div>
            <div>
              <CardTitle className="text-2xl" style={{ fontFamily: "DM Sans, sans-serif" }}>{cardTitle}</CardTitle>
              <CardDescription>{cardDesc}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* ---------- Step 1: email + password ---------- */}
            {step === "credentials" && (
              <>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="you@company.com" autoComplete="email" data-testid="input-email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter your password" autoComplete="current-password" data-testid="input-password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-submit-login">
                      {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</>) : "Sign In"}
                    </Button>
                  </form>
                </Form>

                <div className="mt-4 text-center">
                  <Link href="/forgot-password" className="text-sm text-muted-foreground hover:text-primary" data-testid="link-forgot-password">
                    Forgot your password?
                  </Link>
                </div>

                {!adminMode && (
                  <div className="mt-4 text-center text-sm text-muted-foreground">
                    Don't have an account?{" "}
                    <Link href="/register" className="font-medium text-primary hover:underline">Register as a Customer</Link>
                  </div>
                )}
              </>
            )}

            {/* ---------- Step 2: enter authenticator code ---------- */}
            {step === "code" && (
              <form onSubmit={onVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Authenticator code</Label>
                  <Input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    data-testid="input-2fa-code"
                  />
                  <p className="text-xs text-muted-foreground">
                    Lost your phone? Enter one of your backup codes instead.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="remember-device"
                    checked={rememberDevice}
                    onCheckedChange={(v) => setRememberDevice(v === true)}
                    data-testid="checkbox-remember-device"
                  />
                  <Label htmlFor="remember-device" className="text-sm font-normal leading-snug">
                    Remember this device for 30 days
                    <span className="block text-xs text-muted-foreground">Only on your own private computer.</span>
                  </Label>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-verify-2fa">
                  {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying...</>) : "Verify & Sign In"}
                </Button>
              </form>
            )}

            {/* ---------- Step 3: first-time enrolment ---------- */}
            {step === "setup" && !backupCodes && (
              <form onSubmit={onEnable} className="space-y-4">
                <ol className="text-sm text-muted-foreground list-decimal pl-5 space-y-1">
                  <li>Install <strong>Google Authenticator</strong> (or Authy) on your phone.</li>
                  <li>Scan this QR code, or type the key below.</li>
                  <li>Enter the 6-digit code it shows.</li>
                </ol>
                {qrDataUrl && (
                  <div className="flex justify-center">
                    <img src={qrDataUrl} alt="2FA QR code" className="h-44 w-44 rounded border" data-testid="img-2fa-qr" />
                  </div>
                )}
                {secret && (
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Can't scan? Enter this key manually:</p>
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded break-all">{secret}</code>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="enable-code">Code from your app</Label>
                  <Input
                    id="enable-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    data-testid="input-enable-2fa"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-enable-2fa">
                  {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Confirming...</>) : "Confirm & Enable"}
                </Button>
              </form>
            )}

            {/* ---------- Step 3b: show backup codes once ---------- */}
            {step === "setup" && backupCodes && (
              <div className="space-y-4">
                <Alert>
                  <KeyRound className="h-4 w-4" />
                  <AlertDescription>
                    Save these <strong>backup codes</strong> somewhere safe. Each works once if you lose your phone. They won't be shown again.
                  </AlertDescription>
                </Alert>
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((c) => (
                    <code key={c} className="text-sm font-mono bg-muted px-2 py-1 rounded text-center" data-testid="text-backup-code">{c}</code>
                  ))}
                </div>
                <Button
                  className="w-full"
                  onClick={async () => {
                    await navigator.clipboard?.writeText(backupCodes.join("\n")).catch(() => {});
                    toast({ title: "Backup codes copied" });
                  }}
                  variant="outline"
                  data-testid="button-copy-backup"
                >
                  Copy codes
                </Button>
                <Button className="w-full" onClick={finishLogin} data-testid="button-finish-2fa">
                  I've saved them — Continue
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
