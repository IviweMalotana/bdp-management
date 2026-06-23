import { useEffect, Component, type ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

import PrivateRoute from './components/PrivateRoute'
import Layout from './components/Layout'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Customers from './pages/Customers'
import CustomerDetail from './pages/CustomerDetail'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import SuppliersPage from './pages/SuppliersPage'
import ShipmentsPage from './pages/ShipmentsPage'
import ShippingSettingsPage from './pages/ShippingSettingsPage'

// B2B pages
import ClientsList from './pages/clients/ClientsList'
import ClientForm from './pages/clients/ClientForm'
import ClientDetail from './pages/clients/ClientDetail'
import OrdersList from './pages/orders/OrdersList'
import CreateOrder from './pages/orders/CreateOrder'
import OrderDetailB2B from './pages/orders/OrderDetail'
import RecurringOrdersList from './pages/recurring/RecurringOrdersList'
import RecurringOrderForm from './pages/recurring/RecurringOrderForm'
import RecurringOrderDetail from './pages/recurring/RecurringOrderDetail'
import InvoicesList from './pages/invoices/InvoicesList'
import InvoiceDetail from './pages/invoices/InvoiceDetail'
import CollectionsList from './pages/collections/CollectionsList'
import CollectionForm from './pages/collections/CollectionForm'
import PendingApplications from './pages/b2b/PendingApplications'
import CataloguePage from './pages/catalogue/CataloguePage'
import CustomisationSettings from './pages/settings/CustomisationSettings'
import EmailTemplatesPage from './pages/settings/EmailTemplatesPage'
import YunExpressTestPage from './pages/YunExpressTestPage'
import EmailTestPage from './pages/EmailTestPage'
import CustomisationProfitPage from './pages/CustomisationProfitPage'
import ShippingMarginPage from './pages/ShippingMarginPage'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e.message } }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
          <div className="bg-red-900/40 border border-red-700 rounded-xl p-6 max-w-lg">
            <p className="text-red-300 font-mono text-sm">{this.state.error}</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const initializeFromStorage = useAuthStore((s) => s.initializeFromStorage)

  useEffect(() => {
    initializeFromStorage()
  }, [initializeFromStorage])

  return (
    <ErrorBoundary>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected — all under Layout */}
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/"               element={<Dashboard />} />
            <Route path="/products"       element={<Products />} />
            <Route path="/products/:id"   element={<ProductDetail />} />
            <Route path="/customers"      element={<Customers />} />
            <Route path="/customers/:id"  element={<CustomerDetail />} />
            <Route path="/orders"         element={<Orders />} />
            <Route path="/orders/:id"     element={<OrderDetail />} />
            <Route path="/suppliers"         element={<SuppliersPage />} />
            <Route path="/shipments"         element={<ShipmentsPage />} />
            <Route path="/settings/shipping" element={<ShippingSettingsPage />} />
            <Route path="/settings/customisation" element={<CustomisationSettings />} />
            <Route path="/settings/emails" element={<EmailTemplatesPage />} />
            <Route path="/customisation-profit" element={<CustomisationProfitPage />} />
            <Route path="/shipping-margin" element={<ShippingMarginPage />} />

            {/* B2B — Clients */}
            <Route path="/clients"           element={<ClientsList />} />
            <Route path="/clients/new"       element={<ClientForm />} />
            <Route path="/clients/:id"       element={<ClientDetail />} />
            <Route path="/clients/:id/edit"  element={<ClientForm />} />

            {/* B2B — Orders */}
            <Route path="/b2b-orders"        element={<OrdersList />} />
            <Route path="/b2b-orders/new"    element={<CreateOrder />} />
            <Route path="/b2b-orders/:id"    element={<OrderDetailB2B />} />

            {/* B2B — Recurring Orders */}
            <Route path="/recurring-orders"          element={<RecurringOrdersList />} />
            <Route path="/recurring-orders/new"      element={<RecurringOrderForm />} />
            <Route path="/recurring-orders/:id"      element={<RecurringOrderDetail />} />
            <Route path="/recurring-orders/:id/edit" element={<RecurringOrderForm />} />

            {/* B2B — Invoices */}
            <Route path="/invoices"     element={<InvoicesList />} />
            <Route path="/invoices/:id" element={<InvoiceDetail />} />

            {/* Collections */}
            <Route path="/collections"           element={<CollectionsList />} />
            <Route path="/collections/new"       element={<CollectionForm />} />
            <Route path="/collections/:id/edit"  element={<CollectionForm />} />

            {/* B2B Applications */}
            <Route path="/b2b/pending" element={<PendingApplications />} />

            {/* Catalogue */}
            <Route path="/catalogue" element={<CataloguePage />} />
            <Route path="/yunexpress-test" element={<YunExpressTestPage />} />
            <Route path="/email-test" element={<EmailTestPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
