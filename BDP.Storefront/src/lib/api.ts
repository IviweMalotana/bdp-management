const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5252";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export interface QuoteLine {
  variantId: number;
  quantity: number;
  customisationOptionId?: number;
}

export function getProducts(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return request(`/api/storefront/products${qs}`);
}

export function getProductBySlug(slug: string) {
  return request(`/api/storefront/products/${slug}`);
}

export function getCollections() {
  return request("/api/storefront/collections");
}

export function getCategories() {
  return request("/api/storefront/categories");
}

export function pricingQuote(lines: QuoteLine[]) {
  return request("/api/storefront/pricing/quote", {
    method: "POST",
    body: JSON.stringify(lines),
  });
}

export function getCart(sessionToken: string, jwt?: string) {
  return request("/api/storefront/cart", {
    headers: {
      "X-Cart-Token": sessionToken,
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
  });
}

export function addToCart(
  sessionToken: string,
  variantId: number,
  quantity: number,
  customisationOptionId?: number,
  jwt?: string
) {
  return request("/api/storefront/cart/items", {
    method: "POST",
    headers: {
      "X-Cart-Token": sessionToken,
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify({ variantId, quantity, customisationOptionId }),
  });
}

export function updateCartItem(
  itemId: number,
  quantity: number,
  sessionToken: string,
  jwt?: string
) {
  return request(`/api/storefront/cart/items/${itemId}`, {
    method: "PATCH",
    headers: {
      "X-Cart-Token": sessionToken,
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: JSON.stringify({ quantity }),
  });
}

export function removeCartItem(
  itemId: number,
  sessionToken: string,
  jwt?: string
) {
  return request(`/api/storefront/cart/items/${itemId}`, {
    method: "DELETE",
    headers: {
      "X-Cart-Token": sessionToken,
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
  });
}

export function initiateCheckout(body: unknown, jwt?: string) {
  return request("/api/storefront/checkout/initiate", {
    method: "POST",
    headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
    body: JSON.stringify(body),
  });
}

export function verifyCheckout(reference: string, sessionToken: string, jwt?: string) {
  return request(`/api/storefront/checkout/verify/${reference}`, {
    method: "POST",
    headers: {
      "X-Cart-Token": sessionToken,
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
  });
}

export function shippingQuote(body: unknown) {
  return request("/api/storefront/checkout/shipping-quote", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function registerUser(body: unknown) {
  return request("/api/storefront/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function loginUser(body: unknown) {
  return request("/api/storefront/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getOrders(jwt: string) {
  return request("/api/storefront/me/orders", {
    headers: { Authorization: `Bearer ${jwt}` },
  });
}
