/** Merchant order shapes, as returned by the backend's /api/orders. */

export type OrderStatus = "pending" | "processing" | "dispatched" | "delivered" | "cancelled";

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface MerchantOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  city: string;
  date: string;
  items: OrderItem[];
  totalNPR: number;
  verifiedByPip: boolean;
  verificationHash: string;
  status: OrderStatus;
  notes?: string;
}
