import Link from "next/link";
import { ArrowUp, Mic } from "lucide-react";
import { ProductCard } from "@/components/store/ProductCard";
import { searchProducts } from "@/lib/commerce/catalog";
import { CATEGORIES, CategorySchema } from "@/lib/commerce/schemas";
import { cn } from "@/lib/cn";

const EXAMPLES = [
  "A laptop under 1.2 lakh for coding",
  "Noise-cancelling headphones for flights",
  "Best camera phone below 90k",
];

export default async function HomePage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category: rawCategory } = await searchParams;
  const parsed = CategorySchema.safeParse(rawCategory);
  const category = parsed.success ? parsed.data : undefined;
  const { products, total } = searchProducts({ category, sort: "relevance" });

  return (
    <>
      {/* ── Hero (Phase 3: SplitText reveal, typing chips) ── */}
      <section className="relative mx-auto grid max-w-[1400px] items-center gap-10 px-4 pb-16 pt-12 sm:px-6 md:pt-20 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs text-muted hairline">
            <span className="size-1.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" aria-hidden />
            Meet Pip, your shopping companion
          </p>
          <h1 className="font-display text-[clamp(2.4rem,6vw,4.75rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
            Shopping, with someone who <span className="text-accent-text">gets it.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Tell Pip what you need in plain words. It searches the catalog, compares the trade-offs and adds to your cart,
            and you can see every step it takes.
          </p>

          <form className="mt-8 max-w-xl" action="#store">
            <label htmlFor="hero-prompt" className="sr-only">
              Tell Pip what you need
            </label>
            <div className="flex items-center gap-2 rounded-full bg-surface p-1.5 pl-5 hairline focus-within:shadow-[inset_0_0_0_1px_var(--accent-text)]">
              <input
                id="hero-prompt"
                name="prompt"
                placeholder="Tell Pip what you need…"
                autoComplete="off"
                className="h-11 min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-muted focus:outline-none"
              />
              <button
                type="button"
                aria-label="Speak to Pip"
                className="grid size-11 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-text"
              >
                <Mic className="size-[18px]" />
              </button>
              <button
                type="submit"
                aria-label="Send to Pip"
                className="grid size-11 place-items-center rounded-full bg-accent text-accent-fg transition-[filter] hover:brightness-110"
              >
                <ArrowUp className="size-[18px]" />
              </button>
            </div>
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Example requests">
              {EXAMPLES.map((ex) => (
                <li key={ex}>
                  <span className="inline-flex rounded-full bg-surface px-3 py-1.5 text-xs text-muted hairline">{ex}</span>
                </li>
              ))}
            </ul>
          </form>
        </div>

        {/* Pip's hero anchor: the fixed companion layer flies Pip from here into the dock on scroll. */}
        <div data-pip-anchor="hero" aria-hidden className="relative mx-auto hidden aspect-square w-full max-w-[460px] lg:block" />
      </section>

      {/* ── Store ── */}
      <section id="store" className="mx-auto max-w-[1400px] scroll-mt-20 px-4 sm:px-6" aria-labelledby="store-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="store-heading" className="font-display text-2xl font-semibold tracking-tight">
              {category ? CATEGORIES.find((c) => c.id === category)?.label : "All products"}
            </h2>
            <p className="mt-1 font-mono text-xs text-muted">{total} products</p>
          </div>
        </div>

        <nav aria-label="Categories" className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <CategoryPill href="/#store" active={!category}>
            All
          </CategoryPill>
          {CATEGORIES.map((c) => (
            <CategoryPill key={c.id} href={`/?category=${c.id}#store`} active={category === c.id}>
              {c.label}
            </CategoryPill>
          ))}
        </nav>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </>
  );
}

function CategoryPill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn(
        "shrink-0 rounded-full px-4 py-2 text-sm transition-colors",
        active ? "bg-text text-bg" : "bg-surface text-muted hairline hover:text-text",
      )}
    >
      {children}
    </Link>
  );
}
