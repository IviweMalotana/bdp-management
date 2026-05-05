import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { products as productApi } from '../services/api'
import type { Product, ProductVariant } from '../types'
import { ChevronLeft, Pencil, ExternalLink, Plus, Trash2, X, Loader2 } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import ProductForm from '../components/ProductForm'

const LOC_COLOUR: Record<string, string> = {
  'Cape Town':    'bg-green-500/20 text-green-400',
  'China':        'bg-blue-500/20 text-blue-400',
  'ZQ Warehouse': 'bg-purple-500/20 text-purple-400',
}

const SIZES_ML = ['5ml','10ml','15ml','20ml','30ml','50ml','60ml','100ml','120ml','150ml','200ml','250ml','300ml','500ml','1000ml']
const SIZES_G  = ['5g','10g','15g','20g','30g','50g','100g','150g','200g','250g','300g','500g']
const TEXTURES = ['Matte', 'Clear', 'Frosted']
const iCls = 'w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500'

interface VariantForm { size: string; bottleColour: string; lidColour: string; texture: string }
const emptyVariant = (): VariantForm => ({ size: '', bottleColour: '', lidColour: '', texture: '' })

type Tab = 'variants' | 'pricing' | 'customisation' | 'inventory'

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const isAdmin = useAuthStore((s) => s.user?.role === 'Admin')
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('variants')
  const [showEdit, setShowEdit] = useState(false)

  // ── Variant management ───────────────────────────────────────────────────
  const [showVariantForm, setShowVariantForm] = useState(false)
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null)
  const [variantForm, setVariantForm] = useState<VariantForm>(emptyVariant())
  const [variantSaving, setVariantSaving] = useState(false)
  const [variantError, setVariantError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const load = () => {
    if (!id) return
    setLoading(true)
    productApi.getById(Number(id)).then(setProduct).finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const openAddVariant = () => {
    setEditingVariant(null)
    setVariantForm(emptyVariant())
    setVariantError(null)
    setShowVariantForm(true)
  }

  const openEditVariant = (v: ProductVariant) => {
    setEditingVariant(v)
    setVariantForm({ size: v.size, bottleColour: v.bottleColour, lidColour: v.lidColour, texture: v.texture })
    setVariantError(null)
    setShowVariantForm(true)
  }

  const handleSaveVariant = async () => {
    if (!product) return
    if (!variantForm.size || !variantForm.bottleColour || !variantForm.lidColour || !variantForm.texture) {
      setVariantError('All fields are required.')
      return
    }
    setVariantSaving(true); setVariantError(null)
    try {
      const slug = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
      const sku = [slug(product.name), slug(product.category), slug(variantForm.size),
        slug(variantForm.bottleColour), slug(variantForm.lidColour), slug(variantForm.texture)]
        .filter(Boolean).join('-')
      const payload = { ...variantForm, sku }
      if (editingVariant) {
        await productApi.updateVariant(product.id, editingVariant.id, payload)
      } else {
        await productApi.addVariant(product.id, payload)
      }
      load()
      setShowVariantForm(false)
    } catch {
      setVariantError('Failed to save variant.')
    } finally {
      setVariantSaving(false)
    }
  }

  const handleDeleteVariant = async (variantId: number) => {
    if (!product) return
    setDeletingId(variantId)
    try {
      await productApi.deleteVariant(product.id, variantId)
      load()
    } catch { /* ignore */ }
    finally { setDeletingId(null) }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" /></div>
  if (!product) return <p className="text-gray-400">Product not found.</p>

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/products" className="text-gray-400 hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-white">{product.name}</h1>
          <p className="text-sm text-gray-400 font-mono">{product.skuBase}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${product.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
            {product.isActive ? 'Active' : 'Inactive'}
          </span>
          {isAdmin && (
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm rounded-lg transition-colors"
            >
              <Pencil size={13} />
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          ['Category', product.category],
          ['Size', `${product.sizeML}ml`],
          ['Bottle Colour', product.bottleColour],
          ['Lid Colour', product.lidColour],
          ['Texture', product.texture],
          ['Supplier', product.supplierName],
          ['Cost CNY', `¥${product.costCNY}`],
          ['Cost ZAR', `R${(product.costPerUnitZAR ?? 0).toFixed(2)}`],
        ] as [string, string][]).map(([label, val]) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-sm font-medium text-white">{val}</p>
          </div>
        ))}
      </div>

      {product.supplierLink && (
        <a href={product.supplierLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
          <ExternalLink size={14} />
          Supplier listing
        </a>
      )}

      {/* Tabs */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex border-b border-gray-800 overflow-x-auto">
          {([
            { key: 'variants',       label: `Variants (${product.variants?.length ?? 0})` },
            { key: 'pricing',        label: `Pricing Tiers (${product.pricingTiers?.length ?? 0})` },
            { key: 'customisation',  label: `Pricing & Customisation (${product.productPricingTiers?.length ?? 0})` },
            { key: 'inventory',      label: `Inventory (${product.inventoryItems?.length ?? 0})` },
          ] as { key: Tab; label: string }[]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap ${tab === key ? 'text-white border-b-2 border-indigo-500 -mb-px' : 'text-gray-400 hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Variants tab */}
        {tab === 'variants' && (
          <div className="p-5 space-y-4">
            {isAdmin && (
              <div className="flex justify-end">
                <button
                  onClick={openAddVariant}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
                >
                  <Plus size={14} /> Add Variant
                </button>
              </div>
            )}

            {/* Variant form */}
            {showVariantForm && (
              <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-white">{editingVariant ? 'Edit Variant' : 'New Variant'}</p>
                  <button onClick={() => setShowVariantForm(false)} className="text-gray-400 hover:text-white"><X size={16} /></button>
                </div>
                {variantError && <p className="text-xs text-red-400">{variantError}</p>}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Size</label>
                    <select
                      value={variantForm.size}
                      onChange={(e) => setVariantForm((f) => ({ ...f, size: e.target.value }))}
                      className={iCls}
                    >
                      <option value="">Select size…</option>
                      <optgroup label="— ml —">
                        {SIZES_ML.map((s) => <option key={s} value={s}>{s}</option>)}
                      </optgroup>
                      <optgroup label="— g —">
                        {SIZES_G.map((s) => <option key={s} value={s}>{s}</option>)}
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Texture</label>
                    <select
                      value={variantForm.texture}
                      onChange={(e) => setVariantForm((f) => ({ ...f, texture: e.target.value }))}
                      className={iCls}
                    >
                      <option value="">Select…</option>
                      {TEXTURES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Bottle Colour</label>
                    <input
                      value={variantForm.bottleColour}
                      onChange={(e) => setVariantForm((f) => ({ ...f, bottleColour: e.target.value }))}
                      className={iCls}
                      placeholder="e.g. Clear, Black"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Lid Colour</label>
                    <input
                      value={variantForm.lidColour}
                      onChange={(e) => setVariantForm((f) => ({ ...f, lidColour: e.target.value }))}
                      className={iCls}
                      placeholder="e.g. White, Gold"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => setShowVariantForm(false)} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
                  <button
                    onClick={handleSaveVariant}
                    disabled={variantSaving}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                  >
                    {variantSaving ? <Loader2 size={13} className="animate-spin" /> : null}
                    {editingVariant ? 'Save Changes' : 'Add Variant'}
                  </button>
                </div>
              </div>
            )}

            {/* Variants list */}
            {(product.variants?.length ?? 0) === 0 && !showVariantForm ? (
              <p className="text-sm text-gray-500 text-center py-6">No variants yet.{isAdmin && ' Click "Add Variant" to create one.'}</p>
            ) : (
              <div className="space-y-2">
                {(product.variants ?? []).map((v) => (
                  <div key={v.id} className="flex items-center justify-between bg-gray-800/40 border border-gray-800 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-semibold text-indigo-300 bg-indigo-900/40 border border-indigo-800/40 px-2 py-0.5 rounded">{v.size}</span>
                      <span className="text-sm text-gray-300">{v.bottleColour} / {v.lidColour}</span>
                      <span className="text-xs text-gray-500">{v.texture}</span>
                      <span className="text-xs font-mono text-gray-600">{v.sku}</span>
                      {(v.pricingTiers?.length ?? 0) > 0 && (
                        <span className="text-xs text-green-400">{v.pricingTiers.length} price tiers</span>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => openEditVariant(v)} className="text-gray-400 hover:text-white transition-colors p-1"><Pencil size={13} /></button>
                        <button
                          onClick={() => handleDeleteVariant(v.id)}
                          disabled={deletingId === v.id}
                          className="text-gray-600 hover:text-red-400 transition-colors p-1 disabled:opacity-50"
                        >
                          {deletingId === v.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pricing Tiers tab */}
        {tab === 'pricing' && (
          (product.pricingTiers?.length ?? 0) === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-500 text-center">No pricing tiers configured.{isAdmin && ' Click Edit to add tiers after saving.'}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['SKU', 'Qty', 'Sale/Unit', 'Total Sale', 'Cost', 'Profit', 'Margin', 'Delivery', 'Silk Screen', 'Hot Stamp'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {(product.pricingTiers ?? []).map((t) => (
                    <tr key={t.id} className="hover:bg-gray-800/50">
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-300">{t.sku}</td>
                      <td className="px-4 py-2.5 text-gray-300">{t.quantity.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-gray-300">R{t.salePricePerUnit.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-gray-300">R{t.totalSalePrice.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-gray-300">R{t.totalCostPrice.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-green-400">R{t.totalProfit.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-gray-300">{t.marginPercent.toFixed(1)}%</td>
                      <td className="px-4 py-2.5 text-gray-300">R{t.deliveryCostZAR.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-gray-400">{t.logoSilkScreen != null ? `R${t.logoSilkScreen}` : '—'}</td>
                      <td className="px-4 py-2.5 text-gray-400">{t.logoHotStamping != null ? `R${t.logoHotStamping}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* Pricing & Customisation tab */}
        {tab === 'customisation' && (
          !product.productPricingTiers || product.productPricingTiers.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-500 text-center">No pricing & customisation tiers configured.</p>
          ) : (() => {
            // Find first tier index where silk/hot becomes available
            const firstSilk = product.productPricingTiers!.findIndex(t => t.silkScreenLogoZAR != null)
            const firstHot  = product.productPricingTiers!.findIndex(t => t.hotStampingLogoZAR != null)
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      {['Qty', 'Sale Price (ZAR)', 'Shipping (DDP from China)', 'Silk Screen Logo', 'Hot Stamping Logo', 'Total w/ Silk', 'Total w/ Hot'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {product.productPricingTiers!.map((tier, idx) => {
                      const isSilkFirst = idx === firstSilk && firstSilk !== -1
                      const isHotFirst  = idx === firstHot  && firstHot  !== -1
                      const highlight   = isSilkFirst || isHotFirst
                      return (
                        <tr key={tier.id} className={`hover:bg-gray-800/50 ${highlight ? 'bg-indigo-950/40' : ''}`}>
                          <td className="px-4 py-2.5 font-semibold text-white">{tier.quantity.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-gray-300">R{tier.salePriceZAR.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-gray-300">R{tier.shippingFromChinaZAR.toFixed(2)}</td>
                          <td className={`px-4 py-2.5 ${isSilkFirst ? 'text-indigo-300 font-semibold' : tier.silkScreenLogoZAR != null ? 'text-gray-300' : 'text-gray-600'}`}>
                            {tier.silkScreenLogoZAR != null ? `R${tier.silkScreenLogoZAR.toFixed(2)}` : '—'}
                          </td>
                          <td className={`px-4 py-2.5 ${isHotFirst ? 'text-amber-300 font-semibold' : tier.hotStampingLogoZAR != null ? 'text-gray-300' : 'text-gray-600'}`}>
                            {tier.hotStampingLogoZAR != null ? `R${tier.hotStampingLogoZAR.toFixed(2)}` : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-gray-300">
                            {tier.silkScreenLogoZAR != null ? `R${(tier.salePriceZAR + tier.silkScreenLogoZAR).toFixed(2)}` : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-gray-300">
                            {tier.hotStampingLogoZAR != null ? `R${(tier.salePriceZAR + tier.hotStampingLogoZAR).toFixed(2)}` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          })()
        )}

        {/* Inventory tab */}
        {tab === 'inventory' && (
          !product.inventoryItems || product.inventoryItems.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-500 text-center">No inventory records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['Location', 'On Hand', 'Available', 'Incoming', 'Committed', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {product.inventoryItems.map((ii) => (
                    <tr key={ii.id} className="hover:bg-gray-800/50">
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded font-medium ${LOC_COLOUR[ii.location] ?? 'bg-gray-700 text-gray-400'}`}>
                          {ii.location}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-300 font-semibold">{ii.onHandStock}</td>
                      <td className={`px-4 py-3 font-semibold ${ii.availableStock === 0 ? 'text-red-400' : 'text-gray-300'}`}>{ii.availableStock}</td>
                      <td className="px-4 py-3 text-gray-300">{ii.incomingStock}</td>
                      <td className="px-4 py-3 text-gray-300">{ii.committedStock}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium ${ii.isStocked ? 'text-green-400' : 'text-gray-500'}`}>
                          {ii.isStocked ? 'Stocked' : 'Unstocked'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {showEdit && (
        <ProductForm
          product={product}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => { setProduct(updated); setShowEdit(false) }}
        />
      )}
    </div>
  )
}
