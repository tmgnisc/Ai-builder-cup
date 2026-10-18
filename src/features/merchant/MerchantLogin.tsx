"use client";

import { AlertTriangle, ArrowRight, Lock, Store, User } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BRAND } from "@/config/brand";
import { useMerchantSession } from "@/store/useMerchantSession";

interface MerchantLoginProps {
  onSuccess?: () => void;
}

/** Demo account seeded by the backend on first start (backend/app/core/database.py). */
const DEMO = { email: "admin@persona.store", password: "persona2026" };

export function MerchantLogin({ onSuccess }: MerchantLoginProps) {
  const login = useMerchantSession((s) => s.login);
  const authError = useMerchantSession((s) => s.authError);
  const loading = useMerchantSession((s) => s.authLoading);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await login(email, password)) onSuccess?.();
  };

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-16">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 grid size-11 place-items-center rounded-xl bg-surface-2 text-accent-text hairline">
          <Store className="size-5" aria-hidden />
        </span>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Sign in to {BRAND.name} Merchant</h1>
        <p className="mt-2 text-sm text-muted">Manage inventory, fulfil orders and see what shoppers ask Pip.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-card bg-surface p-6 hairline">
        {authError && (
          <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger/10 p-3 text-sm text-danger">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {authError}
          </p>
        )}

        <div>
          <label htmlFor="merchant-email" className="mb-1.5 block text-sm text-muted">
            Email
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input id="merchant-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" />
          </div>
        </div>

        <div>
          <label htmlFor="merchant-password" className="mb-1.5 block text-sm text-muted">
            Password
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input id="merchant-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" />
          </div>
        </div>

        <Button type="submit" variant="primary" loading={loading} className="mt-1 w-full justify-center" iconRight={<ArrowRight className="size-4" aria-hidden />}>
          Sign in
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-muted">
        Demo account: <span className="text-text">{DEMO.email}</span> / <span className="text-text">{DEMO.password}</span>{" "}
        <button
          type="button"
          className="ml-1 underline underline-offset-2 hover:text-text"
          onClick={() => {
            setEmail(DEMO.email);
            setPassword(DEMO.password);
          }}
        >
          Fill in
        </button>
      </p>
    </div>
  );
}
