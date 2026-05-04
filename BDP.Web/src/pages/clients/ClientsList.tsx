import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Eye, Edit, Users } from 'lucide-react'
import type { ClientSummary } from '../../types'
import { clients as clientsApi } from '../../services/api'

const fmt = (n: number) => `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`

export default function ClientsList() {
  const navigate = useNavigate()
  const [data, setData] = useState<ClientSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [loading, setLoading] = useState(true)

  const PAGE_SIZE = 20

  const fetch = (p = 1, q = search) => {
    setLoading(true)
    clientsApi
      .getAll({ search: q || undefined, page: p, pageSize: PAGE_SIZE })
      .then((r) => { setData(r.data); setTotal(r.total) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetch(page, search) }, [page, search])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSearch(searchInput)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clients</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total} B2B clients</p>
        </div>
        <button
          onClick={() => navigate('/clients/new')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Client
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search company or email…"
            className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white hover:bg-gray-700 transition-colors"
        >
          Search
        </button>
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(''); setSearchInput(''); setPage(1) }}
            className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Clear
          </button>
        )}
      </form>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spend</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">Loading…</td></tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Users size={32} className="mx-auto text-gray-700 mb-2" />
                    <p className="text-gray-500">No clients found</p>
                  </td>
                </tr>
              ) : (
                data.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{c.companyName}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{c.contactPersonName}</td>
                    <td className="px-4 py-3 text-gray-400">{c.contactEmail}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{c.totalOrders}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{fmt(c.totalSpendZAR)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${c.isActive ? 'bg-green-900/50 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/clients/${c.id}`)}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => navigate(`/clients/${c.id}/edit`)}
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between text-sm text-gray-400">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
