"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useMerchantSession } from "@/store/useMerchantSession";

interface SettingsTabProps {
  /** Defaults to signing out of the merchant session. */
  onLogout?: () => void;
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card bg-surface p-5 hairline">
      <h2 className="font-display text-base font-semibold tracking-tight">{title}</h2>
      <p className="mt-0.5 text-sm text-muted">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function SettingsTab({ onLogout: onLogoutProp }: SettingsTabProps) {
  const user = useMerchantSession((s) => s.user);
  const logout = useMerchantSession((s) => s.logout);
  const onLogout = onLogoutProp ?? (() => void logout());

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    if (next.length < 6) return setResult({ ok: false, text: "Use at least 6 characters." });
    if (next !== confirm) return setResult({ ok: false, text: "The new passwords don't match." });
    setSaving(true);
    try {
      const res = await fetch("/api/merchant/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (res.ok) {
        setResult({ ok: true, text: "Password changed." });
        setCurrent("");
        setNext("");
        setConfirm("");
      } else {
        const err = await res.json().catch(() => ({}));
        setResult({ ok: false, text: err?.error?.message || "Couldn't change the password." });
      }
    } catch {
      setResult({ ok: false, text: "Couldn't reach the store backend." });
    } finally {
      setSaving(false);
    }
  };

  const details: [string, string | undefined][] = [
    ["Name", user?.name],
    ["Email", user?.email],
    ["Role", user?.role],
    ["Store", user?.storeName],
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <Section title="Account" description="The signed-in merchant account.">
        <dl className="divide-y divide-border">
          {details.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
              <dt className="text-sm text-muted">{k}</dt>
              <dd className="min-w-0 truncate text-sm font-medium">{v || "–"}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Password" description="Change the password for this account.">
        <form onSubmit={changePassword} className="grid gap-4 sm:max-w-sm">
          <div>
            <label htmlFor="pw-current" className="mb-1.5 block text-sm text-muted">
              Current password
            </label>
            <Input id="pw-current" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div>
            <label htmlFor="pw-new" className="mb-1.5 block text-sm text-muted">
              New password
            </label>
            <Input id="pw-new" type="password" autoComplete="new-password" required minLength={6} value={next} onChange={(e) => setNext(e.target.value)} />
          </div>
          <div>
            <label htmlFor="pw-confirm" className="mb-1.5 block text-sm text-muted">
              Confirm new password
            </label>
            <Input id="pw-confirm" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          {result && (
            <p role={result.ok ? "status" : "alert"} className={result.ok ? "text-sm text-listening" : "text-sm text-danger"}>
              {result.text}
            </p>
          )}
          <div>
            <Button type="submit" variant="primary" loading={saving}>
              Change password
            </Button>
          </div>
        </form>
      </Section>

      <Button variant="ghost" onClick={onLogout} iconLeft={<LogOut className="size-4" aria-hidden />} className="text-danger">
        Sign out
      </Button>
    </div>
  );
}
