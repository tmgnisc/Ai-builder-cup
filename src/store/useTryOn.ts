import { create } from "zustand";

interface TryOnState {
  open: boolean;
  /** Garment currently being tried on. */
  productId: string | null;
  /** Chosen colour (hex) per clothing product, shared by the gallery, the studio and the cart flow. */
  colors: Record<string, string>;
  openFor: (productId: string) => void;
  select: (productId: string) => void;
  setColor: (productId: string, hex: string) => void;
  close: () => void;
}

export const useTryOn = create<TryOnState>()((set) => ({
  open: false,
  productId: null,
  colors: {},
  openFor: (productId) => set({ open: true, productId }),
  select: (productId) => set({ productId }),
  setColor: (productId, hex) => set((s) => ({ colors: { ...s.colors, [productId]: hex } })),
  close: () => set({ open: false }),
}));
