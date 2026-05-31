"use client";
import { useCurrencyStore } from "@/store/currencyStore";
import { convertFromZAR, formatCurrency } from "@/lib/currency";

export default function Price({
  zarAmount,
  className,
}: {
  zarAmount: number;
  className?: string;
}) {
  const selected = useCurrencyStore((s) => s.selected);
  const c = selected ?? { code: "ZAR", symbol: "R", rateFromZAR: 1 };
  const converted = convertFromZAR(zarAmount, c.rateFromZAR);
  return <span className={className}>{formatCurrency(converted, c.symbol, c.code)}</span>;
}
