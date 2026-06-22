// ── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  expiresAt: string
  user: User
}

// ── Legacy product types (kept for existing pages) ────────────────────────────
export interface PricingTier {
  id: number
  productId: number
  sku: string
  quantity: number
  markupPercent: number
  salePricePerUnit: number
  totalSalePrice: number
  totalCostPrice: number
  profitPerUnit: number
  totalProfit: number
  marginPercent: number
  logoSilkScreen: number | null
  logoHotStamping: number | null
  deliveryCostZAR: number
  compareAtPrice: number
}

export interface PricingTierCalculation {
  quantity: number
  markupPercent: number
  salePricePerUnit: number
  totalSalePrice: number
  totalCostPrice: number
  profitPerUnit: number
  totalProfit: number
  marginPercent: number
  compareAtPrice: number
  sku: string
}

export interface PricingCalculationResult {
  exchangeRate: number
  costPerUnitZAR: number
  tiers: PricingTierCalculation[]
}

export interface AIContentResult {
  title: string
  htmlBody: string
}

export interface InventoryItem {
  id: number
  productId: number
  productName: string
  sku: string
  quantity: number
  location: string
  onHandStock: number
  incomingStock: number
  committedStock: number
  availableStock: number
  isStocked: boolean
  updatedAt: string
}

// ── B2B Product / Variant types ───────────────────────────────────────────────
export interface VariantPricingTier {
  id: number
  quantity: number
  costCNY: number
  costWithShippingCNY: number
  costWithDutiesCNY: number
  costPerUnitZAR: number
  salePriceZAR: number
  sku: string
  // Admin profitability breakdown (computed server-side)
  salePerUnitZAR: number
  actualCostPerUnitZAR: number
  profitPerUnitZAR: number
  totalCostZAR: number
  totalSaleZAR: number
  totalProfitZAR: number
  marginPercent: number
}

export interface ProductVariant {
  id: number
  productId: number
  size: string
  bottleColour: string
  lidColour: string
  texture: string
  sku: string
  isActive: boolean
  name?: string
  unitPriceCNY?: number
  actualCostPerUnitZAR?: number
  pricingTiers: VariantPricingTier[]
}

export interface ProductImage {
  id: number
  productId: number
  url: string
  altText: string
  sortOrder: number
  isPrimary: boolean
}

export interface Product {
  id: number
  name: string
  category: string
  link1688: string | null
  description: string | null
  usageSuitability: string | null
  metaTitle: string
  metaDescription: string
  metaKeywords: string
  slug: string
  supplierId: number
  supplierName: string
  weightKg: number
  lengthCm: number
  widthCm: number
  heightCm: number
  createdAt: string
  updatedAt: string
  variants: ProductVariant[]
  images?: ProductImage[]
  collections?: string[]
  // Legacy compat fields
  skuBase?: string
  sizeML?: number
  bottleColour?: string
  lidColour?: string
  texture?: string
  isActive?: boolean
  pricingTiers?: PricingTier[]
  costCNY?: number
  costWithShippingCNY?: number
  costPerUnitZAR?: number
  supplierLink?: string
  shopifyTitle?: string
  shopifyBodyHtml?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  productPricingTiers?: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inventoryItems?: any[]
}

export interface ProductPricingTier {
  id: number
  quantity: number
  salePriceZAR: number
  shippingFromChinaZAR: number
  silkScreenLogoZAR: number | null
  hotStampingLogoZAR: number | null
}

// ── Customisation ─────────────────────────────────────────────────────────────
export interface CustomisationPricingTier {
  id: number
  minimumQuantity: number
  pricePerUnitZAR: number
}

export interface CustomisationOption {
  id: number
  supplierId: number
  supplierName: string
  type: 'SilkScreen' | 'HotStamping'
  minimumQuantity: number
  link1688?: string | null
  pricingTiers: CustomisationPricingTier[]
  // legacy
  minQuantity?: number
  totalPriceZAR?: number
  notes?: string | null
}

