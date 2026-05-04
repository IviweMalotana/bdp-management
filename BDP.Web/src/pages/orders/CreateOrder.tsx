import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Plus, Trash2, Check } from 'lucide-react'
import type { Product, ProductVariant, VariantPricingTier, CustomisationOption, CustomisationPricingTier } from '../../types'
import { clients as clientsApi, products as productsApi, orders as ordersApi, shipping as shippingApi, customisation as customisationApi } from '../../services/api'

const fmt = (n: number) =>
  `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`

const QUANTITY_TIERS = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000]

interface OrderLineItem {
  productId: number
  productName: string
  variantId: number
  variantLabel: string
  weightKg: number
  lengthCm: number
  widthCm: number
  heightCm: number
  quantity: number
  pricingTierId: number
  unitPriceZAR: number
  customisationOptionId?: number
  customisationPricingTierId?: number
  customisationCostZAR: number
  shippingCostZAR: number
  lineTotal: number
}

export default function CreateOrder() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const preselectedClientId = params.get('clientId')

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notes, setNotes] = useState('')
  const [requiredByDate, setRequiredByDate] = useState('')

  // Step 1 — client
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState<{ id: number; companyName: string; paymentTermsDays: number; creditLimit: number }[]>([])
  const [selectedClient, setSelectedClient] = useState<typeof clientResults[0] | null>(null)
  const [clientDropOpen, setClientDropOpen] = useState(false)

  // Step 2 — items
  const [items, setItems] = useState<OrderLineItem[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [allCustomisations, setAllCustomisations] = useState<CustomisationOption[]>([])

  // Per-row add state
  const [addingItem, setAddingItem] = useState(false)
  const [newProduct, setNewProduct] = useState<Product | null>(null)
  const [newVariant, setNewVariant] = useState<ProductVariant | null>(null)
  const [newQty, setNewQty] = useState(10)
  const [newTier, setNewTier] = useState<VariantPricingTier | null>(null)
  const [newCustomisation, setNewCustomisation] = useState<{ opt: CustomisationOption; tier: CustomisationPricingTier } | null>(null)
  const [calcShipping, setCalcShipping] = useState(0)
  const [calcLoading, setCalcLoading] = useState(false)

  // Load preselected client
  useEffect(() => {
    if (!preselectedClientId) return
    clientsApi.getAll({ search: '' }).then((r) => {
      const found = r.data.find((c) => c.id === Number(preselectedClientId))
      if (found) {
        setSelectedClient({ id: found.id, companyName: found.companyName, paymentTermsDays: 30, creditLimit: 0 })
      }
    })
  }, [preselectedClientId])

  // Client search
  useEffect(() => {
    if (!clientSearch.trim()) { setClientResults([]); return }
    clientsApi.getAll({ search: clientSearch, pageSize: 8 }).then((r) =>
      setClientResults(r.data.map((c) => ({ id: c.id, companyName: c.companyName, paymentTermsDays: 30, creditLimit: 0 })))
    )
  }, [clientSearch])

  // Load products + customisations on step 2
  useEffect(() => {
    if (step !== 2) return
    productsApi.getAll({ pageSize: 200 }).then((r) => setAllProducts(r.items ?? []))
    customisationApi.getAll().then((r) => setAllCustomisations(r))
  }, [step])

  // Calculate shipping when variant/quantity changes
  useEffect(() => {
    if (!newVariant || !newProduct || !newQty) return
    setCalcLoading(true)
    const vol = (newProduct.lengthCm * newProduct.widthCm * newProduct.heightCm) / 1_000_000
    shippingApi
      .calculate({ weightKg: newProduct.weightKg, volumeCBM: vol, quantity: newQty })
      .then((r) => setCalcShipping(r.totalShippingZAR))
      .catch(() => setCalcShipping(0))
      .finally(() => setCalcLoading(false))
  }, [newVariant, newQty, newProduct])

  // Auto-select best pricing tier when qty changes
  useEffect(() => {
    if (!newVariant) return
    const best = newVariant.pricingTiers
      .filter((t) => t.quantity <= newQty)
      .sort((a, b) => b.quantity - a.quantity)[0] ?? null
    setNewTier(best)
  }, [newQty, newVariant])

  const eligibleCustomisations = newQty >= 100
    ? allCustomisations.filter((o) => o.minimumQuantity <= newQty)
    : []

  const addItem = () => {
    if (!newProduct || !newVariant || !newTier) return
    const custCost = newCustomisation
      ? newCustomisation.tier.pricePerUnitZAR * newQty
      : 0
    const lineTotal = newTier.salePriceZAR * newQty + custCost

    setItems((prev) => [
      ...prev,
      {
        productId: newProduct.id,
        productName: newProduct.name,
        variantId: newVariant.id,
        variantLabel: `${newVariant.size} ${newVariant.bottleColour}`.trim(),
        weightKg: newProduct.weightKg,
        lengthCm: newProduct.lengthCm,
        widthCm: newProduct.widthCm,
        heightCm: newProduct.heightCm,
        quantity: newQty,
        pricingTierId: newTier.id,
        unitPriceZAR: newTier.salePriceZAR,
        customisationOptionId: newCustomisation?.opt.id,
        customisationPricingTierId: newCustomisation?.tier.id,
        customisationCostZAR: custCost,
        shippingCostZAR: calcShipping,
        lineTotal,
      },
    ])
    setAddingItem(false)
    setNewProduct(null); setNewVariant(null); setNewQty(10); setNewTier(null); setNewCustomisation(null); setCalcShipping(0)
  }

  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0)
  const totalShipping = items.reduce((s, i) => s + i.shippingCostZAR, 0)
  const total = subtotal + totalShipping

  const submit = async () => {
    if (!selectedClient || items.length === 0) return
    setSaving(true); setError('')
    try {
      const body = {
        clientId: selectedClient.id,
        status: 'Draft',
        orderDate: new Date().toISOString(),
        requiredByDate: requiredByDate || null,
        notes: notes || null,
        items: items.map((i) => ({
          productVariantId: i.variantId,
          pricingTierId: i.pricingTierId,
          customisationOptionId: i.customisationOptionId ?? null,
          customisationPricingTierId: i.customisationPricingTierId ?? null,
          quantity: i.quantity,
          unitPriceZAR: i.unitPriceZAR,
          customisationCostZAR: i.customisationCostZAR,
          shippingCostZAR: i.shippingCostZAR,
        })),
      }
      const created = await ordersApi.create(body)
      navigate(`/orders/${created.id}`)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to create order')
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500'

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/orders')} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-bold text-white">Create Order</h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[
          { n: 1, label: 'Select Client' },
          { n: 2, label: 'Add Items' },
          { n: 3, label: 'Review & Confirm' },
        ].map(({ n, label }) => (
          <div key={n} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step > n ? 'bg-indigo-600 text-white' : step === n ? 'ring-2 ring-indigo-500 bg-gray-800 text-white' : 'bg-gray-800 text-gray-500'}`}>
              {step > n ? <Check size={13} /> : n}
            </div>
            <span className={`text-sm ${step === n ? 'text-white font-medium' : 'text-gray-500'}`}>{label}</span>
            {n < 3 && <div className="w-12 h-px bg-gray-700 mx-1" />}
          </div>
        ))}
      </div>

      {error && <div className="px-4 py-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">{error}</div>}

      {/* ── Step 1: Client ── */}
      {step === 1 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-base font-semibold text-white">Select Client</h2>
          <div className="relative">
            <input
              value={clientSearch}
              onChange={(e) => { setClientSearch(e.target.value); setClientDropOpen(true) }}
              onFocus={() => setClientDropOpen(true)}
              placeholder="Search by company name…"
              className={inp}
            />
            {clientDropOpen && clientResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                {clientResults.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedClient(c); setClientSearch(c.companyName); setClientDropOpen(false) }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-700 text-sm text-white transition-colors"
                  >
                    {c.companyName}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedClient && (
            <div className="grid grid-cols-3 gap-3 mt-2">
              {[
                { label: 'Company', value: selectedClient.companyName },
                { label: 'Payment Terms', value: `Net ${selectedClient.paymentTermsDays}` },
                { label: 'Credit Limit', value: fmt(selectedClient.creditLimit) },
              ].map((card) => (
                <div key={card.label} className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-500">{card.label}</p>
                  <p className="text-sm font-medium text-white mt-0.5">{card.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <button
              disabled={!selectedClient}
              onClick={() => setStep(2)}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium"
            >
              Next: Add Items <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Items ── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Existing items */}
          {items.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['Product', 'Variant', 'Qty', 'Unit Price', 'Logo', 'Shipping', 'Line Total', ''].map((h) => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-3 text-white">{item.productName}</td>
                      <td className="px-3 py-3 text-gray-400">{item.variantLabel}</td>
                      <td className="px-3 py-3 text-gray-300">{item.quantity.toLocaleString()}</td>
                      <td className="px-3 py-3 text-gray-300">{fmt(item.unitPriceZAR)}</td>
                      <td className="px-3 py-3 text-gray-300">{item.customisationCostZAR > 0 ? fmt(item.customisationCostZAR) : '—'}</td>
                      <td className="px-3 py-3 text-gray-300">{fmt(item.shippingCostZAR)}</td>
                      <td className="px-3 py-3 font-medium text-white">{fmt(item.lineTotal)}</td>
                      <td className="px-3 py-3">
                        <button onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))} className="p-1 text-red-500 hover:text-red-400">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-800 bg-gray-800/50">
                    <td colSpan={6} className="px-3 py-3 text-right text-xs text-gray-400 font-medium uppercase">Subtotal</td>
                    <td className="px-3 py-3 font-bold text-white">{fmt(subtotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Add item panel */}
          {addingItem ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-300">New Line Item</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Product */}
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs text-gray-400 mb-1.5">Product</label>
                  <select
                    className={inp}
                    value={newProduct?.id ?? ''}
                    onChange={(e) => {
                      const p = allProducts.find((x) => x.id === Number(e.target.value)) ?? null
                      setNewProduct(p); setNewVariant(null); setNewTier(null)
                    }}
                  >
                    <option value="">Select product…</option>
                    {allProducts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
                    ))}
                  </select>
                </div>

                {/* Variant */}
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-xs text-gray-400 mb-1.5">Variant</label>
                  <select
                    className={inp}
                    disabled={!newProduct}
                    value={newVariant?.id ?? ''}
                    onChange={(e) => {
                      const v = newProduct?.variants.find((x) => x.id === Number(e.target.value)) ?? null
                      setNewVariant(v)
                    }}
                  >
                    <option value="">Select variant…</option>
                    {newProduct?.variants.map((v) => (
                      <option key={v.id} value={v.id}>{v.size} — {v.bottleColour} / {v.lidColour} ({v.sku})</option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Quantity</label>
                  <select className={inp} value={newQty} onChange={(e) => setNewQty(Number(e.target.value))}>
                    {QUANTITY_TIERS.map((q) => <option key={q} value={q}>{q.toLocaleString()}</option>)}
                  </select>
                </div>

                {/* Unit price (read-only) */}
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Unit Price (ZAR)</label>
                  <div className={`${inp} text-indigo-300`}>
                    {newTier ? fmt(newTier.salePriceZAR) : '—'}
                  </div>
                </div>
              </div>

              {/* Customisation */}
              {newQty >= 100 && eligibleCustomisations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-medium uppercase">Logo / Customisation</p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="newCust" checked={newCustomisation === null} onChange={() => setNewCustomisation(null)} className="accent-indigo-500" />
                    <span className="text-sm text-gray-300">No logo</span>
                  </label>
                  {eligibleCustomisations.map((opt) => {
                    const tier = opt.pricingTiers.filter((t) => t.minimumQuantity <= newQty).sort((a, b) => b.minimumQuantity - a.minimumQuantity)[0]
                    if (!tier) return null
                    return (
                      <label key={opt.id} className="flex items-center justify-between gap-3 cursor-pointer px-3 py-2 rounded-lg border border-gray-700 bg-gray-800/50">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="newCust"
                            checked={newCustomisation?.opt.id === opt.id}
                            onChange={() => setNewCustomisation({ opt, tier })}
                            className="accent-indigo-500"
                          />
                          <span className="text-sm text-white">{opt.supplierName} — {opt.type === 'SilkScreen' ? 'Silk Screen' : 'Hot Stamping'}</span>
                        </div>
                        <span className="text-sm text-indigo-300">{fmt(tier.pricePerUnitZAR)}/unit</span>
                      </label>
                    )
                  })}
                </div>
              )}

              {/* Shipping estimate */}
              {newVariant && newProduct && (
                <p className="text-sm text-gray-400">
                  Estimated shipping: {calcLoading ? 'Calculating…' : fmt(calcShipping)}
                </p>
              )}

              {/* Line total */}
              {newTier && (
                <div className="flex items-center justify-between bg-indigo-900/20 border border-indigo-800 rounded-lg px-4 py-2.5">
                  <span className="text-sm text-gray-300">Line total</span>
                  <span className="font-bold text-white">
                    {fmt(newTier.salePriceZAR * newQty + (newCustomisation ? newCustomisation.tier.pricePerUnitZAR * newQty : 0))}
                  </span>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setAddingItem(false); setNewProduct(null); setNewVariant(null); setNewQty(10); setNewTier(null); setNewCustomisation(null) }}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  disabled={!newProduct || !newVariant || !newTier}
                  onClick={addItem}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium"
                >
                  Add to Order
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingItem(true)}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-700 hover:border-indigo-500 text-gray-400 hover:text-indigo-400 rounded-xl text-sm transition-colors w-full justify-center"
            >
              <Plus size={16} /> Add Line Item
            </button>
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white">
              <ArrowLeft size={15} /> Back
            </button>
            <button
              disabled={items.length === 0}
              onClick={() => setStep(3)}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-sm font-medium"
            >
              Review Order <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Review ── */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white">Order Summary — {selectedClient?.companyName}</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Product', 'Variant', 'Qty', 'Unit', 'Logo', 'Shipping', 'Total'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-800/40">
                    <td className="px-4 py-3 text-white">{item.productName}</td>
                    <td className="px-4 py-3 text-gray-400">{item.variantLabel}</td>
                    <td className="px-4 py-3 text-gray-300">{item.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-300">{fmt(item.unitPriceZAR)}</td>
                    <td className="px-4 py-3 text-gray-300">{item.customisationCostZAR > 0 ? fmt(item.customisationCostZAR) : '—'}</td>
                    <td className="px-4 py-3 text-gray-300">{fmt(item.shippingCostZAR)}</td>
                    <td className="px-4 py-3 font-medium text-white">{fmt(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-4 border-t border-gray-800 space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
              <div className="flex justify-between text-gray-400"><span>Shipping</span><span>{fmt(totalShipping)}</span></div>
              <div className="flex justify-between text-white font-bold text-base pt-1 border-t border-gray-700 mt-2"><span>Total</span><span>{fmt(total)}</span></div>
            </div>
          </div>

          {/* Notes & date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Required By Date</label>
              <input
                type="date"
                value={requiredByDate}
                onChange={(e) => setRequiredByDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
                placeholder="Any special instructions…"
              />
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white">
              <ArrowLeft size={15} /> Back
            </button>
            <button
              disabled={saving}
              onClick={submit}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
            >
              <Check size={15} />
              {saving ? 'Creating…' : 'Confirm Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
