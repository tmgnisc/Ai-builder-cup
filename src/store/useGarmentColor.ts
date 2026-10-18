import { create } from "zustand";

interface GarmentColorState {
  /** Chosen colour (hex) per clothing product, shared by the colour picker and the gallery. */
  colors: Record<string, string>;
  setColor: (productId: string, hex: string) => void;
}

export const useGarmentColor = create<GarmentColorState>()((set) => ({
  colors: {},
  setColor: (productId, hex) => set((s) => ({ colors: { ...s.colors, [productId]: hex } })),
}));