// ── Supplier ──────────────────────────────────────────────────────────────────
export interface Supplier {
  id: number
  name: string
  country: string
  contactEmail: string | null
  contactPhone: string | null
  website?: string | null
  leadTimeDays?: number
  minOrderQuantity?: number
  offersCustomisation?: boolean
  suppliesBottles?: boolean
  suppliesCustomisation?: boolean
  isActive?: boolean
  notes?: string | null
  productCount?: number
  customisationOptionCount?: number
  createdAt: string
  products?: {
    id: number; name: string; skuBase?: string; category: string
    sizeML?: number; bottleColour?: string; lidColour?: string; isActive?: boolean
  }[]
  customisationOptions?: CustomisationOption[]
}

// ── Client (B2B) ──────────────────────────────────────────────────────────────
export interface Client {
  id: number
  companyName: string
  tradingName: string | null
  companyRegistrationNumber: string | null
  vatNumber: string | null
  contactPersonName: string
  contactEmail: string
  contactPhone: string | null
  billingAddress: string | null
  shippingAddress: string | null
  industry: string | null
  paystackCustomerId: string | null
  creditLimit: number
  paymentTermsDays: number
  isActive: boolean
  createdAt: string
}

export interface ClientSummary {
  id: number
  companyName: string
  contactPersonName: string
  contactEmail: string
  isActive: boolean
  totalOrders: number
  totalSpendZAR: number
}

export interface ClientOrderSummary {
  id: number
  orderNumber: string
  status: string
  totalZAR: number
  isPaid: boolean
  orderDate: string
}

export interface ClientDetail extends Client {
  recentOrders: ClientOrderSummary[]
}

// ── Order ─────────────────────────────────────────────────────────────────────
export interface OrderItem {
  id: number
  orderId: number
  productVariantId: number
  productName: string
  variantSku: string
  sku?: string
  pricingTierId: number
  customisationOptionId: number | null
  customisationPricingTierId: number | null
  quantity: number
  unitPriceZAR: number
  lineTotal: number
  customisationCostZAR: number
  shippingCostZAR: number
  // legacy compat
  totalPriceZAR?: number
  brandingCostZAR?: number
}

export interface Order {
  id: number
  orderNumber: string
  clientId: number
  clientName: string
  status: string
  orderDate: string
  requiredByDate: string | null
  shippedDate: string | null
  deliveredDate: string | null
  subtotalZAR: number
  shippingCostZAR: number
  totalZAR: number
  isPaid: boolean
  paidAt: string | null
  paystackPaymentReference: string | null
  recurringOrderId: number | null
  notes: string | null
  createdAt: string
  items: OrderItem[]
  // fulfilment fields
  trackingNumber: string | null
  trackingCarrier: string | null
  yunOrderId: string | null
  fulfilmentStatus: string
  shippingServiceCode: string | null
  shippingServiceName: string | null
  // legacy compat
  customerId?: number
  customerName?: string
  totalAmountZAR?: number
  orderItems?: OrderItem[]
  estimatedDeliveryDate?: string
  brandingType?: string
  updatedAt?: string
}

export interface OrderStatusCount {
  status: string
  count: number
}

export interface OrderStats {
  totalOrders: number
  revenueThisMonth: number
  ordersByStatus: OrderStatusCount[]
}

// ── Invoice ───────────────────────────────────────────────────────────────────
export interface Invoice {
  id: number
  invoiceNumber: string
  orderId: number
  orderNumber: string
  clientId: number
  clientName: string
  invoiceDate: string
  dueDate: string
  subtotalZAR: number
  vatZAR: number
  totalZAR: number
  status: string
  pdfUrl: string | null
  sentAt: string | null
  paidAt: string | null
  paystackPaymentRequestId: string | null
  createdAt: string
}

// ── Recurring Order ───────────────────────────────────────────────────────────
export interface RecurringOrderItem {
  id: number
  productVariantId: number
  variantName: string
  productName: string
  customisationOptionId: number | null
  customisationType: string | null
  quantity: number
}

