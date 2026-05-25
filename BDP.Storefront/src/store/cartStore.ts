"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: number;
  productVariantId: number;
  variant: { sku: string; size: string; bottleColour: string; texture: string; imageUrl?: string };
  quantity: number;
  customisationOptionId?: number;
  customisationNotes?: string;
  unitPriceZAR: number;
  lineTotalZAR: number;
}

interface CartState {
  items: CartItem[];
  sessionToken: string;
  cartId: number | null;
  setCart: (data: { id: number; sessionToken: string; items: CartItem[] }) => void;
  clearCart: () => void;
  getSessionToken: () => string;
}

function generateToken() {
  return typeof crypto !== "undefined"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      sessionToken: generateToken(),
      cartId: null,
      setCart: (data) =>
        set({
          cartId: data.id,
          sessionToken: data.sessionToken,
          items: data.items,
        }),
      clearCart: () => set({ items: [], cartId: null }),
      getSessionToken: () => get().sessionToken,
    }),
    { name: "bdp-cart" }
  )
);
