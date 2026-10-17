"use client";

import {
  CheckCircle2,
  MapPin,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { MerchantOrder, OrderStatus } from "@/data/merchantOrders";
import { formatNPR } from "@/lib/commerce/format";
import { useMerchantSession } from "@/store/useMerchantSession";

export function OrdersTab() {
  const orders = useMerchantSession((s) => s.orders);
  const updateOrderStatus = useMerchantSession((s) => s.updateOrderStatus);
  const loadOrdersFromApi = useMerchantSession((s) => s.loadOrdersFromApi);

  useEffect(() => {
    loadOrdersFromApi();
  }, [loadOrdersFromApi]);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<MerchantOrder | null>(null);

  const filteredOrders = orders.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.city.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const verifiedCount = orders.filter((o) => o.verifiedByPip).length;
  const verifiedPct = Math.round((verifiedCount / Math.max(1, orders.length)) * 100);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "delivered":
        return <Badge tone="success">Delivered</Badge>;
      case "dispatched":
        return <Badge tone="neutral">Dispatched</Badge>;
      case "processing":
        return <Badge tone="warning">Processing</Badge>;
      case "pending":
      default:
        return <Badge tone="warning">Pending</Badge>;
    }
  };

  const getNextStatusAction = (order: MerchantOrder) => {
    switch (order.status) {
      case "pending":
        return (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => updateOrderStatus(order.id, "processing")}
            className="text-2xs"
          >
            Process Order
          </Button>
        );
      case "processing":
        return (
          <Button
            size="sm"
            variant="primary"
            onClick={() => updateOrderStatus(order.id, "dispatched")}
            className="text-2xs"
          >
            Dispatch
          </Button>
        );
      case "dispatched":
        return (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => updateOrderStatus(order.id, "delivered")}
            className="text-2xs"
          >
            Mark Delivered
          </Button>
        );
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1 text-2xs text-listening font-medium">
            <CheckCircle2 className="size-3" aria-hidden="true" />
            Complete
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-3.5">
          <p className="text-2xs font-semibold uppercase tracking-wider text-muted">Total Orders</p>
          <p className="mt-1 font-mono text-xl font-bold text-text">{orders.length}</p>
          <p className="mt-0.5 text-2xs text-muted">Current billing period</p>
        </Card>
        <Card className="p-3.5">
          <p className="text-2xs font-semibold uppercase tracking-wider text-muted">Pip Verified Carts</p>
          <p className="mt-1 font-mono text-xl font-bold text-accent-text">{verifiedPct}%</p>
          <p className="mt-0.5 text-2xs text-muted">{verifiedCount} of {orders.length} verified</p>
        </Card>
        <Card className="p-3.5">
          <p className="text-2xs font-semibold uppercase tracking-wider text-muted">Pending Dispatch</p>
          <p className="mt-1 font-mono text-xl font-bold text-searching">
            {orders.filter((o) => o.status === "pending" || o.status === "processing").length}
          </p>
          <p className="mt-0.5 text-2xs text-muted">Requires fulfillment</p>
        </Card>
        <Card className="p-3.5">
          <p className="text-2xs font-semibold uppercase tracking-wider text-muted">Delivered</p>
          <p className="mt-1 font-mono text-xl font-bold text-listening">
            {orders.filter((o) => o.status === "delivered").length}
          </p>
          <p className="mt-0.5 text-2xs text-muted">Confirmed received</p>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <Search className="size-4" aria-hidden="true" />
          </span>
          <Input
            type="search"
            placeholder="Search by order ID, customer, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
            aria-label="Filter orders list"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Order status filter">
          {["all", "pending", "processing", "dispatched", "delivered"].map((st) => (
            <Button
              key={st}
              size="sm"
              variant={statusFilter === st ? "primary" : "secondary"}
              onClick={() => setStatusFilter(st)}
              className="capitalize text-xs"
            >
              {st}
            </Button>
          ))}
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="overflow-hidden rounded-xl bg-surface/50 hairline">
        <div className="overflow-x-auto">
          <table
            className="w-full border-collapse text-left text-xs"
            aria-label="Customer Orders and Cart Verifications"
          >
            <thead>
              <tr className="border-b border-border/60 bg-surface-2/60 text-muted">
                <th scope="col" className="p-3.5 font-medium uppercase tracking-wider text-2xs">
                  Order ID & Date
                </th>
                <th scope="col" className="p-3.5 font-medium uppercase tracking-wider text-2xs">
                  Customer & City
                </th>
                <th scope="col" className="p-3.5 font-medium uppercase tracking-wider text-2xs">
                  Items Purchased
                </th>
                <th scope="col" className="p-3.5 font-medium uppercase tracking-wider text-2xs">
                  Total (NPR)
                </th>
                <th scope="col" className="p-3.5 font-medium uppercase tracking-wider text-2xs">
                  Pip Agent Verification
                </th>
                <th scope="col" className="p-3.5 font-medium uppercase tracking-wider text-2xs">
                  Fulfillment Status
                </th>
                <th scope="col" className="p-3.5 text-right font-medium uppercase tracking-wider text-2xs">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredOrders.map((ord) => (
                <tr key={ord.id} className="transition-colors hover:bg-surface-2/30">
                  <td className="p-3.5 whitespace-nowrap">
                    <p className="font-mono font-semibold text-text">{ord.id}</p>
                    <p className="text-2xs text-muted">{ord.date}</p>
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    <p className="font-medium text-text">{ord.customerName}</p>
                    <p className="text-2xs text-muted flex items-center gap-1">
                      <MapPin className="size-2.5" aria-hidden="true" />
                      {ord.city}
                    </p>
                  </td>
                  <td className="p-3.5">
                    <div className="space-y-0.5">
                      {ord.items.map((it, idx) => (
                        <p key={idx} className="text-text font-medium text-2xs">
                          {it.productName} <span className="text-muted">× {it.quantity}</span>
                        </p>
                      ))}
                    </div>
                  </td>
                  <td className="p-3.5 whitespace-nowrap font-mono font-semibold text-text">
                    {formatNPR(ord.totalNPR)}
                  </td>
                  <td className="p-3.5 whitespace-nowrap">
                    {ord.verifiedByPip ? (
                      <span className="inline-flex items-center gap-1 rounded bg-listening/15 px-2 py-0.5 text-2xs font-medium text-listening">
                        <ShieldCheck className="size-3" aria-hidden="true" />
                        Verified by Agent
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-surface-2 px-2 py-0.5 text-2xs font-medium text-muted hairline">
                        Standard Checkout
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 whitespace-nowrap">{getStatusBadge(ord.status)}</td>
                  <td className="p-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedOrder(ord)}
                        className="text-2xs"
                      >
                        Details
                      </Button>
                      {getNextStatusAction(ord)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-modal-title"
          className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-xl bg-surface p-5 shadow-xl hairline">
            <div className="flex items-start justify-between border-b border-border/60 pb-3">
              <div>
                <h3 id="order-modal-title" className="font-display text-base font-semibold text-text">
                  Order Details: {selectedOrder.id}
                </h3>
                <p className="text-2xs text-muted">Created at {selectedOrder.date}</p>
              </div>
              {getStatusBadge(selectedOrder.status)}
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-muted">Customer</p>
                <p className="text-text font-medium">{selectedOrder.customerName} ({selectedOrder.customerEmail})</p>
                <p className="text-muted">Destination: {selectedOrder.city}, Nepal</p>
              </div>

              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-muted">Items</p>
                <div className="mt-1 divide-y divide-border/40 rounded-lg bg-surface-2/40 p-2 hairline">
                  {selectedOrder.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between py-1 text-2xs">
                      <span className="text-text">{it.productName} × {it.quantity}</span>
                      <span className="font-mono font-medium text-text">{formatNPR(it.unitPrice * it.quantity)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-1.5 font-semibold text-xs text-text">
                    <span>Order Total</span>
                    <span className="font-mono">{formatNPR(selectedOrder.totalNPR)}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-2xs font-semibold uppercase tracking-wider text-muted">Agentic Verification</p>
                <p className="text-2xs text-muted mt-0.5">
                  Verification Token: <span className="font-mono text-text">{selectedOrder.verificationHash}</span>
                </p>
                {selectedOrder.notes && (
                  <p className="mt-1 text-2xs italic text-muted">
                    &ldquo;{selectedOrder.notes}&rdquo;
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedOrder(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
