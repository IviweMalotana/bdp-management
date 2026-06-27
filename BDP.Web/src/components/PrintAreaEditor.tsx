import { useMemo, useState } from 'react'
import { products as productApi } from '../services/api'
import type { Product } from '../types'

const API = import.meta.env.VITE_API_URL || ''

/**
 * Defines a product image's logo "print area" — the box (centre, size, rotation)
 * plus a curve amount that the storefront customise tool warps the customer's
 * logo into. Stored as JSON on the primary product image.
 */
export default function PrintAreaEditor({ product }: { product: Product }) {
  const img = useMemo(
    () => (product.images ?? []).find((i) => i.isPrimary) ?? product.images?.[0] ?? null,
    [product.images]
  )

  const initial = useMemo(() => {
    try { return img?.printArea ? JSON.parse(img.printArea) : null } catch { return null }
  }, [img])

  const [cx, setCx] = useState<number>(initial?.cx ?? 0.5)
  const [cy, setCy] = useState<number>(initial?.cy ?? 0.55)
  const [w, setW] = useState<number>(initial?.w ?? 0.4)
  const [h, setH] = useState<number>(initial?.h ?? 0.18)
  const [angle, setAngle] = useState<number>(initial?.angle ?? 0)
  const [curve, setCurve] = useState<number>(initial?.curve ?? 0.5)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  if (!img) {
    return <div className="p-5 text-sm text-gray-400">Add a product image first to set its logo print area.</div>
  }

  const src = img.url.startsWith('http') ? img.url : `${API}${img.url}`

  const save = async () => {
    setSaving(true); setMsg(null)
    try {
      await productApi.setPrintArea(product.id, img.id, JSON.stringify({ cx, cy, w, h, angle, curve }))
      setMsg('Saved ✓')
    } catch { setMsg('Save failed') } finally { setSaving(false) }
  }

  const clear = async () => {
    setSaving(true); setMsg(null)
    try { await productApi.setPrintArea(product.id, img.id, null); setMsg('Cleared ✓') }
    catch { setMsg('Clear failed') } finally { setSaving(false) }
  }

  const sliders: [string, number, (n: number) => void, number, number, number][] = [
    ['Across (x)', cx, setCx, 0, 1, 0.01],
    ['Up / down (y)', cy, setCy, 0, 1, 0.01],
    ['Width', w, setW, 0.05, 1, 0.01],
    ['Height', h, setH, 0.03, 1, 0.01],
    ['Rotation (°)', angle, setAngle, -45, 45, 1],
    ['Curve', curve, setCurve, 0, 1, 0.01],
  ]

  return (
    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Live box overlay on the product photo */}
      <div className="relative inline-block bg-gray-950 rounded-lg overflow-hidden self-start" style={{ maxWidth: 360 }}>
        <img src={src} alt="" className="block w-full select-none" draggable={false} />
        <div
          style={{
            position: 'absolute',
            left: `${(cx - w / 2) * 100}%`,
            top: `${(cy - h / 2) * 100}%`,
            width: `${w * 100}%`,
            height: `${h * 100}%`,
            transform: `rotate(${angle}deg)`,
            transformOrigin: 'center',
            border: '2px solid #6366f1',
            background: 'rgba(99,102,241,0.18)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Controls */}
      <div className="space-y-3">
        <p className="text-sm text-gray-300">
          Position the box on the bottle&apos;s print face. The storefront warps each customer&apos;s
          logo to fit this box (with rotation + curve), so angled photos look right.
        </p>
        {sliders.map(([label, val, set, min, max, step]) => (
          <div key={label}>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{label}</span>
              <span>{Number.isInteger(step) ? val : val.toFixed(2)}</span>
            </div>
            <input
              type="range" min={min} max={max} step={step} value={val}
              onChange={(e) => set(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        ))}
        <div className="flex items-center gap-2 pt-2">
          <button onClick={save} disabled={saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg disabled:opacity-50">
            {saving ? 'Saving…' : 'Save print area'}
          </button>
          <button onClick={clear} disabled={saving}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg disabled:opacity-50">
            Clear
          </button>
          {msg && <span className="text-sm text-gray-400">{msg}</span>}
        </div>
      </div>
    </div>
  )
}
