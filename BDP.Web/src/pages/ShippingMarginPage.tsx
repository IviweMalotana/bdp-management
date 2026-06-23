import { useEffect, useState } from 'react'
import { shippingMarginApi } from '../services/api'
import type { ShippingMarginRow, ShippingMarginSummary } from '../types'

function fmt(n: number) {
  return `R${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function MarginBadge({ pct }: { pct: number }) {
  const colour =
    pct >= 30
      ? 'bg-green-900/50 text-green-300 border border-green-700'
      : pct >= 15
      ? 'bg-amber-900/50 text-amber-300 border border-amber-700'
      : 'bg-red-900/50 text-red-300 border border-red-700'
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colour}`}>
      {pct.toFixed(2)}%
    </span>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function ShippingMarginPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 50

  const [items, setItems] = useState<ShippingMarginRow[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [summary, setSummary] = useState<ShippingMarginSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string | number> = { page, pageSize }
      if (from) params.from = from
      if (to) params.to = to
      const data = await shippingMarginApi.get(params)
      setItems(data.items)
      setTotalCount(data.totalCount)
      setSummary(data.summary)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load shipping margin data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleFilter(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    load()
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Shipping Margin</h1>
        <p className="text-gray-400 text-sm mt-1">
          Real shipping profit across storefront orders with actual cost data.
        </p>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Charged" value={fmt(summary.totalShippingCharged)} sub={`${summary.ordersWithRealCost} orders`} />
          <StatCard label="Total Cost" value={fmt(summary.totalActualCost)} />
          <StatCard label="Total Margin" value={fmt(summary.totalShippingMargin)} />
          <StatCard label="Avg Margin %" value={`${summary.avgMarginPct.toFixed(2)}%`} />
        </div>
      )}

      {/* Filters */}
      <form onSubmit={handleFilter} className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-gray-400 mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Loading...' : 'Apply'}
        </button>
        {(from || to) && (
          <button
            type="button"
            onClick={() => { setFrom(''); setTo(''); setPage(1); setTimeout(load, 0) }}
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-600 transition-colors"
          >
            Clear
          </button>
        )}
      </form>

      {/* Error */}
      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      {!loading && items.length === 0 && !error ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 text-lg font-medium">No orders with real shipping cost data yet.</p>
          <p className="text-gray-600 text-sm mt-2">
            Orders appear here once ActualShippingCostZAR is recorded (set automatically when shipping rates are fetched from YunExpress).
          </p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Order', 'Date', 'Customer', 'Units', 'Charged', 'Cost', 'Margin', 'Margin %', 'Service'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {items.map(row => (
                  <tr key={row.orderId} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-indigo-400 whitespace-nowrap">{row.orderNumber}</td>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                      {new Date(row.orderDate).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-gray-300 max-w-[160px] truncate">{row.clientName}</td>
                    <td className="px-4 py-3 text-gray-300">{row.units}</td>
                    <td className="px-4 py-3 text-gray-200">{fmt(row.shippingCharged)}</td>
                    <td className="px-4 py-3 text-gray-200">{fmt(row.actualShippingCost)}</td>
                    <td className="px-4 py-3 text-gray-200">{fmt(row.shippingMargin)}</td>
                    <td className="px-4 py-3">
                      <MarginBadge pct={row.shippingMarginPct} />
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{row.shippingServiceName ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
              <p className="text-xs text-gray-500">
                {totalCount} orders total — page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
