import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { customers as customersApi } from '../services/api'
import type { CustomerDetail } from '../types'
import { ChevronLeft, Mail, Phone, Globe, ShoppingCart, Pencil } from 'lucide-react'
import CustomerForm from '../components/CustomerForm'
import OrderForm from '../components/OrderForm'

const STATUS_COLOURS: Record<string, string> = {
  Pending:          'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Confirmed:        'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'In Production':  'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Quality Check':  'bg-orange-500/20 text-orange-400 border-orange-500/30',
  Dispatched:       'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  Delivered:        'bg-green-500/20 text-green-400 border-green-500/30',
  Cancelled:        'bg-red-500/20 text-red-400 border-red-500/30',
}

const formatZAR = (n: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n)

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [showOrderForm, setShowOrderForm] = useState(false)

  const load = () => {
    if (!id) return
    setLoading(true)
    customersApi.getById(Number(id)).then(setCustomer).finally(() => setLoading(false))
  }

  useEffect(load, [id])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>
  if (!customer) return <p className="text-gray-400">Customer not found.</p>

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/customers" className="text-gray-400 hover:text-white transition-colors"><ChevronLeft size={20} /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white">{customer.companyName}</h1>
          {customer.brandName && <p className="text-sm text-indigo-400">Brand: {customer.brandName}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm rounded-lg transition-colors"
          >
            <Pencil size={13} /> Edit
          </button>
          <button
            onClick={() => setShowOrderForm(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <ShoppingCart size={14} /> Create Order
          </button>
        </div>
      </div>

      {/* Info card */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Contact</p>
            <p className="text-sm font-medium text-white">{customer.contactName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Mail size={13} className="text-gray-500 flex-shrink-0" />
            <p className="text-sm text-gray-300">{customer.email}</p>
          </div>
          {customer.phone && (
            <div className="flex items-center gap-2">
              <Phone size={13} className="text-gray-500 flex-shrink-0" />
              <p className="text-sm text-gray-300">{customer.phone}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Globe size={13} className="text-gray-500 flex-shrink-0" />
            <p className="text-sm text-gray-300">{customer.country}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Total Orders</p>
            <p className="text-sm font-semibold text-white">{customer.totalOrders}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Customer Since</p>
            <p className="text-sm text-gray-300">{new Date(customer.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        {customer.notes && (
          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-500 mb-1">Notes</p>
            <p className="text-sm text-gray-300">{customer.notes}</p>
          </div>
        )}
      </div>

      {/* Order history */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Order History ({customer.orders.length})</h2>
        </div>
        {customer.orders.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <ShoppingCart size={28} className="mx-auto mb-2 text-gray-600" />
            <p className="text-sm text-gray-500">No orders yet.</p>
            <button onClick={() => setShowOrderForm(true)} className="mt-3 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              Create first order →
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['Order #', 'Date', 'Status', 'Items', 'Total'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {customer.orders.map((o) => (
                <tr key={o.id} onClick={() => navigate(`/orders/${o.id}`)} className="hover:bg-gray-800/50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-indigo-400">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(o.orderDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_COLOURS[o.status] ?? 'bg-gray-700/40 text-gray-400 border-gray-700'}`}>{o.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{o.orderItems.length}</td>
                  <td className="px-4 py-3 font-semibold text-white">{formatZAR(o.totalAmountZAR)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showEdit && (
        <CustomerForm
          customer={customer}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => { setCustomer({ ...customer, ...updated }); setShowEdit(false) }}
        />
      )}

      {showOrderForm && (
        <OrderForm
          customerId={customer.id}
          onClose={() => setShowOrderForm(false)}
          onSaved={(order) => { setShowOrderForm(false); navigate(`/orders/${order.id}`) }}
        />
      )}
    </div>
  )
}
