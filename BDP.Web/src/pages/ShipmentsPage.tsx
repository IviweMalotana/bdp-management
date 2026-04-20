import { useEffect, useState } from 'react'
import { shipments as shipmentsApi, suppliers as suppliersApi, products as productsApi } from '../services/api'
import type { Shipment, Supplier, Product } from '../types'
import {
  Ship, Plus, X, Loader2, AlertCircle, Check,
  ChevronRight, Search, Package,
} from 'lucide-react'

type Status = 'Ordered' | 'InTransit' | 'InCustoms' | 'Delivered' | 'Cancelled'

const STATUS_STYLE: Record<Status, string> = {
  Ordered:    'bg-gray-700 text-gray-300',
  InTransit:  'bg-blue-500/20 text-blue-400',
  InCustoms:  'bg-orange-500/20 text-orange-400',
  Delivered:  'bg-green-500/20 text-green-400',
  Cancelled:  'bg-red-500/20 text-red-400',
}
const STATUS_LABEL: Record<Status, string> = {
  Ordered: 'Ordered', InTransit: 'In Transit', InCustoms: 'In Customs',
  Delivered: 'Delivered', Cancelled: 'Cancelled',
}
const ALL_STATUSES: Status[] = ['Ordered', 'InTransit', 'InCustoms', 'Delivered', 'Cancelled']

type ItemLine = { productId: number; quantity: string; costPerUnitZAR: string }

const EMPTY_ITEM: ItemLine = { productId: 0, quantity: '', costPerUnitZAR: '' }

