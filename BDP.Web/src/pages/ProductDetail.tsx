import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { products as productApi } from '../services/api'
import type { Product } from '../types'
import { ChevronLeft, Pencil, ExternalLink } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import ProductForm from '../components/ProductForm'

const LOC_COLOUR: Record<string, string> = {
  'Cape Town':    'bg-green-500/20 text-green-400',
  'China':        'bg-blue-500/20 text-blue-400',
  'ZQ Warehouse': 'bg-purple-500/20 text-purple-400',
}

type Tab = 'pricing' | 'customisation' | 'inventory'

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const isAdmin = useAuthStore((s) => s.user?.role === 'Admin')
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('pricing')
  const [showEdit, setShowEdit] = useState(false)

  const load = () => {
    if (!id) return
    setLoading(true)
    productApi.getById(Number(id)).then(setProduct).finally(() => setLoading(false))
  }

  useEffect(load, [id])

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
          ['Cost ZAR', `R${product.costPerUnitZAR.toFixed(2)}`],
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
        <div className="flex border-b border-gray-800">
          {([
            { key: 'pricing',        label: `Pricing Tiers (${product.pricingTiers.length})` },
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

        {/* Pricing Tiers tab */}
        {tab === 'pricing' && (
          product.pricingTiers.length === 0 ? (
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
                  {product.pricingTiers.map((t) => (
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
                      {['Qty', 'Sale Price (ZAR)', 'Delivery (ZAR)', 'Silk Screen Logo', 'Hot Stamping Logo', 'Total w/ Silk', 'Total w/ Hot'].map((h) => (
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
                          <td className="px-4 py-2.5 text-gray-300">R{tier.deliveryCostZAR.toFixed(2)}</td>
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
