import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Send, ExternalLink } from 'lucide-react'
import type { Invoice, Order } from '../../types'
import { invoices as invoicesApi, orders as ordersApi } from '../../services/api'
import InvoiceStatusBadge from '../../components/InvoiceStatusBadge'

const fmt = (n: number) => `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`

export default function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  useEffect(() => {
    invoicesApi.getById(Number(id))
      .then((inv) => {
        setInvoice(inv)
        return ordersApi.getById(inv.orderId)
      })
      .then(setOrder)
      .finally(() => setLoading(false))
  }, [id])

  const handleSend = async () => {
    if (!invoice) return
    setSending(true); setSendError('')
    try {
      const updated = await invoicesApi.send(invoice.id)
      setInvoice(updated)
    } catch (e: any) {
      setSendError(e?.response?.data?.message ?? 'Failed to send invoice')
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="text-gray-500 py-12 text-center">Loading…</div>
  if (!invoice) return <div className="text-gray-500 py-12 text-center">Invoice not found</div>

  const items = order?.items ?? order?.orderItems ?? []
  const isOverdue = invoice.status === 'Sent' && new Date(invoice.dueDate) < new Date()

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/invoices')} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white font-mono">{invoice.invoiceNumber}</h1>
              <InvoiceStatusBadge status={isOverdue ? 'Overdue' : invoice.status} />
            </div>
            <p className="text-sm text-gray-400 mt-0.5">{invoice.clientName} · Order {invoice.orderNumber}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {invoice.status === 'Draft' && (
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
            >
              <Send size={14} />
              {sending ? 'Sending…' : 'Send Invoice'}
            </button>
          )}
          {invoice.pdfUrl && (
            <a
              href={invoice.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white rounded-lg text-sm"
            >
              <Download size={14} /> Download PDF
            </a>
          )}
          {invoice.paystackPaymentRequestId && (
            <a
              href={`https://paystack.com/pay/${invoice.paystackPaymentRequestId}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-green-900/30 border border-green-800 hover:bg-green-900/50 text-green-300 rounded-lg text-sm"
            >
              <ExternalLink size={14} /> Pay Link
            </a>
          )}
        </div>
      </div>

      {sendError && <div className="px-4 py-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">{sendError}</div>}

      {/* Info cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Invoice Date', value: new Date(invoice.invoiceDate).toLocaleDateString() },
          { label: 'Due Date', value: new Date(invoice.dueDate).toLocaleDateString() },
          { label: 'Sent At', value: invoice.sentAt ? new Date(invoice.sentAt).toLocaleDateString() : '—' },
          { label: 'Paid At', value: invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString() : '—' },
        ].map((c) => (
          <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{c.label}</p>
            <p className="text-sm font-medium text-white">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Line items */}
      {items.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="font-semibold text-white">Line Items</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['Product', 'Qty', 'Unit Price', 'Line Total'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-800/40">
                  <td className="px-4 py-3 text-white">{item.productName}</td>
                  <td className="px-4 py-3 text-gray-300">{item.quantity.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-300">{fmt(item.unitPriceZAR)}</td>
                  <td className="px-4 py-3 font-medium text-white">{fmt(item.lineTotal ?? item.totalPriceZAR ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-4 border-t border-gray-800 space-y-1.5 text-sm max-w-xs ml-auto">
            <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>{fmt(invoice.subtotalZAR)}</span></div>
            <div className="flex justify-between text-gray-400"><span>VAT (15%)</span><span>{fmt(invoice.vatZAR)}</span></div>
            <div className="flex justify-between text-white font-bold text-base pt-1.5 border-t border-gray-700"><span>Total</span><span>{fmt(invoice.totalZAR)}</span></div>
          </div>
        </div>
      )}
    </div>
  )
}
