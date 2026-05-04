import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { CustomisationOption, CustomisationPricingTier } from '../types'
import { customisation as customisationApi } from '../services/api'

interface Selection {
  option: CustomisationOption
  tier: CustomisationPricingTier
}

interface Props {
  quantity: number
  onSelect: (sel: Selection | null) => void
  selected?: Selection | null
}

const fmt = (n: number) => `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`

export default function CustomisationSelector({ quantity, onSelect, selected }: Props) {
  const [options, setOptions] = useState<CustomisationOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (quantity < 100) { setOptions([]); return }
    setLoading(true)
    customisationApi
      .getAll()
      .then((all) => setOptions(all.filter((o) => o.minimumQuantity <= quantity)))
      .catch(() => setOptions([]))
      .finally(() => setLoading(false))
  }, [quantity])

  if (quantity < 100) return null

  const eligible = options
  const bySupplier = eligible.reduce<Record<string, CustomisationOption[]>>((acc, o) => {
    const k = o.supplierName
    if (!acc[k]) acc[k] = []
    acc[k].push(o)
    return acc
  }, {})

  const getBestTier = (o: CustomisationOption): CustomisationPricingTier | undefined =>
    o.pricingTiers
      .filter((t) => t.minimumQuantity <= quantity)
      .sort((a, b) => b.minimumQuantity - a.minimumQuantity)[0]

  return (
    <div className="space-y-3 mt-2">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Logo / Customisation</p>

      {loading && <p className="text-sm text-gray-500">Loading options…</p>}

      {!loading && eligible.length === 0 && (
        <div className="flex items-center gap-2 text-amber-400 text-sm bg-amber-900/20 border border-amber-800 rounded-lg px-3 py-2">
          <AlertTriangle size={14} />
          No suppliers available for quantity {quantity}
        </div>
      )}

      {/* None option */}
      {eligible.length > 0 && (
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="radio"
            name="customisation"
            checked={selected === null}
            onChange={() => onSelect(null)}
            className="accent-indigo-500"
          />
          <span className="text-sm text-gray-300">No logo</span>
        </label>
      )}

      {Object.entries(bySupplier).map(([supplierName, opts]) => (
        <div key={supplierName} className="space-y-2">
          <p className="text-xs text-gray-500 font-medium">{supplierName}</p>
          {opts.map((o) => {
            const tier = getBestTier(o)
            if (!tier) return null
            const isSelected = selected?.option.id === o.id
            return (
              <label
                key={o.id}
                className={`flex items-center justify-between gap-3 cursor-pointer px-3 py-2.5 rounded-lg border transition-colors ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-900/20'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="customisation"
                    checked={isSelected}
                    onChange={() => onSelect({ option: o, tier })}
                    className="accent-indigo-500"
                  />
                  <span className="text-sm text-white">
                    {o.type === 'SilkScreen' ? 'Silk Screen' : 'Hot Stamping'}
                  </span>
                </div>
                <span className="text-sm text-indigo-300 font-medium">{fmt(tier.pricePerUnitZAR)}/unit</span>
              </label>
            )
          })}
        </div>
      ))}
    </div>
  )
}
