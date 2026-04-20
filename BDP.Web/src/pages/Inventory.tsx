import { useEffect, useMemo, useState } from 'react'
import { inventory as inventoryApi } from '../services/api'
import type { InventoryItem, InventorySummary } from '../types'
import { Boxes, Save, X, Pencil } from 'lucide-react'

const LOCATIONS = ['Cape Town', 'China', 'ZQ Warehouse'] as const
type Location = typeof LOCATIONS[number]

const LOC_COLOUR: Record<string, string> = {
  'Cape Town':    'bg-green-500/20 text-green-400 border-green-500/30',
  'China':        'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'ZQ Warehouse': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

interface ProductRow {
  productId: number
  productName: string
  sku: string
  quantity: number
  updatedAt: string
  items: Partial<Record<Location, InventoryItem>>
}

interface RowEdit {
  onHandStock: string
  incomingStock: string
  committedStock: string
  availableStock: string
  isStocked: boolean
}

function makeEdit(item: InventoryItem | undefined): RowEdit {
  return {
    onHandStock: String(item?.onHandStock ?? 0),
    incomingStock: String(item?.incomingStock ?? 0),
    committedStock: String(item?.committedStock ?? 0),
    availableStock: String(item?.availableStock ?? 0),
    isStocked: item?.isStocked ?? false,
  }
}

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [summary, setSummary] = useState<InventorySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [stockedFilter, setStockedFilter] = useState<'' | 'yes' | 'no'>('')
  const [editingProductId, setEditingProductId] = useState<number | null>(null)
  const [rowEdits, setRowEdits] = useState<Partial<Record<Location, RowEdit>>>({})
  const [saving, setSaving] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkEdits, setBulkEdits] = useState<Record<number, RowEdit>>({})  // keyed by item.id

  const load = () => {
    setLoading(true)
    Promise.all([
      inventoryApi.getAll(),
      inventoryApi.getSummary(),
    ]).then(([inv, sum]) => { setItems(inv); setSummary(sum) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const rows = useMemo<ProductRow[]>(() => {
    const map = new Map<number, ProductRow>()
    for (const item of items) {
      if (!map.has(item.productId)) {
        map.set(item.productId, { productId: item.productId, productName: item.productName, sku: item.sku, quantity: item.quantity, updatedAt: item.updatedAt, items: {} })
      }
      const row = map.get(item.productId)!
      row.items[item.location as Location] = item
      if (item.updatedAt > row.updatedAt) row.updatedAt = item.updatedAt
    }
    return Array.from(map.values()).sort((a, b) => a.productName.localeCompare(b.productName))
  }, [items])

  const filtered = useMemo(() => rows.filter((r) => {
    if (search && !r.productName.toLowerCase().includes(search.toLowerCase()) && !r.sku.toLowerCase().includes(search.toLowerCase())) return false
    if (stockedFilter === 'yes' && !r.items['Cape Town']?.isStocked) return false
    if (stockedFilter === 'no' && r.items['Cape Town']?.isStocked) return false
    return true
  }), [rows, search, stockedFilter])

  const startEdit = (row: ProductRow) => {
    setEditingProductId(row.productId)
    const edits: Partial<Record<Location, RowEdit>> = {}
    for (const loc of LOCATIONS) edits[loc] = makeEdit(row.items[loc])
    setRowEdits(edits)
  }

  const cancelEdit = () => { setEditingProductId(null); setRowEdits({}) }

  const saveRow = async (row: ProductRow) => {
    setSaving(true)
    try {
      const updates: Promise<unknown>[] = []
      for (const loc of LOCATIONS) {
        const item = row.items[loc]
        const edit = rowEdits[loc]
        if (!item || !edit) continue
        updates.push(inventoryApi.update(item.id, {
          onHandStock: parseInt(edit.onHandStock) || 0,
          incomingStock: parseInt(edit.incomingStock) || 0,
          committedStock: parseInt(edit.committedStock) || 0,
          availableStock: parseInt(edit.availableStock) || 0,
          isStocked: edit.isStocked,
        }))
      }
      await Promise.all(updates)
      await load()
      setEditingProductId(null)
    } finally { setSaving(false) }
  }

  const startBulk = () => {
    const edits: Record<number, RowEdit> = {}
    for (const item of items) edits[item.id] = makeEdit(item)
    setBulkEdits(edits)
    setBulkMode(true)
  }

  const saveBulk = async () => {
    setSaving(true)
    try {
      const payload = Object.entries(bulkEdits).map(([id, e]) => ({
        id: parseInt(id),
        onHandStock: parseInt(e.onHandStock) || 0,
        incomingStock: parseInt(e.incomingStock) || 0,
        committedStock: parseInt(e.committedStock) || 0,
        availableStock: parseInt(e.availableStock) || 0,
        isStocked: e.isStocked,
      }))
      await inventoryApi.bulkUpdate(payload)
      await load()
      setBulkMode(false)
      setBulkEdits({})
    } finally { setSaving(false) }
  }

  const updateBulkEdit = (id: number, field: keyof RowEdit, value: string | boolean) =>
    setBulkEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }))

  const updateRowEdit = (loc: Location, field: keyof RowEdit, value: string | boolean) =>
    setRowEdits((prev) => ({ ...prev, [loc]: { ...prev[loc]!, [field]: value } }))

  const numInput = (value: string, onChange: (v: string) => void) => (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-16 px-1.5 py-1 bg-gray-800 border border-indigo-500/50 rounded text-xs text-white text-right focus:outline-none focus:border-indigo-400"
      onClick={(e) => e.stopPropagation()}
    />
  )

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Inventory</h1>
          <p className="text-sm text-gray-400 mt-0.5">{filtered.length} products</p>
        </div>
        {bulkMode ? (
          <div className="flex gap-2">
            <button onClick={() => { setBulkMode(false); setBulkEdits({}) }} className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 transition-colors">
              <X size={14} /> Cancel
            </button>
            <button onClick={saveBulk} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              <Save size={14} /> {saving ? 'Saving…' : 'Save All'}
            </button>
          </div>
        ) : (
          <button onClick={startBulk} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors">
            <Pencil size={14} /> Bulk Update
          </button>
        )}
      </div>

      {/* Summary cards */}
      {summary.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summary.map((s) => (
            <div key={s.location} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <span className={`inline-block text-xs px-2 py-1 rounded border font-medium mb-3 ${LOC_COLOUR[s.location] ?? 'bg-gray-700 text-gray-400 border-gray-700'}`}>
                {s.location}
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><p className="text-gray-500">On Hand</p><p className="font-bold text-white text-lg">{s.totalOnHand}</p></div>
                <div><p className="text-gray-500">Available</p><p className="font-bold text-white text-lg">{s.totalAvailable}</p></div>
                <div><p className="text-gray-500">Incoming</p><p className="font-semibold text-gray-300">{s.totalIncoming}</p></div>
                <div><p className="text-gray-500">Products</p><p className="font-semibold text-gray-300">{s.itemCount}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search product name or SKU…"
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-64"
        />
        <select
          value={stockedFilter}
          onChange={(e) => setStockedFilter(e.target.value as typeof stockedFilter)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="">All Stock Status</option>
          <option value="yes">Stocked (CPT)</option>
          <option value="no">Unstocked (CPT)</option>
        </select>
        {(search || stockedFilter) && (
          <button onClick={() => { setSearch(''); setStockedFilter('') }} className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors">Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">SKU</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Order Qty</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-green-400/70 uppercase tracking-wider">Cape Town</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-blue-400/70 uppercase tracking-wider">China</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-purple-400/70 uppercase tracking-wider">ZQ Warehouse</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Stocked</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Updated</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-500">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-500">
                  <Boxes size={32} className="mx-auto mb-2 opacity-30" />
                  No inventory items found.
                </td></tr>
              ) : filtered.map((row) => {
                const cpt = row.items['Cape Town']
                const china = row.items['China']
                const zq = row.items['ZQ Warehouse']
                const zeroCPT = (cpt?.onHandStock ?? 0) === 0
                const isEditing = editingProductId === row.productId

                if (isEditing) {
                  const ce = rowEdits['Cape Town']!
                  const che = rowEdits['China']!
                  const zqe = rowEdits['ZQ Warehouse']!
                  return (
                    <tr key={row.productId} className="bg-indigo-950/30">
                      <td className="px-4 py-2.5 font-medium text-white">{row.productName}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{row.sku}</td>
                      <td className="px-4 py-2.5 text-center text-gray-400">{row.quantity}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col items-center gap-1">
                          {numInput(ce.onHandStock, (v) => updateRowEdit('Cape Town', 'onHandStock', v))}
                          <span className="text-xs text-gray-600">on hand</span>
                          {numInput(ce.incomingStock, (v) => updateRowEdit('Cape Town', 'incomingStock', v))}
                          <span className="text-xs text-gray-600">incoming</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col items-center gap-1">
                          {numInput(che.onHandStock, (v) => updateRowEdit('China', 'onHandStock', v))}
                          <span className="text-xs text-gray-600">on hand</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col items-center gap-1">
                          {numInput(zqe.onHandStock, (v) => updateRowEdit('ZQ Warehouse', 'onHandStock', v))}
                          <span className="text-xs text-gray-600">on hand</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <input type="checkbox" checked={ce.isStocked} onChange={(e) => updateRowEdit('Cape Town', 'isStocked', e.target.checked)} className="accent-indigo-500" />
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{new Date(row.updatedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1.5">
                          <button onClick={() => saveRow(row)} disabled={saving} className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded transition-colors disabled:opacity-50">
                            <Save size={11} />{saving ? '…' : 'Save'}
                          </button>
                          <button onClick={cancelEdit} className="flex items-center gap-1 px-2.5 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors">
                            <X size={11} />Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                }

                if (bulkMode) {
                  const ce = cpt ? bulkEdits[cpt.id] : undefined
                  const che = china ? bulkEdits[china.id] : undefined
                  const zqe = zq ? bulkEdits[zq.id] : undefined
                  return (
                    <tr key={row.productId} className={zeroCPT ? 'bg-amber-900/10' : ''}>
                      <td className="px-4 py-2.5 font-medium text-white">{row.productName}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{row.sku}</td>
                      <td className="px-4 py-2.5 text-center text-gray-400">{row.quantity}</td>
                      <td className="px-4 py-2.5 text-center">{cpt && ce ? numInput(ce.onHandStock, (v) => updateBulkEdit(cpt.id, 'onHandStock', v)) : <span className="text-gray-600">—</span>}</td>
                      <td className="px-4 py-2.5 text-center">{china && che ? numInput(che.onHandStock, (v) => updateBulkEdit(china.id, 'onHandStock', v)) : <span className="text-gray-600">—</span>}</td>
                      <td className="px-4 py-2.5 text-center">{zq && zqe ? numInput(zqe.onHandStock, (v) => updateBulkEdit(zq.id, 'onHandStock', v)) : <span className="text-gray-600">—</span>}</td>
                      <td className="px-4 py-2.5 text-center">{cpt && ce ? <input type="checkbox" checked={ce.isStocked} onChange={(e) => updateBulkEdit(cpt.id, 'isStocked', e.target.checked)} className="accent-indigo-500" /> : '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs">{new Date(row.updatedAt).toLocaleDateString()}</td>
                      <td className="px-4 py-2.5"></td>
                    </tr>
                  )
                }

                return (
                  <tr key={row.productId} className={`transition-colors hover:bg-gray-800/50 ${zeroCPT ? 'bg-amber-900/10' : ''}`}>
                    <td className="px-4 py-3 font-medium text-white">
                      {zeroCPT && <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mr-2 mb-0.5" />}
                      {row.productName}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">{row.sku}</td>
                    <td className="px-4 py-3 text-center text-gray-400">{row.quantity}</td>
                    <td className={`px-4 py-3 text-center font-semibold ${zeroCPT ? 'text-amber-400' : 'text-white'}`}>{cpt?.onHandStock ?? '—'}</td>
                    <td className="px-4 py-3 text-center text-gray-300">{china?.onHandStock ?? '—'}</td>
                    <td className="px-4 py-3 text-center text-gray-300">{zq?.onHandStock ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium ${cpt?.isStocked ? 'text-green-400' : 'text-gray-500'}`}>
                        {cpt?.isStocked ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(row.updatedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => startEdit(row)} className="flex items-center gap-1 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs rounded transition-colors">
                        <Pencil size={11} />Edit
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
