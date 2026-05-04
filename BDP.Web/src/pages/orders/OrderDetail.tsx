import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, Download, ChevronDown } from 'lucide-react'
import type { Order, Invoice } from '../../types'
import { orders as ordersApi } from '../../services/api'
import OrderStatusTimeline from '../../components/OrderStatusTimeline'
import InvoiceStatusBadge from '../../components/InvoiceStatusBadge'

const fmt = (n: number) => `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`

const ORDER_STATUSES = ['Draft', 'Confirmed', 'InProduction', 'Shipped', 'Delivered', 'Cancelled']

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusOpen, setStatusOpen] = useState(false)
  const [invoicing, setInvoicing] = useState(false)
  const [invoiceError, setInvoiceError] = useState('')

  const load = () => {
    const orderId = Number(id)
    setLoading(true)
    Promise.all([
      ordersApi.getById(orderId),
      ordersApi.getInvoice(orderId).catch(() => null),
    ])
      .then(([o, inv]) => { setOrder(o); setInvoice(inv) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return
    setStatusOpen(false)
    try {
      const updated = await ordersApi.updateStatus(order.id, newStatus)
      setOrder(updated)
    } catch { /* ignore */ }
  }

  const handleGenerateInvoice = async () => {
    if (!order) return
    setInvoicing(true); setInvoiceError('')
    try {
      const inv = await ordersApi.generateInvoice(order.id)
      setInvoice(inv)
    } catch (e: any) {
      setInvoiceError(e?.response?.data?.message ?? 'Failed to generate invoice')
    } finally {
      setInvoicing(false)
    }
  }

  if (loading) return <div className="text-gray-500 py-12 text-center">Loading…</div>
  if (!order) return <div className="text-gray-500 py-12 text-center">Order not found</div>

  const total = order.totalZAR ?? order.totalAmountZAR ?? 0
  const items = order.items ?? order.orderItems ?? []

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/orders')} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white font-mono">{order.orderNumber}</h1>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                { Draft: 'bg-gray-700 text-gray-300', Confirmed: 'bg-blue-900/50 text-blue-300', InProduction: 'bg-purple-900/50 text-purple-300', Shipped: 'bg-amber-900/50 text-amber-300', Delivered: 'bg-green-900/50 text-green-300', Cancelled: 'bg-red-900/50 text-red-400' }[order.status] ?? 'bg-gray-700 text-gray-300'
              }`}>
                {order.status}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">
              {order.clientName ?? order.customerName} · {new Date(order.orderDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status dropdown */}
          <div className="relative">
            <button
              onClick={() => setStatusOpen(!statusOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white rounded-lg text-sm font-medium"
            >
              Update Status <ChevronDown size={14} />
            </button>
            {statusOpen && (
              <div className="absolute right-0 z-10 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                {ORDER_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-700 ${s === order.status ? 'text-indigo-400' : 'text-white'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Invoice button */}
          {!invoice ? (
            <button
              onClick={handleGenerateInvoice}
              disabled={invoicing}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
            >
              <FileText size={15} />
              {invoicing ? 'Generating…' : 'Generate & Send Invoice'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <InvoiceStatusBadge status={invoice.status} />
              {invoice.pdfUrl && (
                <a
                  href={invoice.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white rounded-lg text-sm"
                >
                  <Download size={14} /> Invoice PDF
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {invoiceError && (
        <div className="px-4 py-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">{invoiceError}</div>
      )}

      {/* Timeline */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <OrderStatusTimeline currentStatus={order.status} />
      </div>

      {/* Items table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-white">Line Items</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {['Product', 'Qty', 'Unit Price', 'Logo', 'Shipping', 'Line Total'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-800/40">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{item.productName}</p>
                  <p className="text-xs text-gray-500">{item.variantSku ?? item.sku}</p>
                </td>
                <td className="px-4 py-3 text-gray-300">{item.quantity.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-300">{fmt(item.unitPriceZAR)}</td>
                <td className="px-4 py-3 text-gray-300">{(item.customisationCostZAR ?? item.brandingCostZAR ?? 0) > 0 ? fmt(item.customisationCostZAR ?? item.brandingCostZAR ?? 0) : '—'}</td>
                <td className="px-4 py-3 text-gray-300">{fmt(item.shippingCostZAR ?? 0)}</td>
                <td className="px-4 py-3 font-medium text-white">{fmt(item.lineTotal ?? item.totalPriceZAR ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Totals */}
        <div className="px-4 py-4 border-t border-gray-800 space-y-1.5 text-sm max-w-xs ml-auto">
          <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>{fmt(order.subtotalZAR ?? 0)}</span></div>
          <div className="flex justify-between text-gray-400"><span>Shipping</span><span>{fmt(order.shippingCostZAR ?? 0)}</span></div>
          <div className="flex justify-between text-white font-bold text-base pt-1.5 border-t border-gray-700"><span>Total</span><span>{fmt(total)}</span></div>
        </div>
      </div>

      {/* Payment + notes */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-2">Payment</p>
          <div className="flex items-center gap-2">
            <span className={`text-sm px-2 py-0.5 rounded font-medium ${order.isPaid ? 'bg-green-900/50 text-green-300' : 'bg-amber-900/20 text-amber-400'}`}>
              {order.isPaid ? 'Paid' : 'Unpaid'}
            </span>
            {order.isPaid && order.paidAt && <span className="text-xs text-gray-500">{new Date(order.paidAt).toLocaleDateString()}</span>}
          </div>
          {order.paystackPaymentReference && (
            <p className="text-xs text-gray-500 mt-1.5">Ref: <span className="font-mono text-gray-400">{order.paystackPaymentReference}</span></p>
          )}
        </div>
        {order.notes && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">Notes</p>
            <p className="text-sm text-gray-300">{order.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
