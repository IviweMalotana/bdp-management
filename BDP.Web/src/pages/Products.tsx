import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { products as productApi } from '../services/api'
import type { Product, PagedResult } from '../types'
import { Package, Search, ChevronLeft, ChevronRight, Plus, Pencil, Download, Loader2, ImageIcon } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import ProductForm from '../components/ProductForm'

const TEXTURES   = ['', 'Matte', 'Clear', 'Frosted']
const CATEGORIES = ['', 'Serum', 'Pump', 'Spray', 'Jar']

export default function Products() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'Admin'

  const [data, setData]           = useState<PagedResult<Product> | null>(null)
  const [search, setSearch]       = useState('')
  const [page, setPage]           = useState(1)
  const [category, setCategory]   = useState('')
  const [texture, setTexture]     = useState('')
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editProduct, setEditProduct] = useState<Product | null>(null)
  const [selected, setSelected]   = useState<Set<number>>(new Set())
  const [exporting, setExporting]     = useState(false)
  const [syncing, setSyncing]         = useState(false)
  const [syncResult, setSyncResult]   = useState<string | null>(null)

  const fetchProducts = (p = 1, q = '', cat = category, tex = texture) => {
    setLoading(true)
    const call = q.trim()
      ? productApi.search(q).then((items) => ({ items, totalCount: items.length, page: 1, pageSize: items.length, totalPages: 1 }))
      : productApi.getAll({ page: p, pageSize: 20, category: cat || undefined, texture: tex || undefined })
    call.then((d) => { setData(d); setSelected(new Set()) }).finally(() => setLoading(false))
  }

  useEffect(() => { fetchProducts(page, search, category, texture) }, [page, category, texture])

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchProducts(1, search) }
  const handleFilterChange = (cat: string, tex: string) => { setSearch(''); setPage(1); setCategory(cat); setTexture(tex) }

  const toggleSelect = (id: number) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const toggleSelectAll = () => {
    const ids = data?.items.map((p) => p.id) ?? []
    setSelected(selected.size === ids.length ? new Set() : new Set(ids))
  }

  const handleExport = async () => {
    if (selected.size === 0) return
    setExporting(true)
    try {
      await productApi.shopifyExport([...selected])
    } catch { /* file download errors are silent */ }
    finally { setExporting(false) }
  }

  const handleSyncImages = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const apiUrl = import.meta.env.VITE_API_URL ?? ''
      const token  = useAuthStore.getState().token
      const res    = await fetch(`${apiUrl}/api/admin/products/sync-images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setSyncResult(res.ok
        ? `✓ ${data.synced} images synced. ${data.notMatched} SKUs not found.`
        : `Error: ${data.message ?? 'Sync failed'}`)
      if (res.ok) fetchProducts(page, search)
    } catch {
      setSyncResult('Error: Could not reach API')
    } finally {
      setSyncing(false)
    }
  }

  const openAdd  = () => { setEditProduct(null); setShowForm(true) }
  const openEdit = (p: Product) => { setEditProduct(p); setShowForm(true) }
  const handleSaved = () => { setShowForm(false); fetchProducts(page, search) }

  const allSelected = (data?.items.length ?? 0) > 0 && selected.size === data?.items.length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Products</h1>
          <p className="text-sm text-gray-400 mt-0.5">{data?.totalCount ?? 0} products</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && selected.size > 0 && (
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Export to Shopify ({selected.size})
            </button>
          )}
          {isAdmin && (
            <button
              onClick={handleSyncImages}
              disabled={syncing}
              title="Pull product images from Google Sheet"
              className="flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {syncing ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
              Sync Images
            </button>
          )}
          {isAdmin && (
            <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">
              <Plus size={16} /> Add Product
            </button>
          )}
        </div>
      </div>

      {syncResult && (
        <div className={`px-4 py-2 rounded-lg text-sm ${syncResult.startsWith('✓') ? 'bg-teal-900 text-teal-200' : 'bg-red-900 text-red-200'}`}>
          {syncResult}
        </div>
      )}

      {/* Search + filters */}
      <div className="flex flex-wrap gap-2">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, SKU, category…"
              className="pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-64"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors">Search</button>
        </form>

        <select value={category} onChange={(e) => handleFilterChange(e.target.value, texture)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500">
          <option value="">All Categories</option>
          {CATEGORIES.filter(Boolean).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={texture} onChange={(e) => handleFilterChange(category, e.target.value)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500">
          <option value="">All Textures</option>
          {TEXTURES.filter(Boolean).map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        {(category || texture) && (
          <button onClick={() => handleFilterChange('', '')} className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors">Clear filters</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {isAdmin && (
                  <th className="px-4 py-3">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
                      className="rounded border-gray-600 bg-gray-800 accent-indigo-500" />
                  </th>
                )}
                {['', 'Product', 'Category', 'Variants', 'Size', 'Bottle / Lid', 'Texture', 'Supplier', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={isAdmin ? 11 : 10} className="text-center py-12 text-gray-500">Loading…</td></tr>
              ) : data?.items.length === 0 ? (
                <tr><td colSpan={isAdmin ? 11 : 10} className="text-center py-12 text-gray-500">
                  <Package size={32} className="mx-auto mb-2 opacity-30" />
                  No products found.
                </td></tr>
              ) : data?.items.map((p) => (
                <tr key={p.id} className={`hover:bg-gray-800/50 transition-colors ${selected.has(p.id) ? 'bg-indigo-950/20' : ''}`}>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)}
                        className="rounded border-gray-600 bg-gray-800 accent-indigo-500" />
                    </td>
                  )}
                  {/* Thumbnail */}
                  <td className="px-4 py-3">
                    {(p as any).primaryImageUrl ? (
                      <img src={(p as any).primaryImageUrl} alt={p.name} className="w-10 h-10 rounded object-cover bg-gray-800" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-gray-800 flex items-center justify-center">
                        <Package size={16} className="text-gray-600" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{p.name}</p>
                    <p className="text-xs text-gray-500 font-mono">{p.skuBase}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-800/50">{p.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    {(p as any).variantCount != null ? (
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300">{(p as any).variantCount} var.</span>
                    ) : (
                      <span className="text-xs text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{p.sizeML}ml</td>
                  <td className="px-4 py-3">
                    <p className="text-gray-300 text-xs">{p.bottleColour}</p>
                    <p className="text-gray-500 text-xs">{p.lidColour}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{p.texture}</td>
                  <td className="px-4 py-3 text-gray-300">{p.supplierName}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link to={`/products/${p.id}`}
                        className="text-xs px-2.5 py-1 rounded bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors">
                        View
                      </Link>
                      {isAdmin && (
                        <button onClick={() => openEdit(p)}
                          className="text-xs px-2.5 py-1 rounded bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors flex items-center gap-1">
                          <Pencil size={11} /> Edit
                        </button>
                      )}
                    </div>
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
              <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}
                className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30"><ChevronLeft size={16} /></button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= data.totalPages}
                className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <ProductForm product={editProduct} onClose={() => setShowForm(false)} onSaved={handleSaved} />
      )}
    </div>
  )
}
