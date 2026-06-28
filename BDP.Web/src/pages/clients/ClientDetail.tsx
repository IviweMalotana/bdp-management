import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit, Plus, Download } from 'lucide-react'
import type { ClientDetail as IClientDetail, Invoice, RecurringOrder } from '../../types'
import { clients as clientsApi } from '../../services/api'
import InvoiceStatusBadge from '../../components/InvoiceStatusBadge'

const fmt = (n: number) => `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`

const ORDER_STATUS_COLOURS: Record<string, string> = {
  Draft:        'bg-gray-700 text-gray-300',
  Confirmed:    'bg-blue-900/50 text-blue-300',
  InProduction: 'bg-purple-900/50 text-purple-300',
  Shipped:      'bg-amber-900/50 text-amber-300',
  Delivered:    'bg-green-900/50 text-green-300',
  Cancelled:    'bg-red-900/50 text-red-400',
}

const TABS = ['Orders', 'Invoices', 'Recurring Orders'] as const
type Tab = typeof TABS[number]

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState<IClientDetail | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [recurring, setRecurring] = useState<RecurringOrder[]>([])
  const [tab, setTab] = useState<Tab>('Orders')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const clientId = Number(id)
    setLoading(true)
    Promise.all([
      clientsApi.getById(clientId),
      clientsApi.getInvoices(clientId),
      clientsApi.getRecurring(clientId),
    ])
      .then(([c, inv, rec]) => { setClient(c); setInvoices(inv); setRecurring(rec) })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="text-gray-500 py-12 text-center">Loading…</div>
  if (!client) return <div className="text-gray-500 py-12 text-center">Client not found</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/clients')} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{client.companyName}</h1>
              {client.tradingName && <span className="text-gray-400 text-lg">/ {client.tradingName}</span>}
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${client.isActive ? 'bg-green-900/50 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                {client.isActive ? 'Active' : 'Inactive'}
              </span>
              {client.industry && (
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-800">
                  {client.industry}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-0.5">{client.contactPersonName} · {client.contactEmail}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/b2b-orders/new?clientId=${client.id}`)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={15} />
            New Order
          </button>
          <button
            onClick={() => navigate(`/clients/${id}/edit`)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Edit size={15} />
            Edit
          </button>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Reg Number', value: client.companyRegistrationNumber ?? '—' },
          { label: 'VAT Number', value: client.vatNumber ?? '—' },
          { label: 'Industry', value: client.industry ?? '—' },
          { label: 'Contact Phone', value: client.contactPhone ?? '—' },
        ].map((card) => (
          <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className="text-sm font-medium text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Address cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[
          { label: 'Billing Address', value: client.billingAddress },
          { label: 'Shipping Address', value: client.shippingAddress },
        ].map((card) => (
          <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className="text-sm text-gray-300 whitespace-pre-line">{card.value ?? '—'}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t ? 'border-indigo-500 text-white' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Orders tab */}
      {tab === 'Orders' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['Order #', 'Date', 'Status', 'Total', 'Paid', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {client.recentOrders.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No orders yet</td></tr>
              ) : client.recentOrders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-mono text-indigo-300">{o.orderNumber}</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(o.orderDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${ORDER_STATUS_COLOURS[o.status] ?? 'bg-gray-700 text-gray-300'}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{fmt(o.totalZAR)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${o.isPaid ? 'bg-green-900/50 text-green-300' : 'bg-amber-900/30 text-amber-400'}`}>
                      {o.isPaid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/b2b-orders/${o.id}`)} className="text-xs text-indigo-400 hover:text-indigo-300">View →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoices tab */}
      {tab === 'Invoices' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['Invoice #', 'Date', 'Due Date', 'Total', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {invoices.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No invoices yet</td></tr>
              ) : invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-mono text-indigo-300">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(inv.dueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-300">{fmt(inv.totalZAR)}</td>
                  <td className="px-4 py-3"><InvoiceStatusBadge status={inv.status} /></td>
                  <td className="px-4 py-3">
                    {inv.pdfUrl && (
                      <a href={inv.pdfUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
                        <Download size={12} /> PDF
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recurring tab */}
      {tab === 'Recurring Orders' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['Name', 'Frequency', 'Next Order', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {recurring.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No recurring orders</td></tr>
              ) : recurring.map((r) => (
                <tr key={r.id} className="hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-medium text-white">{r.name}</td>
                  <td className="px-4 py-3 text-gray-400">{r.frequency}</td>
                  <td className="px-4 py-3 text-gray-300">{new Date(r.nextOrderDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${r.status === 'Active' ? 'bg-green-900/50 text-green-300' : r.status === 'Paused' ? 'bg-amber-900/30 text-amber-400' : 'bg-gray-700 text-gray-400'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/recurring-orders/${r.id}`)} className="text-xs text-indigo-400 hover:text-indigo-300">View →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
