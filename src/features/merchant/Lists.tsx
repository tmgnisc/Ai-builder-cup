"use client";

import { ArrowUpRight, CircleHelp, MessageSquareWarning, Radio } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { getProduct } from "@/lib/commerce/catalog";
import type { FrictionTheme, MissingInfo, TopQuestion } from "@/data/merchant";
import { useChat } from "@/store/useChat";
import { useFeedback } from "@/store/useFeedback";
import { useMerchantSession } from "@/store/useMerchantSession";

const INTENT_TONE: Record<TopQuestion["intent"], BadgeTone> = { search: "info", compare: "accent", add: "success", delivery: "neutral", question: "warning" };

function Panel({ id, topic, title, icon, aside, children }: { id: string; topic: string; title: string; icon: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section data-pip-anchor={id} data-pip-topic={topic} aria-labelledby={`${id}-h`} className="flex min-w-0 flex-col rounded-card bg-surface p-5 hairline">
      <div className="mb-4 flex items-center gap-2">
        <span aria-hidden className="text-muted">
          {icon}
        </span>
        <h2 id={`${id}-h`} className="flex-1 font-display text-base font-semibold tracking-tight">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Bar behind a row, as wide as its share of the top row. */
const Meter = ({ share }: { share: number }) => (
  <span aria-hidden className="absolute inset-y-0 left-0 rounded-lg bg-surface-2" style={{ width: `${Math.max(4, share * 100)}%` }} />
);

export function QuestionsList({ items }: { items: TopQuestion[] }) {
  const max = items[0]?.count ?? 1;
  return (
    <Panel id="merchant-questions" topic="merchant-questions" title="Top questions to Pip" icon={<CircleHelp className="size-4" />}>
      <ol className="space-y-1.5">
        {items.map((q) => (
          <li key={q.text} data-list-row className="relative overflow-hidden rounded-lg">
            <Meter share={q.count / max} />
            <div className="relative flex items-center gap-3 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm" title={q.text}>
                {q.text}
              </span>
              <Badge tone={INTENT_TONE[q.intent]} className="shrink-0 max-sm:hidden">
                {q.intent}
              </Badge>
              <span className="w-10 shrink-0 text-right font-mono text-xs tabular">{q.count}</span>
              <span className="w-12 shrink-0 text-right font-mono text-2xs text-muted tabular" title="Resolved">
                {Math.round(q.resolved * 100)}%
              </span>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-2xs text-muted">Asks · share resolved (task done in that conversation)</p>
    </Panel>
  );
}

export function MissingInfoList({ items }: { items: MissingInfo[] }) {
  const live = useMerchantSession((s) => s.missing);
  const combined = useMemo(() => [...live, ...items], [live, items]);

  return (
    <Panel
      id="merchant-missing"
      topic="merchant-missing"
      title="Missing product info"
      icon={<MessageSquareWarning className="size-4" />}
      aside={<span className="text-2xs text-muted">Pip had to say “not listed”</span>}
    >
      <ul className="divide-y divide-border">
        {combined.map((m, idx) => {
          const p = getProduct(m.productId);
          const isLive = idx < live.length;
          return (
            <li key={`${m.productId}-${m.field}-${idx}`} data-list-row className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{m.field}</p>
                  {isLive && <Badge tone="accent">live</Badge>}
                </div>
                <p className="truncate text-xs text-muted" title={m.example}>
                  “{m.example}”
                </p>
              </div>
              {p && (
                <Link href={`/product/${p.id}`} className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-surface-2 px-2.5 py-1 text-2xs hover:text-text max-sm:hidden">
                  {p.name}
                  <ArrowUpRight className="size-3" aria-hidden />
                </Link>
              )}
              <span className="w-14 shrink-0 text-right font-mono text-xs tabular">
                {m.asks}
                <span className="text-muted"> asks</span>
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

export function FrictionList({ items }: { items: FrictionTheme[] }) {
  const live = useFeedback((s) => s.entries);
  const max = items[0]?.count ?? 1;
  return (
    <Panel id="merchant-friction" topic="merchant-friction" title="What's getting in the way" icon={<MessageSquareWarning className="size-4" />} aside={<span className="text-2xs text-muted">from Pip&apos;s check-ins</span>}>
      <ol className="space-y-1.5">
        {live.map((f, i) => (
          <li key={`live-${i}`} className="relative overflow-hidden rounded-lg bg-accent/10 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--accent)_35%,transparent)]">
            <div className="relative flex items-center gap-3 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm">{f.text}</span>
              <Badge tone="accent" className="shrink-0">
                you, just now
              </Badge>
            </div>
          </li>
        ))}
        {items.map((f) => (
          <li key={f.text} data-list-row className="relative overflow-hidden rounded-lg">
            <Meter share={f.count / max} />
            <div className="relative flex items-center gap-3 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm" title={f.text}>
                {f.text}
              </span>
              <span className="shrink-0 text-2xs text-muted max-sm:hidden">{f.page}</span>
              <span className="w-8 shrink-0 text-right font-mono text-xs tabular">{f.count}</span>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

/** Live numbers from the current browser session, next to the mock week. */
export function SessionPanel() {
  const messages = useChat((s) => s.messages);
  const feedback = useFeedback((s) => s.entries.length);
  const stats = useMemo(() => {
    const questions = messages.filter((m) => m.role === "user").map((m) => m.text);
    let verified = 0;
    let failed = 0;
    for (const m of messages)
      for (const b of m.blocks)
        if (b.kind === "cart_action") {
          if (b.status === "verified") verified++;
          else if (b.status === "failed") failed++;
        }
    return { questions, verified, failed };
  }, [messages]);

  return (
    <Panel id="merchant-session" topic="merchant-session" title="This session, live" icon={<Radio className="size-4" />} aside={<Badge tone="success" dot>live</Badge>}>
      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          ["Questions", stats.questions.length],
          ["Cart ✓", stats.verified],
          ["Feedback", feedback],
        ].map(([k, v]) => (
          <div key={k} className="flex flex-col-reverse rounded-xl bg-surface-2 px-2 py-3">
            <dt className="mt-0.5 text-2xs text-muted">{k}</dt>
            <dd className="font-display text-xl font-semibold tabular">{v}</dd>
          </div>
        ))}
      </dl>
      {stats.failed > 0 && <p className="mt-2 text-xs text-danger">{stats.failed} cart action(s) failed verification; Pip told the shopper.</p>}
      {stats.questions.length ? (
        <ol className="mt-4 space-y-1">
          {stats.questions.slice(-5).reverse().map((q, i) => (
            <li key={`${i}-${q}`} className="truncate rounded-lg px-2 py-1.5 text-sm odd:bg-surface-2/60" title={q}>
              “{q}”
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Nothing yet. Ask Pip something in the store (press <kbd className="rounded bg-surface-2 px-1 font-mono text-2xs">/</kbd>) and it shows up here.
        </p>
      )}
    </Panel>
  );
}
