"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  flag: string;
  region: string;
  rateFromZAR: number;
}

interface CurrencyStore {
  currencies: Currency[];
  selected: Currency | null;
  setCurrencies: (currencies: Currency[]) => void;
  setSelected: (currency: Currency) => void;
}

export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set) => ({
      currencies: [],
      selected: null,
      setCurrencies: (currencies) => set({ currencies }),
      setSelected: (selected) => set({ selected }),
    }),
    {
      name: "bdp-currency",
      partialize: (state) => ({ selected: state.selected }),
    }
  )
);
