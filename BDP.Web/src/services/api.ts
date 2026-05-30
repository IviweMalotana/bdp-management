import axios from 'axios'
import type {
  LoginRequest, LoginResponse, User,
  Product, ProductVariant, ProductImage, PagedResult,
  PricingCalculationResult, AIContentResult,
  InventoryItem, InventorySummary,
  Supplier, CustomisationOption,
  Customer, CustomerDetail,
  Client, ClientSummary, ClientDetail,
  Order, OrderStats,
  Invoice,
  RecurringOrder,
  Collection,
  DashboardSummary,
  Shipment, ShippingSettings,
  ShippingRate, ShippingCalcRequest, ShippingCalcResult,
} from '../types'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('bdp_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('bdp_token')
      localStorage.removeItem('bdp_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

// ── Auth ─────────────────────────────────────────────────────────────────────
export const auth = {
  login: (data: LoginRequest) =>
    http.post<LoginResponse>('/auth/login', data).then((r) => r.data),

  me: () =>
    http.get<User>('/auth/me').then((r) => r.data),
}

// ── Products ─────────────────────────────────────────────────────────────────
export const products = {
  getAll: (params?: { page?: number; pageSize?: number; category?: string; colour?: string; texture?: string }) =>
    http.get<PagedResult<Product>>('/products', { params }).then((r) => r.data),

  getById: (id: number) =>
    http.get<Product>(`/products/${id}`).then((r) => r.data),

  search: (q: string) =>
    http.get<Product[]>('/products/search', { params: { q } }).then((r) => r.data),

  getCategories: () =>
    http.get<string[]>('/products/categories').then((r) => r.data),

  create: (data: object) =>
    http.post<Product>('/products', data).then((r) => r.data),

  update: (id: number, data: object) =>
    http.put<Product>(`/products/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    http.delete(`/products/${id}`),

  // Variants
  addVariant: (productId: number, data: object) =>
    http.post<ProductVariant>(`/products/${productId}/variants`, data).then((r) => r.data),

  updateVariant: (productId: number, variantId: number, data: object) =>
    http.put<ProductVariant>(`/products/${productId}/variants/${variantId}`, data).then((r) => r.data),

  deleteVariant: (productId: number, variantId: number) =>
    http.delete(`/products/${productId}/variants/${variantId}`),

  // Images
  uploadImage: (productId: number, formData: FormData) =>
    http.post<ProductImage>(`/products/${productId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  deleteImage: (productId: number, imageId: number) =>
    http.delete(`/products/${productId}/images/${imageId}`),

  // Legacy
  setPricingTiers: (id: number, tiers: object[]) =>
    http.post(`/products/${id}/pricing-tiers`, { tiers }).then((r) => r.data),

  calculatePricing: (data: object) =>
    http.post<PricingCalculationResult>('/products/calculate-pricing', data).then((r) => r.data),

  generateAiContent: (formData: FormData) =>
    http.post<AIContentResult>('/products/generate-ai-content', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  shopifyExport: (productIds: number[]) => {
    const token = localStorage.getItem('bdp_token')
    const url = `/api/products/shopify-export?productIds=${productIds.join(',')}`
    return fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const href = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = href
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(href)
      })
  },
}

// ── Inventory ─────────────────────────────────────────────────────────────────
export const inventory = {
  getAll: (params?: { location?: string; productId?: number; isStocked?: boolean }) =>
    http.get<InventoryItem[]>('/inventory', { params }).then((r) => r.data),

  getByProduct: (productId: number) =>
    http.get<InventoryItem[]>(`/inventory/${productId}`).then((r) => r.data),

  update: (id: number, data: Partial<InventoryItem>) =>
    http.put<InventoryItem>(`/inventory/${id}`, data).then((r) => r.data),

  bulkUpdate: (items: object[]) =>
    http.post('/inventory/bulk-update', { items }).then((r) => r.data),

  getSummary: () =>
    http.get<InventorySummary[]>('/inventory/summary').then((r) => r.data),

  getLowStock: () =>
    http.get<InventoryItem[]>('/inventory/low-stock').then((r) => r.data),
}

// ── Suppliers ─────────────────────────────────────────────────────────────────
export const suppliers = {
  getAll: () =>
    http.get<Supplier[]>('/suppliers').then((r) => r.data),

  getById: (id: number) =>
    http.get<Supplier>(`/suppliers/${id}`).then((r) => r.data),

  create: (data: Partial<Supplier>) =>
    http.post<Supplier>('/suppliers', data).then((r) => r.data),

  update: (id: number, data: Partial<Supplier>) =>
    http.put<Supplier>(`/suppliers/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    http.delete(`/suppliers/${id}`),
}

// ── Customisation ─────────────────────────────────────────────────────────────
export const customisation = {
  getAll: () =>
    http.get<CustomisationOption[]>('/customisation').then((r) => r.data),

  getBySupplier: (supplierId: number) =>
    http.get<CustomisationOption[]>(`/customisation/supplier/${supplierId}`).then((r) => r.data),

  getByProduct: (productId: number) =>
    http.get<CustomisationOption[]>(`/customisation/product/${productId}`).then((r) => r.data),

  create: (data: object) =>
    http.post<CustomisationOption>('/customisation', data).then((r) => r.data),

  update: (id: number, data: object) =>
    http.put<CustomisationOption>(`/customisation/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    http.delete(`/customisation/${id}`),
}

// ── Clients ───────────────────────────────────────────────────────────────────
export const clients = {
  getAll: (params?: { search?: string; page?: number; pageSize?: number }) =>
    http.get<{ total: number; page: number; pageSize: number; data: ClientSummary[] }>(
      '/clients', { params }).then((r) => r.data),

  getById: (id: number) =>
    http.get<ClientDetail>(`/clients/${id}`).then((r) => r.data),

  create: (data: object) =>
    http.post<Client>('/clients', data).then((r) => r.data),

  update: (id: number, data: object) =>
    http.put<Client>(`/clients/${id}`, data).then((r) => r.data),

  getOrders: (id: number, params?: { page?: number; pageSize?: number }) =>
    http.get<{ id: number; orderNumber: string; status: string; totalZAR: number; isPaid: boolean; orderDate: string }[]>(
      `/clients/${id}/orders`, { params }).then((r) => r.data),

  getInvoices: (id: number) =>
    http.get<Invoice[]>(`/clients/${id}/invoices`).then((r) => r.data),

  getRecurring: (id: number) =>
    http.get<RecurringOrder[]>(`/clients/${id}/recurring`).then((r) => r.data),
}

// ── Orders ────────────────────────────────────────────────────────────────────
export const orders = {
  getAll: (params?: { status?: string; from?: string; to?: string; clientId?: number; page?: number; pageSize?: number }) =>
    http.get<{ items: Order[]; totalCount: number; page: number; pageSize: number; totalPages: number }>(
      '/orders', { params }).then((r) => r.data),

  getById: (id: number) =>
    http.get<Order>(`/orders/${id}`).then((r) => r.data),

  create: (data: object) =>
    http.post<Order>('/orders', data).then((r) => r.data),

  updateStatus: (id: number, status: string) =>
    http.put<Order>(`/orders/${id}/status`, { status }).then((r) => r.data),

  update: (id: number, data: object) =>
    http.put<Order>(`/orders/${id}`, data).then((r) => r.data),

  getStats: () =>
    http.get<OrderStats>('/orders/stats').then((r) => r.data),

  generateInvoice: (id: number) =>
    http.post<Invoice>(`/orders/${id}/invoice`).then((r) => r.data),

  getInvoice: (id: number) =>
    http.get<Invoice>(`/orders/${id}/invoice`).then((r) => r.data),

  createShipment: (id: number, body: object) =>
    http.post(`/orders/${id}/shipment`, body).then((r) => r.data),

  getLabel: (id: number) =>
    http.get(`/orders/${id}/shipment/label`).then((r) => r.data),

  cancelShipment: (id: number) =>
    http.delete(`/orders/${id}/shipment`).then((r) => r.data),

  getYunInfo: (id: number) =>
    http.get(`/orders/${id}/shipment/info`).then((r) => r.data),

  markShipped: (id: number, body: { trackingNumber: string; trackingCarrier?: string }) =>
    http.patch<Order>(`/orders/${id}/mark-shipped`, body).then((r) => r.data),
}

// ── Invoices ──────────────────────────────────────────────────────────────────
export const invoices = {
  getAll: (params?: { status?: string; clientId?: number }) =>
    http.get<Invoice[]>('/invoices', { params }).then((r) => r.data),

  getById: (id: number) =>
    http.get<Invoice>(`/invoices/${id}`).then((r) => r.data),

  send: (id: number) =>
    http.post<Invoice>(`/invoices/${id}/send`).then((r) => r.data),
}

// ── Recurring Orders ──────────────────────────────────────────────────────────
export const recurringOrders = {
  getAll: (params?: { clientId?: number; status?: string }) =>
    http.get<RecurringOrder[]>('/recurring-orders', { params }).then((r) => r.data),

  getById: (id: number) =>
    http.get<RecurringOrder>(`/recurring-orders/${id}`).then((r) => r.data),

  create: (data: object) =>
    http.post<RecurringOrder>('/recurring-orders', data).then((r) => r.data),

  update: (id: number, data: object) =>
    http.put<RecurringOrder>(`/recurring-orders/${id}`, data).then((r) => r.data),

  pause: (id: number) =>
    http.patch(`/recurring-orders/${id}/pause`),

  resume: (id: number) =>
    http.patch(`/recurring-orders/${id}/resume`),

  cancel: (id: number) =>
    http.delete(`/recurring-orders/${id}`),

  trigger: (id: number) =>
    http.post(`/recurring-orders/${id}/trigger`).then((r) => r.data),
}

// ── Collections ───────────────────────────────────────────────────────────────
export const collections = {
  getAll: () =>
    http.get<Collection[]>('/collections').then((r) => r.data),

  getById: (id: number) =>
    http.get<Collection>(`/collections/${id}`).then((r) => r.data),

  create: (data: object) =>
    http.post<Collection>('/collections', data).then((r) => r.data),

  update: (id: number, data: object) =>
    http.put<Collection>(`/collections/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    http.delete(`/collections/${id}`),

  addProduct: (id: number, productId: number) =>
    http.post(`/collections/${id}/products`, { productId }),

  removeProduct: (id: number, productId: number) =>
    http.delete(`/collections/${id}/products/${productId}`),
}

// ── Shipping ──────────────────────────────────────────────────────────────────
export const shipping = {
  calculate: (data: { weightKg: number; volumeCBM: number; quantity: number }) =>
    http.post<{
      totalShippingZAR: number
      perUnitShippingZAR: number
      cnyPerCbm: number
      cnyPerKg: number
      cnyToZarRate: number
    }>('/shipping/calculate', data).then((r) => r.data),

  getSettings: () =>
    http.get<ShippingSettings>('/shipping/settings').then((r) => r.data),

  updateSettings: (data: { cnyPerCbm: number; cnyPerKg: number; cnyToZarRate: number; bufferCNY?: number; profitCNY?: number }) =>
    http.put<ShippingSettings>('/shipping/settings', data).then((r) => r.data),
}

// ── Shipments ─────────────────────────────────────────────────────────────────
export const shipments = {
  getAll: () =>
    http.get<Shipment[]>('/shipments').then((r) => r.data),

  getById: (id: number) =>
    http.get<Shipment>(`/shipments/${id}`).then((r) => r.data),

  create: (data: object) =>
    http.post<Shipment>('/shipments', data).then((r) => r.data),

  update: (id: number, data: object) =>
    http.put<Shipment>(`/shipments/${id}`, data).then((r) => r.data),

  updateStatus: (id: number, status: string) =>
    http.put<Shipment>(`/shipments/${id}/status`, { status }).then((r) => r.data),

  delete: (id: number) =>
    http.delete(`/shipments/${id}`),
}

// ── Customers ─────────────────────────────────────────────────────────────────
export const customers = {
  getAll: (params?: { page?: number; pageSize?: number; search?: string }) =>
    http.get<PagedResult<Customer>>('/customers', { params }).then((r) => r.data),

  getById: (id: number) =>
    http.get<CustomerDetail>(`/customers/${id}`).then((r) => r.data),

  create: (data: Partial<Customer>) =>
    http.post<Customer>('/customers', data).then((r) => r.data),

  update: (id: number, data: Partial<Customer>) =>
    http.put<Customer>(`/customers/${id}`, data).then((r) => r.data),
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboard = {
  getSummary: () =>
    http.get<DashboardSummary>('/dashboard/summary').then((r) => r.data),
}

// ── Shipping Rates ────────────────────────────────────────────────────────────
export const shippingRates = {
  getAll: () =>
    http.get<ShippingRate[]>('/shipping-rates').then((r) => r.data),

  getById: (id: number) =>
    http.get<ShippingRate>(`/shipping-rates/${id}`).then((r) => r.data),

  create: (data: Omit<ShippingRate, 'id' | 'updatedAt'>) =>
    http.post<ShippingRate>('/shipping-rates', data).then((r) => r.data),

  update: (id: number, data: Omit<ShippingRate, 'id' | 'updatedAt'>) =>
    http.put<ShippingRate>(`/shipping-rates/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    http.delete(`/shipping-rates/${id}`),

  calculate: (req: ShippingCalcRequest) =>
    http.post<ShippingCalcResult>('/shipping-rates/calculate', req).then((r) => r.data),
}

export default http