export default function ShipmentsPage() {
  const [list, setList]         = useState<Shipment[]>([])
  const [loading, setLoading]   = useState(true)
  const [supplierList, setSupplierList] = useState<Supplier[]>([])
  const [productList, setProductList]   = useState<Product[]>([])

  // Detail panel
  const [detail, setDetail]     = useState<Shipment | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [panelOpen, setPanelOpen] = useState(false)

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [creating, setCreating]     = useState(false)
  const [cForm, setCForm] = useState({
    supplierId: '',
    orderDate: new Date().toISOString().substring(0, 10),
    estimatedArrival: '',
    originCountry: 'China',
    freightCostZAR: '',
    customsDutyZAR: '',
    notes: '',
  })
  const [items, setItems] = useState<ItemLine[]>([{ ...EMPTY_ITEM }])
  const [productSearch, setProductSearch] = useState<string[]>([''])

  // Status update
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const load = () => {
    setLoading(true)
    shipmentsApi.getAll().then(setList).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    suppliersApi.getAll().then(setSupplierList)
    productsApi.getAll({ pageSize: 200 }).then((r) => setProductList(r.items))
  }, [])

  const openDetail = async (id: number) => {
    setPanelOpen(true)
    setDetailLoading(true)
    try {
      const d = await shipmentsApi.getById(id)
      setDetail(d)
    } finally {
      setDetailLoading(false)
    }
  }

  const closePanel = () => {
    setPanelOpen(false)
    setTimeout(() => setDetail(null), 300)
  }

  const handleStatusUpdate = async (id: number, status: Status) => {
    setUpdatingStatus(true)
    try {
      const updated = await shipmentsApi.updateStatus(id, status)
      setDetail(updated)
      load()
    } finally {
      setUpdatingStatus(false)
    }
  }

  // ── Create shipment ────────────────────────────────────────────────────

  const openCreate = () => {
    setCForm({
      supplierId: supplierList[0]?.id.toString() ?? '',
      orderDate: new Date().toISOString().substring(0, 10),
      estimatedArrival: '',
      originCountry: 'China',
      freightCostZAR: '',
      customsDutyZAR: '',
      notes: '',
    })
    setItems([{ ...EMPTY_ITEM }])
    setProductSearch([''])
    setCreateError(null)
    setShowCreate(true)
  }

  const addItemLine = () => {
    setItems([...items, { ...EMPTY_ITEM }])
    setProductSearch([...productSearch, ''])
  }

  const removeItemLine = (i: number) => {
    setItems(items.filter((_, idx) => idx !== i))
    setProductSearch(productSearch.filter((_, idx) => idx !== i))
  }

  const filteredProducts = (search: string) => {
    if (!search) return productList.slice(0, 20)
    const q = search.toLowerCase()
    return productList.filter((p) => p.name.toLowerCase().includes(q) || p.skuBase.toLowerCase().includes(q)).slice(0, 20)
  }

  const itemsTotal = items.reduce((sum, it) => {
    return sum + (parseFloat(it.quantity) || 0) * (parseFloat(it.costPerUnitZAR) || 0)
  }, 0)
  const grandTotal = itemsTotal + (parseFloat(cForm.freightCostZAR) || 0) + (parseFloat(cForm.customsDutyZAR) || 0)

  const handleCreate = async () => {
    if (!cForm.supplierId) { setCreateError('Select a supplier.'); return }
    const validItems = items.filter((it) => it.productId && parseInt(it.quantity) > 0)
    if (validItems.length === 0) { setCreateError('Add at least one item.'); return }
    setCreating(true)
    setCreateError(null)
    try {
      await shipmentsApi.create({
        supplierId: parseInt(cForm.supplierId),
        orderDate: new Date(cForm.orderDate).toISOString(),
        estimatedArrival: cForm.estimatedArrival ? new Date(cForm.estimatedArrival).toISOString() : undefined,
        originCountry: cForm.originCountry,
        freightCostZAR: parseFloat(cForm.freightCostZAR) || 0,
        customsDutyZAR: parseFloat(cForm.customsDutyZAR) || 0,
        notes: cForm.notes || undefined,
        items: validItems.map((it) => ({
          productId: it.productId,
          quantity: parseInt(it.quantity),
          costPerUnitZAR: parseFloat(it.costPerUnitZAR),
        })),
      })
      setShowCreate(false)
      load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setCreateError(msg ?? 'Failed to create shipment.')
    } finally {
      setCreating(false)
    }
  }

  // ── Stats ────────────────────────────────────────────────────────────────
  const year = new Date().getFullYear()
  const stats = {
    total: list.length,
    inTransit: list.filter((s) => s.status === 'InTransit').length,
    inCustoms: list.filter((s) => s.status === 'InCustoms').length,
    deliveredThisYear: list.filter((s) => s.status === 'Delivered' && s.actualArrival?.startsWith(String(year))).length,
  }

  const inp = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
  const lbl = 'block text-xs text-gray-400 mb-1'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Ship size={20} className="text-indigo-400" />
            Shipments
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{list.length} shipment{list.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={15} />
          New Shipment
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Shipments', value: stats.total,             colour: 'text-white' },
          { label: 'In Transit',      value: stats.inTransit,         colour: 'text-blue-400' },
          { label: 'In Customs',      value: stats.inCustoms,         colour: 'text-orange-400' },
          { label: `Delivered ${year}`, value: stats.deliveredThisYear, colour: 'text-green-400' },
        ].map(({ label, value, colour }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${colour}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={24} className="animate-spin text-indigo-500" />
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500">
            <Ship size={28} className="mb-2 opacity-40" />
            <p className="text-sm">No shipments yet. Click "New Shipment" to create one.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['Reference', 'Supplier', 'Status', 'Order Date', 'Est. Arrival', 'Items', 'Total Cost', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {list.map((s) => (
                <tr key={s.id} onClick={() => openDetail(s.id)} className="hover:bg-gray-800/60 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-mono text-sm text-indigo-300">{s.reference}</td>
                  <td className="px-4 py-3 text-gray-300">{s.supplierName}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLE[s.status]}`}>
                      {STATUS_LABEL[s.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{new Date(s.orderDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {s.estimatedArrival ? new Date(s.estimatedArrival).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{s.itemCount}</td>
                  <td className="px-4 py-3 text-emerald-400 font-medium">R{s.totalCostZAR.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-3">
                    <ChevronRight size={14} className="text-gray-600" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Detail panel ── */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${panelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={closePanel}
      />
      <div className={`fixed inset-y-0 right-0 z-50 w-[540px] bg-gray-900 border-l border-gray-800 flex flex-col transform transition-transform duration-300 ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
          <h2 className="text-base font-semibold text-white">
            {detail ? detail.reference : 'Shipment Detail'}
          </h2>
          <button onClick={closePanel} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {detailLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
            </div>
          ) : detail ? (
            <>
              {/* Status badge + update */}
              <div className="flex items-center gap-3">
                <span className={`text-sm px-3 py-1.5 rounded-full font-medium ${STATUS_STYLE[detail.status]}`}>
                  {STATUS_LABEL[detail.status]}
                </span>
                {detail.status !== 'Delivered' && detail.status !== 'Cancelled' && (
                  <select
                    disabled={updatingStatus}
                    onChange={(e) => handleStatusUpdate(detail.id, e.target.value as Status)}
                    defaultValue=""
                    className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="" disabled>Update status…</option>
                    {ALL_STATUSES.filter((s) => s !== detail.status).map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                )}
                {updatingStatus && <Loader2 size={14} className="animate-spin text-indigo-400" />}
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Supplier',         detail.supplierName],
                  ['Origin Country',   detail.originCountry],
                  ['Order Date',       new Date(detail.orderDate).toLocaleDateString()],
                  ['Est. Arrival',     detail.estimatedArrival ? new Date(detail.estimatedArrival).toLocaleDateString() : '—'],
                  ['Actual Arrival',   detail.actualArrival ? new Date(detail.actualArrival).toLocaleDateString() : '—'],
                  ['Created',          new Date(detail.createdAt).toLocaleDateString()],
                ].map(([label, val]) => (
                  <div key={label} className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                    <p className="text-sm text-white">{val}</p>
                  </div>
                ))}
              </div>

              {/* Cost breakdown */}
              <div className="bg-gray-800/50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Cost Breakdown</p>
                {[
                  ['Freight',           detail.freightCostZAR],
                  ['Customs Duty',      detail.customsDutyZAR],
                  ['Items Total',       (detail.items ?? []).reduce((s, i) => s + i.totalCostZAR, 0)],
                ].map(([label, val]) => (
                  <div key={String(label)} className="flex justify-between text-sm">
                    <span className="text-gray-400">{label}</span>
                    <span className="text-gray-300">R{(val as number).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ))}
                <div className="border-t border-gray-700 pt-2 flex justify-between text-sm font-semibold">
                  <span className="text-white">Total</span>
                  <span className="text-emerald-400">R{detail.totalCostZAR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Items ({(detail.items ?? []).length})</p>
                <div className="space-y-2">
                  {(detail.items ?? []).map((item) => (
                    <div key={item.id} className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3">
                      <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <Package size={14} className="text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{item.productName}</p>
                        <p className="text-xs text-gray-500 font-mono">{item.sku}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm text-gray-300">{item.quantity.toLocaleString()} × R{item.costPerUnitZAR.toFixed(2)}</p>
                        <p className="text-sm font-medium text-emerald-400">R{item.totalCostZAR.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {detail.notes && (
                <div className="bg-gray-800/30 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Notes</p>
                  <p className="text-sm text-gray-300">{detail.notes}</p>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* ── Create modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowCreate(false)} />
          <div className="relative bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
              <h2 className="text-base font-semibold text-white">New Shipment</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {createError && (
                <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-red-300 text-sm">
                  <AlertCircle size={15} />
                  {createError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={lbl}>Supplier *</label>
                  <select className={inp} value={cForm.supplierId} onChange={(e) => setCForm({ ...cForm, supplierId: e.target.value })}>
                    <option value="">Select supplier…</option>
                    {supplierList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Order Date *</label>
                  <input type="date" className={inp} value={cForm.orderDate} onChange={(e) => setCForm({ ...cForm, orderDate: e.target.value })} />
                </div>
                <div>
                  <label className={lbl}>Estimated Arrival</label>
                  <input type="date" className={inp} value={cForm.estimatedArrival} onChange={(e) => setCForm({ ...cForm, estimatedArrival: e.target.value })} />
                </div>
                <div>
                  <label className={lbl}>Origin Country</label>
                  <input className={inp} value={cForm.originCountry} onChange={(e) => setCForm({ ...cForm, originCountry: e.target.value })} />
                </div>
                <div>
                  <label className={lbl}>Freight Cost ZAR</label>
                  <input type="number" className={inp} value={cForm.freightCostZAR} onChange={(e) => setCForm({ ...cForm, freightCostZAR: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <label className={lbl}>Customs Duty ZAR</label>
                  <input type="number" className={inp} value={cForm.customsDutyZAR} onChange={(e) => setCForm({ ...cForm, customsDutyZAR: e.target.value })} placeholder="0" />
                </div>
                <div className="col-span-2">
                  <label className={lbl}>Notes</label>
                  <textarea rows={2} className={inp} value={cForm.notes} onChange={(e) => setCForm({ ...cForm, notes: e.target.value })} />
                </div>
              </div>

              {/* Items section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-white">Items</p>
                  <button onClick={addItemLine} className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300">
                    <Plus size={13} />
                    Add Item
                  </button>
                </div>
                <div className="space-y-3">
                  {items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <label className={lbl}>Product</label>
                        <div className="relative">
                          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                          <input
                            className={`${inp} pl-7`}
                            placeholder="Search product…"
                            value={productSearch[i]}
                            onChange={(e) => {
                              const s = [...productSearch]; s[i] = e.target.value
                              setProductSearch(s)
                              // clear productId when typing
                              const upd = [...items]; upd[i] = { ...upd[i], productId: 0 }; setItems(upd)
                            }}
                            list={`prod-list-${i}`}
                          />
                          <datalist id={`prod-list-${i}`}>
                            {filteredProducts(productSearch[i]).map((p) => (
                              <option key={p.id} value={p.name} onClick={() => {
                                const upd = [...items]; upd[i] = { ...upd[i], productId: p.id }; setItems(upd)
                              }} />
                            ))}
                          </datalist>
                        </div>
                        {/* Hidden — sync productId from search text */}
                        {productSearch[i] && (() => {
                          const match = productList.find((p) => p.name.toLowerCase() === productSearch[i].toLowerCase())
                          if (match && items[i].productId !== match.id) {
                            setTimeout(() => {
                              const upd = [...items]; upd[i] = { ...upd[i], productId: match.id }; setItems(upd)
                            }, 0)
                          }
                          return null
                        })()}
                      </div>
                      <div className="col-span-3">
                        <label className={lbl}>Quantity</label>
                        <input type="number" className={inp} value={item.quantity} onChange={(e) => {
                          const upd = [...items]; upd[i] = { ...upd[i], quantity: e.target.value }; setItems(upd)
                        }} placeholder="0" />
                      </div>
                      <div className="col-span-3">
                        <label className={lbl}>Cost/Unit ZAR</label>
                        <input type="number" className={inp} value={item.costPerUnitZAR} onChange={(e) => {
                          const upd = [...items]; upd[i] = { ...upd[i], costPerUnitZAR: e.target.value }; setItems(upd)
                        }} placeholder="0.00" />
                      </div>
                      <div className="col-span-1 flex justify-end pb-0.5">
                        {items.length > 1 && (
                          <button onClick={() => removeItemLine(i)} className="p-1.5 text-gray-600 hover:text-red-400 rounded transition-colors">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Running total */}
                <div className="mt-4 border-t border-gray-800 pt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Items subtotal</span>
                    <span>R{itemsTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Freight + Customs</span>
                    <span>R{((parseFloat(cForm.freightCostZAR) || 0) + (parseFloat(cForm.customsDutyZAR) || 0)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-white">
                    <span>Grand Total</span>
                    <span className="text-emerald-400">R{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800 flex-shrink-0">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Create Shipment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
