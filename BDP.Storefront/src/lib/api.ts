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
  customisationOptionIds?: number[],
  jwt?: string
) {
  return request("/api/storefront/cart/items", {
    method: "POST",
    headers: {
      "X-Cart-Token": sessionToken,
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    // Send the array plus the first id for backward compatibility.
    body: JSON.stringify({
      variantId,
      quantity,
      customisationOptionIds,
      customisationOptionId: customisationOptionIds?.[0],
    }),
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

export function getPaymentMethods(): Promise<{ paystack: boolean; payJustNow: boolean }> {
  return request("/api/storefront/checkout/payment-methods");
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

export function getMe(jwt: string) {
  return request("/api/storefront/me", {
    headers: { Authorization: `Bearer ${jwt}` },
  });
}

export function applyForB2B(jwt: string, body: unknown) {
  return request("/api/storefront/me/b2b/apply", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: JSON.stringify(body),
  });
}

export function mergeCart(jwt: string, guestSessionToken: string) {
  return request("/api/storefront/cart/merge", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ guestSessionToken }),
  });
}

export function getOrderById(jwt: string, id: number) {
  return request(`/api/storefront/me/orders/${id}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
}

export function getOrderTracking(jwt: string, id: number) {
  return request(`/api/storefront/me/orders/${id}/tracking`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
}

export function getRecurringOrders(jwt: string) {
  return request("/api/storefront/me/recurring", {
    headers: { Authorization: `Bearer ${jwt}` },
  });
}

export function getRecurringOrderById(jwt: string, id: number) {
  return request(`/api/storefront/me/recurring/${id}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
}

export function createRecurringOrder(jwt: string, body: unknown) {
  return request("/api/storefront/me/recurring", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: JSON.stringify(body),
  });
}

export function pauseRecurringOrder(jwt: string, id: number) {
  return request(`/api/storefront/me/recurring/${id}/pause`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${jwt}` },
  });
}

export function resumeRecurringOrder(jwt: string, id: number) {
  return request(`/api/storefront/me/recurring/${id}/resume`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${jwt}` },
  });
}

export function cancelRecurringOrder(jwt: string, id: number) {
  return request(`/api/storefront/me/recurring/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${jwt}` },
  });
}

export async function uploadArtwork(
  cartItemId: number,
  file: File,
  notes: string | undefined,
  sessionToken: string,
  jwt?: string
): Promise<{ id: number; fileName: string; fileUrl: string; notes: string | null }> {
  const form = new FormData();
  form.append("file", file);
  if (notes) form.append("notes", notes);
  const res = await fetch(`${BASE}/api/storefront/artwork/cart-items/${cartItemId}`, {
    method: "POST",
    headers: {
      "X-Cart-Token": sessionToken,
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`);
  return res.json();
}

export interface ShippingOption {
  code: string;
  name: string;
  description: string;
  transitDaysMin: number;
  transitDaysMax: number;
  priceZAR: number;
  customsIncluded: boolean;
  carrier: string;
  icon: "air" | "sea";
}

// Quote by units (not raw weight) so the storefront and checkout use the identical
// 250 g/unit billing-weight basis the API applies server-side — keeps the price the
// customer is shown equal to the price they are charged.
export function getShippingOptions(country: string, units: number): Promise<ShippingOption[]> {
  return request(`/api/storefront/shipping/options?country=${encodeURIComponent(country)}&units=${Math.max(1, Math.round(units))}`);
}

export function trackOrder(orderNumber: string, email: string) {
  return request(
    `/api/storefront/orders/track?ref=${encodeURIComponent(orderNumber)}&email=${encodeURIComponent(email)}`
  );
}

export async function removeArtwork(
  cartItemId: number,
  sessionToken: string,
  jwt?: string
): Promise<void> {
  const res = await fetch(`${BASE}/api/storefront/artwork/cart-items/${cartItemId}`, {
    method: "DELETE",
    headers: {
      "X-Cart-Token": sessionToken,
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`Remove failed: ${await res.text()}`);
}
