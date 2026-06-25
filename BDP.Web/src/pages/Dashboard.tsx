import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboard, clients as clientsApi, invoices as invoicesApi, recurringOrders as recurringApi, email as emailApi } from '../services/api'
import type { DashboardSummary, Invoice, RecurringOrder } from '../types'
import { Package, ShoppingCart, Users, TrendingUp, BarChart2, Building2, FileText, RefreshCw, AlertTriangle } from 'lucide-react'

const STATUS_COLOURS: Record<string, string> = {
  Pending:          'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Confirmed:        'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'In Production':  'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Shipped:          'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  Delivered:        'bg-green-500/20 text-green-400 border-green-500/30',
  Cancelled:        'bg-red-500/20 text-red-400 border-red-500/30',
}

function StatCard({ icon: Icon, label, value, sub, colour }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; colour: string
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">{label}</span>
        <div className={`p-2 rounded-lg ${colour}`}><Icon size={16} /></div>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [overdueCount, setOverdueCount] = useState(0)
  const [activeClientCount, setActiveClientCount] = useState(0)
  const [recurringDueSoon, setRecurringDueSoon] = useState<RecurringOrder[]>([])
  const [smtpConfigured, setSmtpConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    dashboard.getSummary().then(setSummary).finally(() => setLoading(false))

    // Surface a warning if outgoing email is silently disabled in production
    emailApi.status().then((s) => setSmtpConfigured(s.configured)).catch(() => setSmtpConfigured(null))

    // B2B supplementary stats
    clientsApi.getAll({ pageSize: 1 }).then((r) => setActiveClientCount(r.total ?? 0)).catch(() => {})
    invoicesApi.getAll().then((invs: Invoice[]) => {
      const now = new Date()
      setOverdueCount(invs.filter((i) => i.status === 'Sent' && new Date(i.dueDate) < now).length)
    }).catch(() => {})
    recurringApi.getAll().then((list: RecurringOrder[]) => {
      const soon = new Date(); soon.setDate(soon.getDate() + 7)
      setRecurringDueSoon(list.filter((r) => r.status === 'Active' && new Date(r.nextOrderDate) <= soon))
    }).catch(() => {})
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
    </div>
  )

  if (!summary) return <p className="text-gray-400">Failed to load dashboard.</p>

  const formatZAR = (n: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Overview of BDP operations</p>
      </div>

      {/* Email-not-configured warning — emails silently no-op until SMTP is set */}
      {smtpConfigured === false && (
        <Link
          to="/email-test"
          className="flex items-center gap-2 px-4 py-3 rounded-lg text-sm border bg-amber-900/20 border-amber-800 text-amber-300 hover:bg-amber-900/30 transition-colors"
        >
          <AlertTriangle size={16} className="shrink-0" />
          <span>
            <strong>Outgoing email is disabled.</strong> SMTP is not configured, so order confirmations, invoices and
            other notifications are <strong>not being sent</strong>. Set the <span className="font-mono">Email__*</span> env
            vars in Railway → click here to verify.
          </span>
        </Link>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard icon={Package}       label="Active Products"  value={summary.totalProducts}       colour="bg-indigo-500/20 text-indigo-400" />
        <StatCard icon={ShoppingCart}  label="Active Orders"    value={summary.totalActiveOrders}   colour="bg-blue-500/20 text-blue-400" />
        <StatCard icon={Users}         label="Customers"        value={summary.totalCustomers}      colour="bg-green-500/20 text-green-400" />
        <StatCard icon={TrendingUp}    label="Revenue (Month)"  value={formatZAR(summary.revenueThisMonth)} colour="bg-emerald-500/20 text-emerald-400" />
        <StatCard icon={BarChart2}     label="Orders (Month)"   value={summary.ordersThisMonth}     colour="bg-purple-500/20 text-purple-400" />
      </div>

      {/* B2B quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <Link to="/clients" className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 transition-colors group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">Active Clients</span>
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400"><Building2 size={16} /></div>
          </div>
          <p className="text-2xl font-bold text-white group-hover:text-cyan-300 transition-colors">{activeClientCount}</p>
        </Link>
        <Link to="/invoices?status=Overdue" className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 transition-colors group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">Overdue Invoices</span>
            <div className="p-2 rounded-lg bg-red-500/20 text-red-400"><FileText size={16} /></div>
          </div>
          <p className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-400' : 'text-white'}`}>{overdueCount}</p>
        </Link>
        <Link to="/recurring-orders" className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-5 transition-colors group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">Recurring Due (7d)</span>
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400"><RefreshCw size={16} /></div>
          </div>
          <p className={`text-2xl font-bold ${recurringDueSoon.length > 0 ? 'text-amber-400' : 'text-white'}`}>{recurringDueSoon.length}</p>
        </Link>
      </div>

      {recurringDueSoon.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-500/20 flex items-center gap-2">
            <RefreshCw size={14} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-amber-300">Recurring Orders Due This Week</h2>
          </div>
          <div className="divide-y divide-amber-500/10">
            {recurringDueSoon.map((r) => (
              <Link key={r.id} to={`/recurring-orders/${r.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-amber-500/5 transition-colors">
                <div>
                  <p className="text-sm text-white font-medium">{r.name}</p>
                  <p className="text-xs text-gray-400">{r.clientName}</p>
                </div>
                <p className="text-xs text-amber-300 font-medium">{new Date(r.nextOrderDate).toLocaleDateString()}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Orders by status */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-white mb-4">Orders by Status</h2>
          {summary.ordersByStatus.length === 0 ? (
            <p className="text-gray-500 text-sm">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {summary.ordersByStatus.map((s) => {
                const maxCount = Math.max(...summary.ordersByStatus.map((x) => x.count), 1)
                return (
                  <div key={s.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium ${STATUS_COLOURS[s.status] ?? 'bg-gray-700/40 text-gray-400 border-gray-700'}`}>
                        {s.status}
                      </span>
                      <span className="text-sm font-semibold text-white">{s.count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500/60 rounded-full transition-all"
                        style={{ width: `${(s.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent orders table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden lg:col-span-3">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Recent Orders</h2>
            <Link to="/orders" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">View all</Link>
          </div>
          {summary.recentOrders.length === 0 ? (
            <p className="px-5 py-6 text-gray-500 text-sm">No orders yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Order</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {summary.recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <Link to={`/orders/${o.id}`} className="text-indigo-400 hover:text-indigo-300 font-medium text-xs transition-colors">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-gray-300 text-xs truncate max-w-[120px]">{o.customerName}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${STATUS_COLOURS[o.status] ?? 'bg-gray-700/40 text-gray-400 border-gray-700'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(o.orderDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-300 text-xs font-mono whitespace-nowrap">
                      {formatZAR(o.totalAmountZAR ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
