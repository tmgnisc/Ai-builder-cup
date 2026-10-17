import Link from "next/link";
import { getCategories } from "@/lib/commerce/catalog";
import { CartButton } from "@/features/cart";
import { PipHeaderControls } from "@/features/companion";
import { ThemeToggle } from "./ThemeToggle";

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5 rounded-full" aria-label="Persona home">
      <span aria-hidden className="relative grid size-7 place-items-center rounded-lg bg-accent">
        <span className="flex gap-0.5">
          <span className="h-2 w-0.5 rounded-full bg-accent-fg transition-transform duration-300 group-hover:scale-y-[0.2]" />
          <span className="h-2 w-0.5 rounded-full bg-accent-fg transition-transform duration-300 group-hover:scale-y-[0.2]" />
        </span>
      </span>
      <span className="font-display text-base font-semibold tracking-tight">Persona</span>
    </Link>
  );
}

export function Header() {
  const categories = getCategories();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-md supports-[backdrop-filter]:bg-bg/75">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-fg"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-page items-center gap-6 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Primary" className="hidden flex-1 items-center gap-1 md:flex">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/?category=${c.id}#store`}
              className="rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              {c.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <PipHeaderControls />
          <ThemeToggle />
          <CartButton />
        </div>
      </div>
    </header>
  );
}
