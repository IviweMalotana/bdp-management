import { useEffect, useState } from 'react'
import { Paintbrush, Clock, Feather, ExternalLink } from 'lucide-react'
import { customisation } from '../services/api'
import type { CustomisationProfitOption } from '../types'

const fmt = (n: number) => `R${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const typeLabel = (t: string) =>
  t === 'SilkScreen' ? 'Silk Screen'
    : t === 'HotStamping' ? 'Hot Stamping'
    : t === 'ColourChange' ? 'Colour Change'
    : t

export default function CustomisationProfitPage() {
  const [options, setOptions] = useState<CustomisationProfitOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    customisation.getAllWithProfit()
      .then(setOptions)
      .catch((e: any) => setError(e?.response?.data?.message ?? 'Failed to load customisation costs'))
      .finally(() => setLoading(false))
  }, [])

  // Group by supplier
  const bySupplier = options.reduce<Record<string, CustomisationProfitOption[]>>((acc, o) => {
    (acc[o.supplierName] ??= []).push(o)
    return acc
  }, {})

  if (loading) return <div className="text-gray-500 py-12 text-center">Loading…</div>

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <Paintbrush size={20} className="text-indigo-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Customisation — Cost & Profit</h1>
          <p className="text-sm text-gray-400">True supplier costs and profit per quantity, by supplier</p>
        </div>
      </div>

      {/* Rules banner */}
      <div className="flex flex-wrap gap-4 px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-sm">
        <span className="flex items-center gap-2 text-gray-300"><Clock size={15} className="text-amber-400" /> Adds <strong>+1 week</strong> production time</span>
        <span className="flex items-center gap-2 text-gray-300"><Feather size={15} className="text-green-400" /> Adds <strong>no shipping weight</strong> (0 kg)</span>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      {options.length === 0 && !error && (
        <p className="px-5 py-8 text-sm text-gray-500 text-center bg-gray-900 border border-gray-800 rounded-xl">
          No customisation options configured yet. Add them per supplier on the supplier page.
        </p>
      )}

      {Object.entries(bySupplier).map(([supplier, opts]) => (
        <div key={supplier} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800">
            <h2 className="font-semibold text-white">{supplier}</h2>
          </div>
          <div className="p-5 space-y-6">
            {opts.map((opt) => (
              <div key={opt.id}>
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    {typeLabel(opt.type)}
                    {opt.link1688 && (
                      <a href={opt.link1688} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300">
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </h3>
                  {opt.minimumQuantity != null && (
                    <span className="text-xs text-gray-500">MOQ {opt.minimumQuantity.toLocaleString()}</span>
                  )}
                </div>
                {opt.pricingTiers.length === 0 ? (
                  <p className="text-xs text-gray-600">No cost tiers loaded for this option.</p>
                ) : (
                  <div className="overflow-x-auto border border-gray-800 rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-800 bg-gray-800/40">
                          {['Qty', 'Cost/Unit', 'Sale/Unit', 'Profit/Unit', 'Total Cost', 'Total Sale', 'Total Profit', 'Margin'].map((h) => (
                            <th key={h} className="px-4 py-2.5 text-right first:text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {opt.pricingTiers.map((t) => (
                          <tr key={t.id} className="hover:bg-gray-800/50">
                            <td className="px-4 py-2.5 font-semibold text-white">{t.quantity.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-right text-gray-400">{fmt(t.costPerUnitZAR)}</td>
                            <td className="px-4 py-2.5 text-right text-gray-200">
                              {fmt(t.salePerUnitZAR)}
                              {t.salePriceDerived && <span className="text-gray-600" title="Derived at 70% markup — set a sale price to override"> *</span>}
                            </td>
                            <td className="px-4 py-2.5 text-right text-green-400">{fmt(t.profitPerUnitZAR)}</td>
                            <td className="px-4 py-2.5 text-right text-gray-400">{fmt(t.totalCostZAR)}</td>
                            <td className="px-4 py-2.5 text-right text-gray-200">{fmt(t.totalSaleZAR)}</td>
                            <td className="px-4 py-2.5 text-right text-green-400 font-medium">{fmt(t.totalProfitZAR)}</td>
                            <td className="px-4 py-2.5 text-right text-gray-300">{t.marginPercent.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {opt.pricingTiers.some((t) => t.salePriceDerived) && (
                  <p className="text-xs text-gray-600 mt-1.5">* Sale price derived at 70% markup on cost — set an explicit sale price to override.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
