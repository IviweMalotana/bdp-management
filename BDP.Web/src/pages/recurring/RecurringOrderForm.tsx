import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'
import type { Product, ProductVariant } from '../../types'
import { recurringOrders as recurringApi, clients as clientsApi, products as productsApi } from '../../services/api'

const FREQUENCY_OPTIONS = ['Monthly', 'Quarterly', 'Bi-Monthly', 'Custom']
const QUANTITY_TIERS = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000]

interface LineItem {
  productId: number
  productName: string
  variantId: number
  variantLabel: string
  customisationOptionId?: number
  quantity: number
}

const inp = 'w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500'

export default function RecurringOrderForm() {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Client
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<{ id: number; companyName: string }[]>([])
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null)
  const [selectedClientName, setSelectedClientName] = useState('')
  const [clientDropOpen, setClientDropOpen] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState('Monthly')
  const [frequencyDays, setFrequencyDays] = useState(30)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')

  // Items
  const [items, setItems] = useState<LineItem[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [addingItem, setAddingItem] = useState(false)
  const [newProduct, setNewProduct] = useState<Product | null>(null)
  const [newVariant, setNewVariant] = useState<ProductVariant | null>(null)
  const [newQty, setNewQty] = useState(10)

  useEffect(() => {
    productsApi.getAll({ pageSize: 200 }).then((r) => setAllProducts(r.items ?? []))
  }, [])

  useEffect(() => {
    if (!clientSearch.trim()) { setClientResults([]); return }
    clientsApi.getAll({ search: clientSearch, pageSize: 8 }).then((r) => setClientResults(r.data))
  }, [clientSearch])

  const addItem = () => {
    if (!newProduct || !newVariant) return
    setItems((prev) => [...prev, {
      productId: newProduct.id,
      productName: newProduct.name,
      variantId: newVariant.id,
      variantLabel: `${newVariant.size} ${newVariant.bottleColour}`.trim(),
      quantity: newQty,
    }])
    setAddingItem(false); setNewProduct(null); setNewVariant(null); setNewQty(10)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClientId || items.length === 0) { setError('Select a client and add at least one item.'); return }
    setSaving(true); setError('')
    try {
      const frequencyLabel = frequency === 'Custom' ? `Custom (${frequencyDays}d)` : frequency
      const days = frequency === 'Monthly' ? 30 : frequency === 'Quarterly' ? 90 : frequency === 'Bi-Monthly' ? 60 : frequencyDays
      const body = {
        clientId: selectedClientId,
        name,
        frequency: frequencyLabel,
        frequencyDays: days,
        contractStartDate: startDate,
        contractEndDate: endDate,
        nextOrderDate: startDate,
        notes: notes || null,
        items: items.map((i) => ({ productVariantId: i.variantId, customisationOptionId: i.customisationOptionId ?? null, quantity: i.quantity })),
      }
      const created = await recurringApi.create(body)
      navigate(`/recurring-orders/${created.id}`)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to create recurring order')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/recurring-orders')} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-bold text-white">New Recurring Order</h1>
      </div>

      {error && <div className="px-4 py-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">{error}</div>}

      <form onSubmit={onSubmit} className="space-y-5">
        {/* Client */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Client</h2>
          <div className="relative">
            <input
              value={clientSearch}
              onChange={(e) => { setClientSearch(e.target.value); setClientDropOpen(true) }}
              onFocus={() => setClientDropOpen(true)}
              placeholder="Search client…"
              className={inp}
            />
            {selectedClientName && !clientDropOpen && <p className="text-sm text-indigo-300 mt-1">Selected: {selectedClientName}</p>}
            {clientDropOpen && clientResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                {clientResults.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setSelectedClientId(c.id); setSelectedClientName(c.companyName); setClientSearch(c.companyName); setClientDropOpen(false) }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-700 text-sm text-white"
                  >
                    {c.companyName}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Contract details */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Contract Details</h2>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Contract Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className={inp} placeholder="e.g. Monthly Hospital Ward A Order" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Frequency</label>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className={inp}>
                {FREQUENCY_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            {frequency === 'Custom' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Every N days</label>
                <input type="number" value={frequencyDays} onChange={(e) => setFrequencyDays(Number(e.target.value))} min={1} className={inp} />
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Contract Start *</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className={inp} />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Contract End *</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required className={inp} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={`${inp} resize-none`} placeholder="Any special notes…" />
          </div>
        </div>

        {/* Items */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Items</h2>

          {items.length > 0 && (
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between px-3 py-2.5 bg-gray-800 rounded-lg">
                  <div>
                    <p className="text-sm text-white">{item.productName} — {item.variantLabel}</p>
                    <p className="text-xs text-gray-400">Qty: {item.quantity.toLocaleString()}</p>
                  </div>
                  <button type="button" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))} className="p-1 text-red-500 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {addingItem ? (
            <div className="space-y-3 border border-gray-700 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Product</label>
                  <select className={inp} value={newProduct?.id ?? ''} onChange={(e) => { setNewProduct(allProducts.find((x) => x.id === Number(e.target.value)) ?? null); setNewVariant(null) }}>
                    <option value="">Select…</option>
                    {allProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Variant</label>
                  <select className={inp} disabled={!newProduct} value={newVariant?.id ?? ''} onChange={(e) => setNewVariant(newProduct?.variants.find((v) => v.id === Number(e.target.value)) ?? null)}>
                    <option value="">Select…</option>
                    {newProduct?.variants.map((v) => <option key={v.id} value={v.id}>{v.size} — {v.bottleColour}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Quantity</label>
                <select className={inp} value={newQty} onChange={(e) => setNewQty(Number(e.target.value))}>
                  {QUANTITY_TIERS.map((q) => <option key={q} value={q}>{q.toLocaleString()}</option>)}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => { setAddingItem(false); setNewProduct(null); setNewVariant(null) }} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white">Cancel</button>
                <button type="button" disabled={!newProduct || !newVariant} onClick={addItem} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-sm">Add</button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingItem(true)}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-700 hover:border-indigo-500 text-gray-400 hover:text-indigo-400 rounded-xl text-sm w-full justify-center"
            >
              <Plus size={16} /> Add Item
            </button>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium">
            <Save size={15} />{saving ? 'Saving…' : 'Create Recurring Order'}
          </button>
        </div>
      </form>
    </div>
  )
}
