import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Eye } from 'lucide-react'
import type { RecurringOrder } from '../../types'
import { recurringOrders as recurringApi } from '../../services/api'

const STATUS_COLOURS: Record<string, string> = {
  Active:    'bg-green-900/50 text-green-300',
  Paused:    'bg-amber-900/30 text-amber-400',
  Cancelled: 'bg-gray-700 text-gray-400',
}

export default function RecurringOrdersList() {
  const navigate = useNavigate()
  const [data, setData] = useState<RecurringOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All')

  const load = () => {
    setLoading(true)
    recurringApi
      .getAll(statusFilter !== 'All' ? { status: statusFilter } : undefined)
      .then(setData)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [statusFilter])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Recurring Orders</h1>
          <p className="text-sm text-gray-400 mt-0.5">{data.length} active contracts</p>
        </div>
        <button
          onClick={() => navigate('/recurring-orders/new')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium"
        >
          <Plus size={16} /> Create Recurring Order
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-1.5">
        {['All', 'Active', 'Paused', 'Cancelled'].map((s) => (
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
              {['Name', 'Client', 'Frequency', 'Next Order Date', 'Contract End', 'Status', 'Actions'].map((h) => (
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
                  <RefreshCw size={32} className="mx-auto text-gray-700 mb-2" />
                  <p className="text-gray-500">No recurring orders found</p>
                </td>
              </tr>
            ) : data.map((r) => (
              <tr key={r.id} className="hover:bg-gray-800/50">
                <td className="px-4 py-3 font-medium text-white">{r.name}</td>
                <td className="px-4 py-3 text-gray-300">{r.clientName}</td>
                <td className="px-4 py-3 text-gray-400">{r.frequency}{r.frequency === 'Custom' ? ` (${r.frequencyDays}d)` : ''}</td>
                <td className="px-4 py-3 text-gray-300">{new Date(r.nextOrderDate).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-gray-400">{new Date(r.contractEndDate).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLOURS[r.status] ?? 'bg-gray-700 text-gray-300'}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => navigate(`/recurring-orders/${r.id}`)}
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
    </div>
  )
}