export interface RecurringOrder {
  id: number
  clientId: number
  clientName: string
  name: string
  frequency: string
  frequencyDays: number
  contractStartDate: string
  contractEndDate: string
  nextOrderDate: string
  status: string
  notes: string | null
  items: RecurringOrderItem[]
  createdAt: string
}

// ── Collection ────────────────────────────────────────────────────────────────
export interface CollectionProduct {
  productId: number
  name: string
  category: string
  slug: string
  variantCount: number
}

export interface Collection {
  id: number
  name: string
  description: string
  metaTitle: string
  metaDescription: string
  metaKeywords: string
  slug: string
  imageUrl: string | null
  productCount: number
  createdAt: string
  products?: CollectionProduct[]
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface RecentOrder {
  id: number
  orderNumber: string
  customerName?: string
  clientName?: string
  totalAmountZAR?: number
  totalZAR?: number
  status: string
  orderDate: string
}

export interface DashboardSummary {
  totalProducts: number
  totalActiveOrders: number
  totalCustomers: number
  revenueThisMonth: number
  ordersThisMonth: number
  lowStockCount: number
  ordersByStatus: OrderStatusCount[]
  recentOrders: RecentOrder[]
  // B2B additions
  activeClients?: number
  openOrders?: number
  overdueInvoices?: number
  recurringDueThisWeek?: number
}

// ── Shared ────────────────────────────────────────────────────────────────────
export interface PagedResult<T> {
  items: T[]
  data?: T[]
  total?: number
  totalCount?: number
  page: number
  pageSize: number
  totalPages: number
}

export interface InventorySummary {
  location: string
  totalOnHand: number
  totalAvailable: number
  totalIncoming: number
  totalCommitted: number
  itemCount: number
}

export interface Customer {
  id: number
  companyName: string
  contactName: string
  email: string
  phone: string | null
  brandName?: string | null
  country: string
  notes: string | null
  createdAt: string
  totalOrders: number
}

export interface CustomerDetail extends Customer {
  orders: Order[]
}

export interface ShipmentItem {
  id: number
  productId: number
  productName: string
  sku: string
  quantity: number
  costPerUnitZAR: number
  totalCostZAR: number
}

export interface ShippingSettings {
  id: number
  cnyPerCbm: number
  cnyPerKg: number
  cnyToZarRate: number
  bufferCNY?: number
  profitCNY?: number
  updatedAt?: string
  notes?: string
}

// ── Shipping Rates ────────────────────────────────────────────────────────────
export interface ShippingRate {
  id: number
  country: string
  shippingType: string           // AirDDP | AirDDU | SeaDDP | SeaDDU
  ratePerKg: number
  ratePerCbm: number
  fuelSurchargePercent: number
  dutyRatePercent: number
  vatRatePercent: number
  handlingFeeZAR: number
  minimumChargeZAR: number
  exchangeRateCNYToZAR: number
  estimatedTransitDays: number
  isActive: boolean
  notes: string | null
  updatedAt: string
}

export interface ShippingCalcRequest {
  country: string
  shippingType: string
  weightKg: number
  volumeCBM: number
}

export interface ShippingCalcResult {
  country: string
  shippingType: string
  weightKg: number
  volumeCBM: number
  baseCostCNY: number
  withSurchargeCNY: number
  withDutiesCNY: number
  rawZAR: number
  totalZAR: number
  minimumApplied: boolean
  estimatedTransitDays: number
}

export interface Shipment {
  id: number
  reference: string
  supplierId: number
  supplierName: string
  status: 'Ordered' | 'ManufacturingInProgress' | 'ReadyToShip' | 'InTransit' | 'InCustoms' | 'OutForDelivery' | 'Delivered' | 'Cancelled'
  orderDate: string
  estimatedArrival: string | null
  actualArrival: string | null
  originCountry?: string
  seaFreightCostZAR: number
  customsDutyZAR: number
  ddpTotalZAR: number
  totalCostZAR: number
  destinationAddress: string | null
  customerName: string | null
  customerEmail: string | null
  notes: string | null
  itemCount: number
  createdAt: string
  items?: ShipmentItem[]
}
