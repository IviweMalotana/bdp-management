import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { customers as customersApi } from '../services/api'
import type { Customer, PagedResult } from '../types'
import { Users, Search, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import CustomerForm from '../components/CustomerForm'

export default function Customers() {
  const navigate = useNavigate()
  const [data, setData] = useState<PagedResult<Customer> | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = (p = page, s = search) => {
    setLoading(true)
    customersApi.getAll({ page: p, pageSize: 20, search: s || undefined })
      .then(setData)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(page, search) }, [page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    load(1, search)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Customers</h1>
          <p className="text-sm text-gray-400 mt-0.5">{data?.totalCount ?? 0} customers</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} /> Add Customer
        </button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by company, name or email…"
            className="pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-72"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">Search</button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); setPage(1); load(1, '') }} className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors">Clear</button>
        )}
      </form>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['Company', 'Brand Name', 'Contact', 'Email', 'Country', 'Orders', 'Created', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500">Loading…</td></tr>
              ) : data?.items.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500">
                  <Users size={32} className="mx-auto mb-2 opacity-30" />
                  No customers found.
                </td></tr>
              ) : data?.items.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/customers/${c.id}`)}
                  className="hover:bg-gray-800/50 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{c.companyName}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{c.brandName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-300">{c.contactName}</td>
                  <td className="px-4 py-3 text-gray-400">{c.email}</td>
                  <td className="px-4 py-3 text-gray-400">{c.country}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold text-white">{c.totalOrders}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(c.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs text-indigo-400 hover:text-indigo-300">View →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <span className="text-xs text-gray-400">Page {data.page} of {data.totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= data.totalPages} className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <CustomerForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(1, '') }}
        />
      )}
    </div>
  )
}
