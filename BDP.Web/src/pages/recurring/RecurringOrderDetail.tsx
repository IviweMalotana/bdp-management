import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pause, Play, X, Zap } from 'lucide-react'
import type { RecurringOrder, Order } from '../../types'
import { recurringOrders as recurringApi, orders as ordersApi } from '../../services/api'

const fmt = (n: number) => `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`

const STATUS_COLOURS: Record<string, string> = {
  Active:    'bg-green-900/50 text-green-300',
  Paused:    'bg-amber-900/30 text-amber-400',
  Cancelled: 'bg-gray-700 text-gray-400',
}

export default function RecurringOrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<RecurringOrder | null>(null)
  const [generatedOrders, setGeneratedOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')

  const load = () => {
    const rid = Number(id)
    setLoading(true)
    Promise.all([
      recurringApi.getById(rid),
      ordersApi.getAll({ pageSize: 50 }).then((r) => r.items.filter((o) => o.recurringOrderId === rid)).catch(() => [] as Order[]),
    ])
      .then(([r, ords]) => { setOrder(r); setGeneratedOrders(ords) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const handleAction = async (action: 'pause' | 'resume' | 'cancel' | 'trigger') => {
    if (!order) return
    setActionLoading(action)
    try {
      if (action === 'pause') { await recurringApi.pause(order.id); load() }
      else if (action === 'resume') { await recurringApi.resume(order.id); load() }
      else if (action === 'cancel') { if (confirm('Cancel this recurring order?')) { await recurringApi.cancel(order.id); navigate('/recurring-orders') } }
      else if (action === 'trigger') { await recurringApi.trigger(order.id); load() }
    } finally {
      setActionLoading('')
    }
  }

  if (loading) return <div className="text-gray-500 py-12 text-center">Loading…</div>
  if (!order) return <div className="text-gray-500 py-12 text-center">Not found</div>

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/recurring-orders')} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{order.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLOURS[order.status] ?? 'bg-gray-700 text-gray-300'}`}>
                {order.status}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">{order.clientName}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {order.status === 'Active' && (
            <button
              onClick={() => handleAction('pause')}
              disabled={!!actionLoading}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-900/30 border border-amber-800 hover:bg-amber-900/50 text-amber-300 rounded-lg text-sm"
            >
              <Pause size={14} /> Pause
            </button>
          )}
          {order.status === 'Paused' && (
            <button
              onClick={() => handleAction('resume')}
              disabled={!!actionLoading}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-900/30 border border-green-800 hover:bg-green-900/50 text-green-300 rounded-lg text-sm"
            >
              <Play size={14} /> Resume
            </button>
          )}
          <button
            onClick={() => handleAction('trigger')}
            disabled={!!actionLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-900/30 border border-indigo-800 hover:bg-indigo-900/50 text-indigo-300 rounded-lg text-sm"
          >
            <Zap size={14} /> Trigger Now
          </button>
          {order.status !== 'Cancelled' && (
            <button
              onClick={() => handleAction('cancel')}
              disabled={!!actionLoading}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-900/20 border border-red-900 hover:bg-red-900/30 text-red-400 rounded-lg text-sm"
            >
              <X size={14} /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* Contract info */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Frequency', value: order.frequency },
          { label: 'Next Order Date', value: new Date(order.nextOrderDate).toLocaleDateString() },
          { label: 'Contract Start', value: new Date(order.contractStartDate).toLocaleDateString() },
          { label: 'Contract End', value: new Date(order.contractEndDate).toLocaleDateString() },
        ].map((c) => (
          <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className="text-sm font-medium text-white">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Items */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-white">Items per Order</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {['Product', 'Variant', 'Qty', 'Logo'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {order.items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-800/40">
                <td className="px-4 py-3 text-white">{item.productName}</td>
                <td className="px-4 py-3 text-gray-400">{item.variantName}</td>
                <td className="px-4 py-3 text-gray-300">{item.quantity.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-400">{item.customisationType ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Generated orders */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-white">Generated Orders ({generatedOrders.length})</h2>
        </div>
        {generatedOrders.length === 0 ? (
          <p className="px-5 py-8 text-center text-gray-500 text-sm">No orders generated yet</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['Order #', 'Date', 'Status', 'Total', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {generatedOrders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-800/40">
                  <td className="px-4 py-3 font-mono text-indigo-300">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(o.orderDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${{ Draft: 'bg-gray-700 text-gray-300', Confirmed: 'bg-blue-900/50 text-blue-300', Delivered: 'bg-green-900/50 text-green-300' }[o.status] ?? 'bg-gray-700 text-gray-300'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{fmt(o.totalZAR ?? 0)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/orders/${o.id}`)} className="text-xs text-indigo-400 hover:text-indigo-300">View →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {order.notes && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Notes</p>
          <p className="text-sm text-gray-300">{order.notes}</p>
        </div>
      )}
    </div>
  )
}
