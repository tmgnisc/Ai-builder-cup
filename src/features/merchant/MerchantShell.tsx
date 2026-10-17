"use client";

import { ArrowUpRight, Boxes, BrainCircuit, LayoutDashboard, LogOut, Settings, ShoppingBag, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { cn } from "@/lib/cn";
import { useMerchantSession } from "@/store/useMerchantSession";
import { MerchantLogin } from "./MerchantLogin";

export interface MerchantSection {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const MERCHANT_SECTIONS: MerchantSection[] = [
  { href: "/merchant", label: "Overview", description: "Sales, assisted sessions and the shopper funnel.", icon: LayoutDashboard },
  { href: "/merchant/inventory", label: "Inventory", description: "Catalog, stock levels and missing product info.", icon: Boxes },
  { href: "/merchant/orders", label: "Orders", description: "Orders placed with a verified cart.", icon: ShoppingBag },
  { href: "/merchant/intelligence", label: "Pip insights", description: "What shoppers ask Pip and where it gets stuck.", icon: BrainCircuit },
  { href: "/merchant/settings", label: "Settings", description: "Store and Pip configuration.", icon: Settings },
];

function sectionFor(pathname: string): MerchantSection {
  return [...MERCHANT_SECTIONS].reverse().find((s) => pathname === s.href || pathname.startsWith(`${s.href}/`)) ?? MERCHANT_SECTIONS[0];
}

function Brand() {
  return (
    <Link href="/merchant" className="flex items-center gap-2.5 rounded-lg" aria-label="Merchant overview">
      <span aria-hidden className="grid size-7 place-items-center rounded-lg bg-accent">
        <span className="flex gap-0.5">
          <span className="h-2 w-0.5 rounded-full bg-accent-fg" />
          <span className="h-2 w-0.5 rounded-full bg-accent-fg" />
        </span>
      </span>
      <span className="font-display text-sm font-semibold tracking-tight">
        Persona <span className="font-normal text-muted">Merchant</span>
      </span>
    </Link>
  );
}

const storeLink = (
  <Link href="/" target="_blank" rel="noopener" className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-text">
    View store <ArrowUpRight className="size-3.5" aria-hidden />
  </Link>
);

/**
 * The merchant portal's own app shell: auth gate, sidebar navigation and workspace header.
 * Nothing from the storefront (header, cart, compare, Pip) is mounted here.
 */
export function MerchantShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthenticated = useMerchantSession((s) => s.isAuthenticated);
  const user = useMerchantSession((s) => s.user);
  const checkAuth = useMerchantSession((s) => s.checkAuth);
  const logout = useMerchantSession((s) => s.logout);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    void checkAuth();
  }, [checkAuth]);

  if (!mounted) {
    return <div className="grid min-h-dvh place-items-center text-xs text-muted">Loading merchant portal…</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-dvh flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border px-4 sm:px-6">
          <Brand />
          <div className="flex items-center gap-1">
            {storeLink}
            <ThemeToggle />
          </div>
        </header>
        <main id="main" className="grid flex-1 place-items-center">
          <MerchantLogin />
        </main>
      </div>
    );
  }

  const current = sectionFor(pathname);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-merchant">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface/40 lg:flex">
        <div className="flex h-14 items-center px-5">
          <Brand />
        </div>
        <nav aria-label="Merchant sections" className="flex flex-1 flex-col gap-0.5 px-3 py-4">
          {MERCHANT_SECTIONS.map((s) => {
            const active = s.href === current.href;
            return (
              <Link
                key={s.href}
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active ? "bg-surface-2 font-medium text-text hairline" : "text-muted hover:bg-surface-2 hover:text-text",
                )}
              >
                <s.icon className={cn("size-4", active ? "text-accent-text" : "text-muted")} aria-hidden />
                {s.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <p className="truncate text-sm font-medium">{user?.name ?? "Store operator"}</p>
          <p className="truncate text-xs text-muted">{user?.email}</p>
          <div className="mt-3 flex items-center justify-between">
            {storeLink}
            <Button size="sm" variant="ghost" onClick={() => void logout()} iconLeft={<LogOut className="size-3.5" aria-hidden />}>
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Top bar: section title on desktop; brand + scrollable nav on mobile */}
        <header className="sticky top-0 z-sticky border-b border-border bg-bg/85 backdrop-blur-md">
          <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
            <div className="lg:hidden">
              <Brand />
            </div>
            <div className="hidden min-w-0 lg:block">
              <h1 className="truncate font-display text-base font-semibold tracking-tight">{current.label}</h1>
            </div>
            <div className="flex items-center gap-1">
              <span className="hidden items-center gap-1.5 text-xs text-muted sm:inline-flex">
                <span className="size-1.5 rounded-full bg-listening" aria-hidden />
                Connected
              </span>
              <ThemeToggle />
              <Button size="sm" variant="ghost" className="lg:hidden" onClick={() => void logout()} aria-label="Sign out">
                <LogOut className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
          <nav aria-label="Merchant sections" className="no-scrollbar flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden">
            {MERCHANT_SECTIONS.map((s) => {
              const active = s.href === current.href;
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs",
                    active ? "bg-surface-2 font-medium text-text hairline" : "text-muted",
                  )}
                >
                  <s.icon className="size-3.5" aria-hidden />
                  {s.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main id="main" className="mx-auto w-full max-w-page flex-1 px-4 py-6 sm:px-6 lg:py-8">
          <div className="mb-6 lg:hidden">
            <h1 className="font-display text-xl font-semibold tracking-tight">{current.label}</h1>
          </div>
          <p className="mb-6 text-sm text-muted">{current.description}</p>
          {children}
        </main>
      </div>
    </div>
  );
}
