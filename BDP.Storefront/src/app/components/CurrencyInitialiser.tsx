"use client";
import { useEffect } from "react";
import { useCurrencyStore } from "@/store/currencyStore";
import { fetchCurrencies, detectCountryCode, countryToCurrencyCode } from "@/lib/currency";

export default function CurrencyInitialiser() {
  const { selected, setCurrencies, setSelected } = useCurrencyStore();

  useEffect(() => {
    fetchCurrencies().then((data: { code: string }[]) => {
      if (!data.length) return;
      setCurrencies(data as Parameters<typeof setCurrencies>[0]);
      // Only auto-detect if no selection is persisted
      if (!selected) {
        detectCountryCode().then((countryCode) => {
          const code = countryCode ? countryToCurrencyCode(countryCode) : "ZAR";
          const match =
            data.find((c) => c.code === code) ??
            data.find((c) => c.code === "ZAR");
          if (match) setSelected(match as Parameters<typeof setSelected>[0]);
        });
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
