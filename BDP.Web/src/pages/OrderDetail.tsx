import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { orders as ordersApi } from '../services/api'
import type { Order } from '../types'
import { ChevronLeft, ChevronDown, Loader2 } from 'lucide-react'

const STATUS_COLOURS: Record<string, string> = {
  Pending:          'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Confirmed:        'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'In Production':  'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Quality Check':  'bg-orange-500/20 text-orange-400 border-orange-500/30',
  Dispatched:       'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  Delivered:        'bg-green-500/20 text-green-400 border-green-500/30',
  Cancelled:        'bg-red-500/20 text-red-400 border-red-500/30',
}

const ALL_STATUSES = ['Pending', 'Confirmed', 'In Production', 'Quality Check', 'Dispatched', 'Delivered', 'Cancelled']

const formatZAR = (n: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n)

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [newStatus, setNewStatus] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    ordersApi.getById(Number(id)).then((o) => { setOrder(o); setNewStatus(o.status) }).finally(() => setLoading(false))
  }, [id])

  const handleStatusUpdate = async () => {
    if (!order || newStatus === order.status) return
    setUpdatingStatus(true)
    setStatusMsg(null)
    try {
      const updated = await ordersApi.updateStatus(order.id, newStatus)
      setOrder(updated)
      setStatusMsg('Status updated.')
      setTimeout(() => setStatusMsg(null), 3000)
    } catch {
      setStatusMsg('Failed to update status.')
    } finally { setUpdatingStatus(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>
  if (!order) return <p className="text-gray-400">Order not found.</p>

  const statusChanged = newStatus !== order.status

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/orders" className="text-gray-400 hover:text-white transition-colors"><ChevronLeft size={20} /></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white font-mono">{order.orderNumber}</h1>
          <Link to={`/customers/${order.customerId}`} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            {order.customerName}
          </Link>
        </div>
        {/* Status update */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="relative">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          {statusChanged && (
            <button
              onClick={handleStatusUpdate}
              disabled={updatingStatus}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {updatingStatus && <Loader2 size={13} className="animate-spin" />}
              Update
            </button>
          )}
          {!statusChanged && (
            <span className={`text-xs px-2.5 py-1 rounded border font-medium ${STATUS_COLOURS[order.status] ?? 'bg-gray-700 text-gray-400 border-gray-700'}`}>
              {order.status}
            </span>
          )}
        </div>
      </div>

      {statusMsg && (
        <p className={`text-sm px-3 py-2 rounded-lg border ${statusMsg.includes('Failed') ? 'text-red-400 bg-red-900/20 border-red-800' : 'text-green-400 bg-green-900/20 border-green-800'}`}>
          {statusMsg}
        </p>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          ['Order Date', new Date(order.orderDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })],
          ['Est. Delivery', order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'],
          ['Branding', order.brandingType ?? 'None'],
          ['Order Total', formatZAR(order.totalAmountZAR)],
        ] as [string, string][]).map(([l, v]) => (
          <div key={l} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">{l}</p>
            <p className="text-sm font-semibold text-white">{v}</p>
          </div>
        ))}
      </div>

      {order.notes && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
          <p className="text-xs text-gray-500 mb-1">Notes</p>
          <p className="text-sm text-gray-300">{order.notes}</p>
        </div>
      )}

      {/* Line items */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">Line Items ({order.orderItems.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['Product', 'SKU', 'Qty', 'Unit Price', 'Branding', 'Line Total'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {order.orderItems.map((oi) => (
                <tr key={oi.id} className="hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium text-white">{oi.productName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{oi.sku}</td>
                  <td className="px-4 py-3 text-gray-300">{oi.quantity.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-300">{formatZAR(oi.unitPriceZAR)}</td>
                  <td className="px-4 py-3 text-gray-300">{oi.brandingCostZAR > 0 ? formatZAR(oi.brandingCostZAR) : '—'}</td>
                  <td className="px-4 py-3 font-semibold text-white">{formatZAR(oi.totalPriceZAR)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-700 bg-gray-800/50">
                <td colSpan={5} className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Order Total</td>
                <td className="px-4 py-3 font-bold text-white text-base">{formatZAR(order.totalAmountZAR)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Meta */}
      <p className="text-xs text-gray-600">
        Created {new Date(order.createdAt).toLocaleString()} · Last updated {new Date(order.updatedAt).toLocaleString()}
      </p>
    </div>
  )
}
