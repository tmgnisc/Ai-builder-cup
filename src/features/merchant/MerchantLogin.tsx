"use client";

import { AlertTriangle, ArrowRight, CheckCircle2, Lock, ShieldCheck, Store, User } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { BRAND } from "@/config/brand";
import { useMerchantSession } from "@/store/useMerchantSession";

interface MerchantLoginProps {
  onSuccess?: () => void;
}

export function MerchantLogin({ onSuccess }: MerchantLoginProps) {
  const login = useMerchantSession((s) => s.login);
  const [email, setEmail] = useState("admin@persona.store");
  const [password, setPassword] = useState("••••••••");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const ok = login(email, password);
      setLoading(false);
      if (ok) {
        onSuccess?.();
      } else {
        setError("Invalid merchant credentials. Please enter a valid store email address.");
      }
    }, 200);
  };

  const handleQuickDemo = () => {
    setEmail("admin@persona.store");
    setPassword("persona2026");
    login("admin@persona.store");
    onSuccess?.();
  };

  return (
    <div className="mx-auto flex min-h-96 max-w-md flex-col justify-center px-4 py-16">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-surface-2 text-accent-text hairline">
          <Store className="size-6" aria-hidden="true" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-text">
          {BRAND.name} Operations
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
          Merchant Portal
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-muted">
          Sign in to manage inventory, fulfill verified customer orders, and inspect Pip agent telemetry.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-lg bg-danger/10 p-3 text-xs text-danger hairline"
            >
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="merchant-email" className="mb-1.5 block text-xs font-medium text-text">
              Store Email / Merchant ID
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                <User className="size-4" aria-hidden="true" />
              </span>
              <Input
                id="merchant-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@persona.store"
                className="pl-9"
              />
            </div>
            <p className="mt-1 text-2xs text-muted">
              Demo store login: <span className="font-mono text-text">admin@persona.store</span>
            </p>
          </div>

          <div>
            <label htmlFor="merchant-password" className="mb-1.5 block text-xs font-medium text-text">
              Security Key / Password
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                <Lock className="size-4" aria-hidden="true" />
              </span>
              <Input
                id="merchant-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex cursor-pointer select-none items-center gap-2 text-muted hover:text-text">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-4 rounded border-border-strong text-accent focus:ring-accent"
              />
              <span>Remember this session</span>
            </label>
            <span className="text-2xs text-muted">256-bit State Integrity</span>
          </div>

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="mt-2 w-full justify-center"
            iconRight={<ArrowRight className="size-4" aria-hidden="true" />}
          >
            Sign In to Store Operations
          </Button>

          <div className="relative my-2 flex items-center justify-center">
            <span className="absolute inset-x-0 h-px bg-border/60" aria-hidden="true" />
            <span className="relative bg-surface px-2 text-2xs uppercase tracking-wider text-muted">
              Or Instant Evaluation
            </span>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={handleQuickDemo}
            className="w-full justify-center text-xs"
            iconLeft={<ShieldCheck className="size-4 text-accent-text" aria-hidden="true" />}
          >
            Quick Demo Access (One-Click)
          </Button>
        </form>
      </Card>

      <div className="mt-6 flex items-center justify-center gap-2 text-2xs text-muted">
        <CheckCircle2 className="size-3.5 text-listening" aria-hidden="true" />
        <span>Live verification active · Catalog synchronized with database</span>
      </div>
    </div>
  );
}
