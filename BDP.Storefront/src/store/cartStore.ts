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
  drawerOpen: boolean;
  setCart: (data: { id: number; sessionToken: string; items: CartItem[] }) => void;
  clearCart: () => void;
  getSessionToken: () => string;
  openDrawer: () => void;
  closeDrawer: () => void;
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
      drawerOpen: false,
      setCart: (data) =>
        set({
          cartId: data.id,
          sessionToken: data.sessionToken,
          items: data.items,
        }),
      clearCart: () => set({ items: [], cartId: null }),
      getSessionToken: () => get().sessionToken,
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
    }),
    {
      name: "bdp-cart",
      partialize: (s) => ({
        items: s.items,
        sessionToken: s.sessionToken,
        cartId: s.cartId,
      }),
    }
  )
);
