import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { orders as ordersApi } from '../services/api'
import type { Order } from '../types'
import { ChevronLeft, Loader2 } from 'lucide-react'

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

const BASE_STEPS = ['Placed', 'Processing', 'Ready to Ship', 'Shipped', 'Delivered']

const formatZAR = (n: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n)

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    ordersApi.getById(Number(id)).then((o) => { setOrder(o) }).finally(() => setLoading(false))
  }, [id])

  const handleStatusUpdate = async (newStatus: string) => {
    if (!order || newStatus === order.status) return
    setUpdatingStatus(newStatus)
    setStatusMsg(null)
    try {
      const updated = await ordersApi.updateStatus(order.id, newStatus)
      setOrder(updated)
      setStatusMsg('Status updated.')
      setTimeout(() => setStatusMsg(null), 3000)
    } catch {
      setStatusMsg('Failed to update status.')
    } finally { setUpdatingStatus(null) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>
  if (!order) return <p className="text-gray-400">Order not found.</p>

  const hasCustomisation = (order.items ?? order.orderItems ?? []).some((i: { customisationOptionId?: unknown }) => i.customisationOptionId != null)
  const steps = hasCustomisation
    ? ['Placed', 'Processing', 'Customisation Accepted', 'Ready to Ship', 'Shipped', 'Delivered']
    : BASE_STEPS

  const currentIdx = steps.indexOf(order.status)

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
        {/* Current status badge */}
        <span className={`text-xs px-2.5 py-1 rounded border font-medium flex-shrink-0 ${STATUS_COLOURS[order.status] ?? 'bg-gray-700 text-gray-400 border-gray-700'}`}>
          {order.status}
        </span>
      </div>

      {statusMsg && (
        <p className={`text-sm px-3 py-2 rounded-lg border ${statusMsg.includes('Failed') ? 'text-red-400 bg-red-900/20 border-red-800' : 'text-green-400 bg-green-900/20 border-green-800'}`}>
          {statusMsg}
        </p>
      )}

      {/* Order Progress Pipeline */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Order Progress</p>
        <div className="overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {steps.map((step, idx) => {
              const isCurrent = order.status === step
              const isCompleted = currentIdx > idx
              const isLoading = updatingStatus === step

              return (
                <div key={step} className="flex items-center gap-1">
                  <button
                    onClick={() => handleStatusUpdate(step)}
                    disabled={isCurrent || updatingStatus !== null}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                      isCurrent
                        ? 'bg-indigo-600 text-white border-indigo-600 cursor-default'
                        : isCompleted
                        ? 'bg-green-900/30 text-green-400 border-green-800/50 hover:bg-green-900/50 cursor-pointer'
                        : 'bg-gray-800/50 text-gray-400 border-gray-700 hover:bg-gray-800 hover:text-white cursor-pointer'
                    } disabled:opacity-60`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      isCurrent ? 'bg-white/20 text-white' : isCompleted ? 'bg-green-500/30 text-green-400' : 'bg-gray-700 text-gray-500'
                    }`}>
                      {isLoading ? <Loader2 size={10} className="animate-spin" /> : isCompleted ? '✓' : idx + 1}
                    </span>
                    <span className="whitespace-nowrap">{step}</span>
                  </button>
                  {idx < steps.length - 1 && (
                    <span className="text-gray-600 text-sm px-0.5">›</span>
                  )}
                </div>
              )
            })}

            {/* Separator before Cancelled */}
            <span className="text-gray-700 text-sm px-1 mx-1">|</span>

            {/* Cancelled — always shown at end */}
            <button
              onClick={() => handleStatusUpdate('Cancelled')}
              disabled={order.status === 'Cancelled' || updatingStatus !== null}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                order.status === 'Cancelled'
                  ? 'bg-red-600 text-white border-red-600 cursor-default'
                  : 'bg-red-900/20 text-red-400 border-red-800/40 hover:bg-red-900/40 cursor-pointer'
              } disabled:opacity-60`}
            >
              {updatingStatus === 'Cancelled' && <Loader2 size={10} className="animate-spin" />}
              <span className="whitespace-nowrap">Cancelled</span>
            </button>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          ['Order Date', new Date(order.orderDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })],
          ['Est. Delivery', order.estimatedDeliveryDate ? new Date(order.estimatedDeliveryDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'],
          ['Branding', order.brandingType ?? 'None'],
          ['Order Total', formatZAR(order.totalAmountZAR ?? 0)],
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
          <h2 className="text-sm font-semibold text-white">Line Items ({order.orderItems?.length ?? 0})</h2>
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
              {(order.orderItems ?? []).map((oi) => (
                <tr key={oi.id} className="hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium text-white">{oi.productName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{oi.sku}</td>
                  <td className="px-4 py-3 text-gray-300">{oi.quantity.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-300">{formatZAR(oi.unitPriceZAR)}</td>
                  <td className="px-4 py-3 text-gray-300">{(oi.brandingCostZAR ?? 0) > 0 ? formatZAR(oi.brandingCostZAR ?? 0) : '—'}</td>
                  <td className="px-4 py-3 font-semibold text-white">{formatZAR(oi.totalPriceZAR ?? 0)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-700 bg-gray-800/50">
                <td colSpan={5} className="px-4 py-3 text-right text-sm font-semibold text-gray-300">Order Total</td>
                <td className="px-4 py-3 font-bold text-white text-base">{formatZAR(order.totalAmountZAR ?? 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Meta */}
      <p className="text-xs text-gray-600">
        Created {new Date(order.createdAt).toLocaleString()}{order.updatedAt ? ` · Last updated ${new Date(order.updatedAt).toLocaleString()}` : ''}
      </p>
    </div>
  )
}
