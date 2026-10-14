"use client";

import { useRef } from "react";
import { Badge } from "@/components/ui/Badge";
import { FRICTION, FUNNEL, KPIS, MISSING_INFO, PERIOD, TOP_QUESTIONS, type Kpi } from "@/data/merchant";
import { gsap, motion, useGSAP } from "@/lib/motion";
import { Funnel } from "./Funnel";
import { formatKpi, KpiCard } from "./KpiCard";
import { FrictionList, MissingInfoList, QuestionsList, SessionPanel } from "./Lists";

/**
 * /merchant: how shoppers use Pip. The week is mock data (src/data/merchant.ts); the
 * "This session" panel and check-in answers are live from this browser.
 */
export function MerchantDashboard() {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (motion.reduced) return;
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.from("[data-kpi], section", { autoAlpha: 0, y: 16, duration: 0.7, stagger: 0.06 })
        .from("[data-spark]", { strokeDasharray: 1, strokeDashoffset: 1, duration: 1.1, ease: "power2.out", stagger: 0.08 }, 0.2)
        .from("[data-funnel-bar]", { scaleX: 0, transformOrigin: "50% 50%", duration: 0.9, stagger: 0.07 }, 0.35)
        .from("[data-list-row]", { autoAlpha: 0, x: -10, duration: 0.5, stagger: 0.03 }, 0.4);
      // Count the KPI numbers up from zero.
      root.current?.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
        const end = Number(el.dataset.count);
        const format = el.dataset.format as Kpi["format"];
        const o = { v: 0 };
        tl.to(o, { v: end, duration: 1.4, ease: "power3.out", onUpdate: () => void (el.textContent = formatKpi(format === "pct" && end % 1 ? Math.round(o.v * 10) / 10 : Math.round(o.v), format)) }, 0.15);
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="mx-auto max-w-[1400px] px-4 pb-20 pt-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-accent-text">Merchant</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">How shoppers use Pip</h1>
          <p className="mt-1.5 max-w-xl text-sm text-muted">Assisted sessions, what people ask, where product info is missing, and where they get stuck.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{PERIOD}</Badge>
          <Badge tone="warning">Mock data</Badge>
        </div>
      </header>

      <h2 className="sr-only">Key numbers</h2>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPIS.map((k) => (
          <KpiCard key={k.key} kpi={k} />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        <Funnel steps={FUNNEL} />
        <SessionPanel />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <QuestionsList items={TOP_QUESTIONS} />
        <MissingInfoList items={MISSING_INFO} />
      </div>

      <div className="mt-4">
        <FrictionList items={FRICTION} />
      </div>
    </div>
  );
}
