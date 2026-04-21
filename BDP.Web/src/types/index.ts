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

export interface ProductPricingTier {
  id: number
  quantity: number
  salePriceZAR: number
  shippingFromChinaZAR: number
  silkScreenLogoZAR: number | null
  hotStampingLogoZAR: number | null
}

export interface Product {
  id: number
  name: string
  skuBase: string
  category: string
  sizeML: number
  bottleColour: string
  lidColour: string
  texture: string
  costCNY: number
  costWithShippingCNY: number
  costPerUnitZAR: number
  supplierLink: string | null
  supplierId: number
  supplierName: string
  isActive: boolean
  shopifyTitle: string | null
  shopifyBodyHtml: string | null
  createdAt: string
  dateAdded: string
  weightKg: number
  lengthCm: number
  widthCm: number
  heightCm: number
  volumeCBM: number
  shipsFrom: string
  pricingTiers: PricingTier[]
  productPricingTiers?: ProductPricingTier[]
  inventoryItems?: InventoryItem[]
}

export interface CustomisationOption {
  id: number
  supplierId: number
  supplierName: string
  type: 'SilkScreen' | 'HotStamping'
  minQuantity: number
  totalPriceZAR: number
  notes: string | null
}

export interface Supplier {
  id: number
  name: string
  country: string
  contactEmail: string | null
  contactPhone: string | null
  website: string | null
  leadTimeDays: number
  minOrderQuantity: number
  offersCustomisation: boolean
  notes: string | null
  productCount: number
  customisationOptionCount: number
  createdAt: string
  products?: {
    id: number
    name: string
    skuBase: string
    category: string
    sizeML: number
    bottleColour: string
    lidColour: string
    isActive: boolean
  }[]
  customisationOptions?: CustomisationOption[]
}

export interface Customer {
  id: number
  companyName: string
  contactName: string
  email: string
  phone: string | null
  brandName: string | null
  country: string
  notes: string | null
  createdAt: string
  totalOrders: number
}

export interface OrderItem {
  id: number
  orderId: number
  productId: number
  productName: string
  sku: string
  quantity: number
  unitPriceZAR: number
  totalPriceZAR: number
  brandingCostZAR: number
}

export interface Order {
  id: number
  orderNumber: string
  customerId: number
  customerName: string
  status: string
  orderDate: string
  estimatedDeliveryDate: string | null
  totalAmountZAR: number
  brandingType: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  orderItems: OrderItem[]
}

export interface OrderStatusCount {
  status: string
  count: number
}

export interface RecentOrder {
  id: number
  orderNumber: string
  customerName: string
  totalAmountZAR: number
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
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
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

export interface OrderStats {
  totalOrders: number
  revenueThisMonth: number
  ordersByStatus: OrderStatusCount[]
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
  notes: string
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
  originCountry: string
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
