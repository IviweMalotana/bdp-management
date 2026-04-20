import axios from 'axios'
import type {
  LoginRequest, LoginResponse, User,
  Product, PagedResult,
  PricingCalculationResult, AIContentResult,
  InventoryItem, InventorySummary,
  Supplier,
  Customer, CustomerDetail,
  Order, OrderStats,
  DashboardSummary,
} from '../types'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT to every request
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('bdp_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401, clear auth and redirect to login — but not for the login endpoint itself
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

// ── Auth ────────────────────────────────────────────────────────────────────
export const auth = {
  login: (data: LoginRequest) =>
    http.post<LoginResponse>('/auth/login', data).then((r) => r.data),

  me: () =>
    http.get<User>('/auth/me').then((r) => r.data),
}

// ── Products ────────────────────────────────────────────────────────────────
export const products = {
  getAll: (params?: {
    page?: number
    pageSize?: number
    category?: string
    colour?: string
    texture?: string
  }) => http.get<PagedResult<Product>>('/products', { params }).then((r) => r.data),

  getById: (id: number) =>
    http.get<Product>(`/products/${id}`).then((r) => r.data),

  search: (q: string) =>
    http.get<Product[]>('/products/search', { params: { q } }).then((r) => r.data),

  getCategories: () =>
    http.get<string[]>('/products/categories').then((r) => r.data),

  create: (data: Partial<Product>) =>
    http.post<Product>('/products', data).then((r) => r.data),

  update: (id: number, data: Partial<Product>) =>
    http.put<Product>(`/products/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    http.delete(`/products/${id}`),

  setPricingTiers: (id: number, tiers: object[]) =>
    http.post(`/products/${id}/pricing-tiers`, { tiers }).then((r) => r.data),

  calculatePricing: (data: {
    costCNY: number; productName: string; category: string; size: string;
    bottleColour: string; lidColour: string; texture: string
  }) => http.post<PricingCalculationResult>('/products/calculate-pricing', data).then((r) => r.data),

  generateAiContent: (formData: FormData) =>
    http.post<AIContentResult>('/products/generate-ai-content', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  shopifyExport: (productIds: number[]) => {
    const token = localStorage.getItem('bdp_token')
    const url = `/api/products/shopify-export?productIds=${productIds.join(',')}`
    const a = document.createElement('a')
    a.href = url
    a.setAttribute('download', '')
    // attach auth via fetch then trigger download
    return fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const href = URL.createObjectURL(blob)
        a.href = href
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(href)
      })
  },
}

// ── Inventory ───────────────────────────────────────────────────────────────
export const inventory = {
  getAll: (params?: { location?: string; productId?: number; isStocked?: boolean }) =>
    http.get<InventoryItem[]>('/inventory', { params }).then((r) => r.data),

  getByProduct: (productId: number) =>
    http.get<InventoryItem[]>(`/inventory/${productId}`).then((r) => r.data),

  update: (id: number, data: Partial<InventoryItem>) =>
    http.put<InventoryItem>(`/inventory/${id}`, data).then((r) => r.data),

  bulkUpdate: (items: { id: number; onHandStock: number; incomingStock: number; committedStock: number; availableStock: number; isStocked: boolean }[]) =>
    http.post('/inventory/bulk-update', { items }).then((r) => r.data),

  getSummary: () =>
    http.get<InventorySummary[]>('/inventory/summary').then((r) => r.data),

  getLowStock: () =>
    http.get<InventoryItem[]>('/inventory/low-stock').then((r) => r.data),
}

// ── Suppliers ───────────────────────────────────────────────────────────────
export const suppliers = {
  getAll: () =>
    http.get<Supplier[]>('/suppliers').then((r) => r.data),

  getById: (id: number) =>
    http.get<Supplier>(`/suppliers/${id}`).then((r) => r.data),
}

// ── Customers ───────────────────────────────────────────────────────────────
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

// ── Orders ──────────────────────────────────────────────────────────────────
export const orders = {
  getAll: (params?: { status?: string; from?: string; to?: string; page?: number; pageSize?: number }) =>
    http.get<PagedResult<Order>>('/orders', { params }).then((r) => r.data),

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
}

// ── Dashboard ───────────────────────────────────────────────────────────────
export const dashboard = {
  getSummary: () =>
    http.get<DashboardSummary>('/dashboard/summary').then((r) => r.data),
}

export default http
