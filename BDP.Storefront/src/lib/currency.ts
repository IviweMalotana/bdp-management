const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5252";

export async function fetchCurrencies() {
  try {
    const res = await fetch(`${API}/api/storefront/currencies`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export function convertFromZAR(zarAmount: number, rateFromZAR: number): number {
  return zarAmount * rateFromZAR;
}

export function formatCurrency(amount: number, symbol: string, code: string): string {
  if (code === "ZAR") {
    return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${symbol}${amount.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function detectCountryCode(): Promise<string | null> {
  try {
    const res = await fetch("https://ipapi.co/json/", {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.country_code ?? null;
  } catch {
    return null;
  }
}

export function countryToCurrencyCode(countryCode: string): string {
  const map: Record<string, string> = {
    ZA: "ZAR",
    GB: "GBP",
    IE: "GBP",
    US: "USD",
    CA: "USD",
    AU: "AUD",
    NZ: "AUD",
    DE: "EUR",
    FR: "EUR",
    IT: "EUR",
    ES: "EUR",
    NL: "EUR",
    BE: "EUR",
    AT: "EUR",
    PT: "EUR",
    FI: "EUR",
    GR: "EUR",
    PL: "EUR",
    SE: "EUR",
    DK: "EUR",
    NO: "EUR",
    CH: "EUR",
  };
  return map[countryCode] ?? "ZAR";
}
