"use client";

import { CheckCircle2, MapPin, RefreshCw, Search, ShieldCheck, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import type { MerchantOrder, OrderStatus } from "@/data/merchantOrders";
import { cn } from "@/lib/cn";
import { formatNPR } from "@/lib/commerce/format";
import { useMerchantSession } from "@/store/useMerchantSession";
import { StatTile } from "./Lists";

const STATUS: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: "Pending", tone: "warning" },
  processing: { label: "Processing", tone: "info" },
  dispatched: { label: "Dispatched", tone: "neutral" },
  delivered: { label: "Delivered", tone: "success" },
  cancelled: { label: "Cancelled", tone: "danger" },
};

const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  pending: { to: "processing", label: "Start processing" },
  processing: { to: "dispatched", label: "Mark dispatched" },
  dispatched: { to: "delivered", label: "Mark delivered" },
};

const FILTERS = ["all", "pending", "processing", "dispatched", "delivered", "cancelled"] as const;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function OrdersTab() {
  const orders = useMerchantSession((s) => s.orders);
  const state = useMerchantSession((s) => s.ordersState);
  const updateOrderStatus = useMerchantSession((s) => s.updateOrderStatus);
  const loadOrders = useMerchantSession((s) => s.loadOrdersFromApi);

  const [statusFilter, setStatusFilter] = useState<(typeof FILTERS)[number]>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    void loadOrders();
    const t = setInterval(() => document.visibilityState === "visible" && void loadOrders(), 30_000);
    return () => clearInterval(t);
  }, [loadOrders]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      return !q || o.id.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || o.city.toLowerCase().includes(q);
    });
  }, [orders, statusFilter, search]);

  const selected = orders.find((o) => o.id === selectedId) ?? null;
  const verified = orders.filter((o) => o.verifiedByPip).length;
  const open = orders.filter((o) => o.status === "pending" || o.status === "processing").length;
  const delivered = orders.filter((o) => o.status === "delivered").length;

  const advance = async (order: MerchantOrder, to: OrderStatus) => {
    setFailed(null);
    if (!(await updateOrderStatus(order.id, to))) setFailed(`Couldn't update ${order.id}. The change wasn't saved; try again.`);
  };

  if (state === "error" && orders.length === 0) {
    return <ErrorState title="Couldn't load orders" message="The store backend didn't respond. Check that it's running, then try again." onRetry={() => void loadOrders()} />;
  }

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Orders" value={orders.length} hint="All time" />
        <StatTile label="Verified carts" value={orders.length ? `${Math.round((verified / orders.length) * 100)}%` : "–"} hint={`${verified} of ${orders.length} checked by Pip`} tone="accent" />
        <StatTile label="To fulfil" value={open} hint="Pending or processing" tone={open ? "warning" : undefined} />
        <StatTile label="Delivered" value={delivered} tone={delivered ? "success" : undefined} />
      </dl>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input type="search" placeholder="Order, customer or city" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" aria-label="Search orders" />
        </div>
        <div className="flex items-center gap-2">
          <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-surface p-1 hairline" role="group" aria-label="Filter by status">
            {FILTERS.map((st) => (
              <button
                key={st}
                type="button"
                aria-pressed={statusFilter === st}
                onClick={() => setStatusFilter(st)}
                className={cn("shrink-0 rounded-lg px-3 py-1.5 text-xs capitalize transition-colors", statusFilter === st ? "bg-surface-2 font-medium text-text hairline" : "text-muted hover:text-text")}
              >
                {st}
              </button>
            ))}
          </div>
          <Button size="sm" variant="ghost" onClick={() => void loadOrders()} aria-label="Refresh orders">
            <RefreshCw className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      {failed && (
        <p role="alert" className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger hairline">
          {failed}
        </p>
      )}

      {state === "loading" && orders.length === 0 ? (
        <div className="space-y-2" aria-hidden>
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState icon={<ShoppingBag className="size-6" />} title="No orders yet" description="Orders appear here as soon as a shopper places one at checkout." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Search className="size-6" />} title="No matching orders" description="Try another status or search term." />
      ) : (
        <div className="overflow-hidden rounded-card bg-surface hairline">
          <div className="overflow-x-auto">
            <table className="w-full min-w-table border-collapse text-left text-sm">
              <caption className="sr-only">Orders</caption>
              <thead>
                <tr className="border-b border-border text-xs text-muted">
                  <th scope="col" className="px-4 py-3 font-medium">Order</th>
                  <th scope="col" className="px-4 py-3 font-medium">Customer</th>
                  <th scope="col" className="px-4 py-3 font-medium">Items</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Total</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((o) => {
                  const next = NEXT[o.status];
                  return (
                    <tr key={o.id} className="transition-colors hover:bg-surface-2/40">
                      <td className="whitespace-nowrap px-4 py-3">
                        <p className="font-medium tabular">{o.id}</p>
                        <p className="text-xs text-muted">{formatDate(o.date)}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <p>{o.customerName}</p>
                        <p className="flex items-center gap-1 text-xs text-muted">
                          <MapPin className="size-3" aria-hidden />
                          {o.city}
                        </p>
                      </td>
                      <td className="max-w-64 px-4 py-3">
                        <p className="truncate" title={o.items.map((it) => `${it.productName} × ${it.quantity}`).join(", ")}>
                          {o.items[0]?.productName}
                          {o.items.length > 1 && <span className="text-muted"> +{o.items.length - 1} more</span>}
                        </p>
                        <p className="text-xs text-muted">{o.items.reduce((n, it) => n + it.quantity, 0)} units</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-medium tabular">{formatNPR(o.totalNPR)}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Badge tone={STATUS[o.status].tone}>{STATUS[o.status].label}</Badge>
                          {o.verifiedByPip && <ShieldCheck className="size-4 text-listening" aria-label="Cart verified by Pip" />}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => setSelectedId(o.id)}>
                            Details
                          </Button>
                          {next ? (
                            <Button size="sm" variant="secondary" onClick={() => void advance(o, next.to)}>
                              {next.label}
                            </Button>
                          ) : o.status === "delivered" ? (
                            <span className="inline-flex items-center gap-1 px-2 text-xs text-listening">
                              <CheckCircle2 className="size-3.5" aria-hidden /> Complete
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={!!selected}
        onOpenChange={(o) => !o && setSelectedId(null)}
        title={selected ? `Order ${selected.id}` : ""}
        description={selected ? `Placed ${formatDate(selected.date)}` : undefined}
        footer={
          selected && (
            <div className="flex w-full items-center justify-between gap-2">
              {selected.status !== "cancelled" && selected.status !== "delivered" ? (
                <Button size="sm" variant="ghost" className="text-danger" onClick={() => void advance(selected, "cancelled")}>
                  Cancel order
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                {NEXT[selected.status] && (
                  <Button size="sm" variant="primary" onClick={() => void advance(selected, NEXT[selected.status]!.to)}>
                    {NEXT[selected.status]!.label}
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={() => setSelectedId(null)}>
                  Close
                </Button>
              </div>
            </div>
          )
        }
      >
        {selected && (
          <div className="space-y-5 text-sm">
            <div className="flex items-center gap-2">
              <Badge tone={STATUS[selected.status].tone}>{STATUS[selected.status].label}</Badge>
              {selected.verifiedByPip ? <Badge tone="success">Cart verified by Pip</Badge> : <Badge>Standard checkout</Badge>}
            </div>
            <section>
              <h3 className="text-xs text-muted">Customer</h3>
              <p className="mt-1 font-medium">{selected.customerName}</p>
              <p className="text-muted">{selected.customerEmail}</p>
              <p className="text-muted">{selected.city}, Nepal</p>
            </section>
            <section>
              <h3 className="text-xs text-muted">Items</h3>
              <ul className="mt-1 divide-y divide-border rounded-xl bg-surface-2/50 px-3 hairline">
                {selected.items.map((it) => (
                  <li key={it.productId} className="flex justify-between gap-3 py-2">
                    <span className="min-w-0 break-words">
                      {it.productName} <span className="text-muted">× {it.quantity}</span>
                    </span>
                    <span className="shrink-0 tabular">{formatNPR(it.unitPrice * it.quantity)}</span>
                  </li>
                ))}
                <li className="flex justify-between py-2 font-semibold">
                  <span>Total</span>
                  <span className="tabular">{formatNPR(selected.totalNPR)}</span>
                </li>
              </ul>
            </section>
            {selected.notes && (
              <section>
                <h3 className="text-xs text-muted">Delivery notes</h3>
                <p className="mt-1 break-words">{selected.notes}</p>
              </section>
            )}
            {selected.verificationHash && (
              <p className="text-xs text-muted">
                Verification reference <span className="break-all text-text tabular">{selected.verificationHash}</span>
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
