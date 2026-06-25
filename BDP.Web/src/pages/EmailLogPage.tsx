import { useEffect, useState } from 'react'
import { History, RefreshCw, CheckCircle, XCircle, MinusCircle, AlertTriangle } from 'lucide-react'
import { email as emailApi } from '../services/api'
import type { EmailLog } from '../types'

// Friendly labels for the category stored against each send
const CATEGORY_LABELS: Record<string, string> = {
  order_confirmation: 'Order confirmation',
  order_shipped: 'Order shipped',
  invoice_sent: 'Invoice',
  recurring_order_generated: 'Recurring order',
  b2b_approved: 'B2B approved',
  test: 'Test email',
}

function StatusBadge({ status }: { status: EmailLog['status'] }) {
  const map = {
    Sent:    { cls: 'bg-green-500/20 text-green-400 border-green-500/30', Icon: CheckCircle },
    Failed:  { cls: 'bg-red-500/20 text-red-400 border-red-500/30',       Icon: XCircle },
    Skipped: { cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30', Icon: MinusCircle },
  }[status] ?? { cls: 'bg-gray-500/20 text-gray-400 border-gray-500/30', Icon: MinusCircle }
  const { cls, Icon } = map
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${cls}`}>
      <Icon size={12} /> {status}
    </span>
  )
}

export default function EmailLogPage() {
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError(null)
    emailApi.logs(200)
      .then(setLogs)
      .catch((e: any) => setError(e?.response?.data?.message ?? e?.message ?? 'Failed to load email log.'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const skippedCount = logs.filter((l) => l.status === 'Skipped').length

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History size={20} className="text-indigo-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Email Log</h1>
            <p className="text-sm text-gray-400">Every email the system attempted to send — sent, failed, or skipped</p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-200 rounded-lg text-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {skippedCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm border bg-amber-900/20 border-amber-800 text-amber-300">
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            {skippedCount} recent email{skippedCount === 1 ? ' was' : 's were'} <strong>skipped</strong> because SMTP is not
            configured. Set the <span className="font-mono">Email__*</span> env vars in Railway, then check the Email Test page.
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm border bg-red-900/20 border-red-800 text-red-400">
          <XCircle size={16} /> {error}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-gray-400 text-sm p-6">No emails have been sent yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-800">
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Recipient</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-b border-gray-800/60 last:border-0 align-top">
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                    {l.category ? (CATEGORY_LABELS[l.category] ?? l.category) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    <div className="text-white">{l.toName || '—'}</div>
                    <div className="text-xs text-gray-500 font-mono">{l.toEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-300 max-w-xs truncate" title={l.subject}>{l.subject}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={l.status} />
                    {l.error && (
                      <div className="text-xs text-red-400/80 mt-1 max-w-xs truncate" title={l.error}>{l.error}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
