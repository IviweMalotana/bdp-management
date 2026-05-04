import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Download } from 'lucide-react'
import type { Invoice } from '../../types'
import { invoices as invoicesApi } from '../../services/api'
import InvoiceStatusBadge from '../../components/InvoiceStatusBadge'

const fmt = (n: number) => `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`

export default function InvoicesList() {
  const navigate = useNavigate()
  const [data, setData] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All')

  const isOverdue = (inv: Invoice) =>
    inv.status === 'Sent' && new Date(inv.dueDate) < new Date()

  const load = () => {
    setLoading(true)
    invoicesApi
      .getAll(statusFilter !== 'All' ? { status: statusFilter } : undefined)
      .then((r) => {
        // Mark overdue in display (status comes from server, but we can highlight)
        setData(r)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [statusFilter])

  const displayed = statusFilter === 'Overdue'
    ? data.filter(isOverdue)
    : data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Invoices</h1>
          <p className="text-sm text-gray-400 mt-0.5">{displayed.length} invoices</p>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-1.5">
        {['All', 'Draft', 'Sent', 'Paid', 'Overdue'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {['Invoice #', 'Client', 'Order', 'Invoice Date', 'Due Date', 'Total', 'Status', 'PDF'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">Loading…</td></tr>
            ) : displayed.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <FileText size={32} className="mx-auto text-gray-700 mb-2" />
                  <p className="text-gray-500">No invoices found</p>
                </td>
              </tr>
            ) : displayed.map((inv) => {
              const overdue = isOverdue(inv)
              return (
                <tr
                  key={inv.id}
                  className={`hover:bg-gray-800/50 cursor-pointer transition-colors ${overdue ? 'border-l-2 border-l-red-600' : ''}`}
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-indigo-300">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3 text-white">{inv.clientName}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{inv.orderNumber}</td>
                  <td className="px-4 py-3 text-gray-400">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                  <td className={`px-4 py-3 ${overdue ? 'text-red-400 font-medium' : 'text-gray-400'}`}>
                    {new Date(inv.dueDate).toLocaleDateString()}
                    {overdue && <span className="ml-1.5 text-xs bg-red-900/40 text-red-400 px-1.5 py-0.5 rounded">Overdue</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-300 font-medium">{fmt(inv.totalZAR)}</td>
                  <td className="px-4 py-3">
                    <InvoiceStatusBadge status={overdue ? 'Overdue' : inv.status} />
                  </td>
                  <td className="px-4 py-3">
                    {inv.pdfUrl && (
                      <a
                        href={inv.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        <Download size={12} /> PDF
                      </a>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
