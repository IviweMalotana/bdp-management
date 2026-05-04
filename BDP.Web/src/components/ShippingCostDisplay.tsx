import { useEffect, useState } from 'react'
import { shipping } from '../services/api'

interface Props {
  weightKg: number
  volumeCBM: number
  quantity: number
  className?: string
}

export default function ShippingCostDisplay({ weightKg, volumeCBM, quantity, className }: Props) {
  const [cost, setCost] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!weightKg || !volumeCBM || !quantity) return
    setLoading(true)
    shipping
      .calculate({ weightKg, volumeCBM, quantity })
      .then((r) => setCost(r.totalShippingZAR))
      .catch(() => setCost(null))
      .finally(() => setLoading(false))
  }, [weightKg, volumeCBM, quantity])

  if (loading) return <span className={`text-gray-500 text-sm ${className}`}>Calculating…</span>
  if (cost === null) return null
  return (
    <span className={`text-sm text-gray-300 ${className}`}>
      Shipping: R {cost.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
    </span>
  )
}
