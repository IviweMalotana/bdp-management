import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { orders as ordersApi } from '../services/api'
import type { Order, PagedResult } from '../types'
import { ShoppingCart, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import OrderForm from '../components/OrderForm'

const STATUS_COLOURS: Record<string, string> = {
  Placed:                   'bg-gray-500/20 text-gray-300 border-gray-500/30',
  Processing:               'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'Customisation Accepted': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Ready to Ship':          'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Shipped:                  'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  Delivered:                'bg-green-500/20 text-green-400 border-green-500/30',
  Cancelled:                'bg-red-500/20 text-red-400 border-red-500/30',
  // legacy
  Pending:                  'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Confirmed:                'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'In Production':          'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

const ALL_STATUSES = ['', 'Placed', 'Processing', 'Customisation Accepted', 'Ready to Ship', 'Shipped', 'Delivered', 'Cancelled']

const formatZAR = (n: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n)

export default function Orders() {
  const navigate = useNavigate()
  const [data, setData] = useState<PagedResult<Order> | null>(null)
  const [status, setStatus] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = (p = 1, s = status, from = fromDate, to = toDate) => {
    setLoading(true)
    ordersApi.getAll({
      page: p,
      pageSize: 20,
      status: s || undefined,
      from: from || undefined,
      to: to || undefined,
    })
      .then((d) => setData(d as PagedResult<Order>))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(page, status, fromDate, toDate) }, [page, status])

  const applyDateFilter = () => { setPage(1); load(1, status, fromDate, toDate) }
  const clearFilters = () => { setStatus(''); setFromDate(''); setToDate(''); setPage(1); load(1, '', '', '') }
  const hasFilters = status || fromDate || toDate

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Orders</h1>
          <p className="text-sm text-gray-400 mt-0.5">{data?.totalCount ?? 0} orders</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} /> Create Order
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Status buttons */}
        <div className="flex flex-wrap gap-1.5">
          {ALL_STATUSES.map((s) => (
            <button
              key={s || 'all'}
              onClick={() => { setStatus(s); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                status === s
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
          />
          <span className="text-gray-500 text-xs">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
          />
          {(fromDate || toDate) && (
            <button onClick={applyDateFilter} className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors">Apply</button>
          )}
        </div>

        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-white transition-colors">Clear all</button>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['Order #', 'Customer', 'Brand', 'Date', 'Est. Delivery', 'Status', 'Items', 'Total'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500">Loading…</td></tr>
              ) : data?.items.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500">
                  <ShoppingCart size={32} className="mx-auto mb-2 opacity-30" />
                  No orders found.
                </td></tr>
              ) : data?.items.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => navigate(`/orders/${o.id}`)}
                  className="hover:bg-gray-800/50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <Link to={`/orders/${o.id}`} className="font-mono text-xs text-indigo-400 hover:text-indigo-300">{o.orderNumber}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-300 font-medium">{o.customerName}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">—</td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{new Date(o.orderDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{o.estimatedDeliveryDate ? new Date(o.estimatedDeliveryDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_COLOURS[o.status] ?? 'bg-gray-700 text-gray-400 border-gray-700'}`}>{o.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{o.orderItems?.length ?? 0}</td>
                  <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">{formatZAR(o.totalAmountZAR ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <span className="text-xs text-gray-400">Page {data.page} of {data.totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= data.totalPages} className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <OrderForm
          onClose={() => setShowForm(false)}
          onSaved={(order) => { setShowForm(false); navigate(`/orders/${order.id}`) }}
        />
      )}
    </div>
  )
}
