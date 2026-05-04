import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, ShoppingCart } from 'lucide-react'
import type { Order } from '../../types'
import { orders as ordersApi } from '../../services/api'

const fmt = (n: number) => `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`

const STATUS_COLOURS: Record<string, string> = {
  Draft:        'bg-gray-700 text-gray-300',
  Confirmed:    'bg-blue-900/50 text-blue-300',
  InProduction: 'bg-purple-900/50 text-purple-300',
  Shipped:      'bg-amber-900/50 text-amber-300',
  Delivered:    'bg-green-900/50 text-green-300',
  Cancelled:    'bg-red-900/50 text-red-400',
}

const STATUSES = ['All', 'Draft', 'Confirmed', 'InProduction', 'Shipped', 'Delivered', 'Cancelled']

export default function OrdersList() {
  const navigate = useNavigate()
  const [data, setData] = useState<Order[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('All')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(true)

  const PAGE_SIZE = 20

  const fetch = (p = page, s = status, f = from, t = to) => {
    setLoading(true)
    ordersApi
      .getAll({
        status: s === 'All' ? undefined : s,
        from: f || undefined,
        to: t || undefined,
        page: p,
        pageSize: PAGE_SIZE,
      })
      .then((r) => { setData(r.items); setTotal(r.totalCount) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [page, status, from, to])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Orders</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total} total orders</p>
        </div>
        <button
          onClick={() => navigate('/orders/new')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium"
        >
          <Plus size={16} /> Create Order
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Status pills */}
        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                status === s ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {/* Date range */}
        <div className="flex items-center gap-2 ml-auto">
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1) }}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
          />
          <span className="text-gray-500 text-xs">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1) }}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
          />
          {(from || to) && (
            <button onClick={() => { setFrom(''); setTo('') }} className="text-xs text-gray-400 hover:text-white">Clear</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['Order #', 'Client', 'Date', 'Status', 'Total', 'Paid', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">Loading…</td></tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <ShoppingCart size={32} className="mx-auto text-gray-700 mb-2" />
                    <p className="text-gray-500">No orders found</p>
                  </td>
                </tr>
              ) : data.map((o) => (
                <tr key={o.id} className="hover:bg-gray-800/50 transition-colors cursor-pointer" onClick={() => navigate(`/orders/${o.id}`)}>
                  <td className="px-4 py-3 font-mono text-indigo-300">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-white">{o.clientName ?? o.customerName}</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(o.orderDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLOURS[o.status] ?? 'bg-gray-700 text-gray-300'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{fmt(o.totalZAR ?? o.totalAmountZAR ?? 0)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${o.isPaid ? 'bg-green-900/50 text-green-300' : 'bg-amber-900/20 text-amber-500'}`}>
                      {o.isPaid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/orders/${o.id}`) }}
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between text-sm text-gray-400">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40">Prev</button>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
