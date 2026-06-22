import { useEffect, useState } from 'react'
import { Paintbrush, Loader2, Check, AlertCircle, Save } from 'lucide-react'
import http from '../../services/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface GlobalSetting {
  id: number
  type: string
  pricePerUnitZAR: number
  isActive: boolean
  defaultMinimumQuantity: number
}

interface SupplierOption {
  type: string
  isEnabled: boolean
  minimumQuantity: number | null
}

interface SupplierRow {
  supplierId: number
  supplierName: string
  options: SupplierOption[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  SilkScreen:   'Silk Screen',
  HotStamping:  'Hot Stamping',
  ColourChange: 'Colour Change',
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CustomisationSettings() {
  const [settings, setSettings] = useState<GlobalSetting[]>([])
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      http.get<GlobalSetting[]>('/admin/customisation/settings').then((r) => r.data),
      http.get<SupplierRow[]>('/admin/customisation/suppliers').then((r) => r.data),
    ])
      .then(([s, sup]) => {
        setSettings(s)
        setSuppliers(sup)
      })
      .catch(() => setError('Failed to load customisation data.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 rounded bg-red-900/30 border border-red-700 text-red-300">
        <AlertCircle size={16} />
        <span className="text-sm">{error}</span>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-10">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Paintbrush size={22} className="text-gray-400" />
        <div>
          <h1 className="text-xl font-semibold text-white">Customisation Settings</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Manage global pricing and per-supplier availability for customisation options.
          </p>
        </div>
      </div>

      {/* Section 1 — Global Pricing */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-4">
          Global Pricing
        </h2>
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-500">Option</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-500">Active</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-500">Price / unit (ZAR)</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-gray-500">Default MOQ</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {settings.map((s) => (
                <GlobalSettingRow
                  key={s.id}
                  setting={s}
                  onSaved={(updated) =>
                    setSettings((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
                  }
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2 — Per-Supplier Availability */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-4">
          Per-Supplier Availability
        </h2>
        <div className="space-y-4">
          {suppliers.map((sup) => (
            <SupplierCard
              key={sup.supplierId}
              row={sup}
              onSaved={(updated) =>
                setSuppliers((prev) =>
                  prev.map((x) => (x.supplierId === updated.supplierId ? updated : x))
                )
              }
            />
          ))}
        </div>
      </section>
    </div>
  )
}

// ── Global setting row ────────────────────────────────────────────────────────

function GlobalSettingRow({
  setting,
  onSaved,
}: {
  setting: GlobalSetting
  onSaved: (updated: GlobalSetting) => void
}) {
  const [price, setPrice] = useState(String(setting.pricePerUnitZAR))
  const [moq, setMoq] = useState(String(setting.defaultMinimumQuantity))
  const [active, setActive] = useState(setting.isActive)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const isDirty =
    parseFloat(price) !== setting.pricePerUnitZAR ||
    parseInt(moq, 10) !== setting.defaultMinimumQuantity ||
    active !== setting.isActive

  const handleSave = async () => {
    setSaving(true); setErr(null)
    try {
      const resp = await http.put<GlobalSetting>(
        `/admin/customisation/settings/${setting.id}`,
        { pricePerUnitZAR: parseFloat(price), isActive: active, defaultMinimumQuantity: parseInt(moq, 10) }
      )
      onSaved(resp.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setErr('Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr>
      <td className="px-5 py-4 font-medium text-white">
        {TYPE_LABELS[setting.type] ?? setting.type}
      </td>
      <td className="px-5 py-4">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="w-4 h-4 accent-indigo-500"
        />
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-1">
          <span className="text-gray-400 text-xs">R</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-24 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </td>
      <td className="px-5 py-4">
        <input
          type="number"
          step="1"
          min="1"
          value={moq}
          onChange={(e) => setMoq(e.target.value)}
          className="w-28 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-indigo-500"
        />
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          {err && <span className="text-xs text-red-400">{err}</span>}
          {saved && <Check size={14} className="text-green-400" />}
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Save
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Per-supplier card ─────────────────────────────────────────────────────────

const ALL_TYPES = ['ColourChange', 'SilkScreen', 'HotStamping'] as const

function SupplierCard({
  row,
  onSaved,
}: {
  row: SupplierRow
  onSaved: (updated: SupplierRow) => void
}) {
  const [options, setOptions] = useState<SupplierOption[]>(() =>
    ALL_TYPES.map((type) => {
      const existing = row.options.find((o) => o.type === type)
      return existing ?? { type, isEnabled: false, minimumQuantity: null }
    })
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const setOption = (type: string, patch: Partial<SupplierOption>) => {
    setOptions((prev) => prev.map((o) => (o.type === type ? { ...o, ...patch } : o)))
  }

  const handleSave = async () => {
    setSaving(true); setErr(null)
    try {
      await http.put(`/admin/customisation/suppliers/${row.supplierId}/options`, { options })
      onSaved({ ...row, options })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setErr('Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-white">{row.supplierName}</h3>
        <div className="flex items-center gap-2">
          {err && <span className="text-xs text-red-400">{err}</span>}
          {saved && <span className="flex items-center gap-1 text-xs text-green-400"><Check size={12} /> Saved</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Save
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {options.map((opt) => (
          <div key={opt.type} className="flex items-center gap-4">
            <input
              type="checkbox"
              id={`${row.supplierId}-${opt.type}`}
              checked={opt.isEnabled}
              onChange={(e) => setOption(opt.type, { isEnabled: e.target.checked })}
              className="w-4 h-4 accent-indigo-500 shrink-0"
            />
            <label
              htmlFor={`${row.supplierId}-${opt.type}`}
              className="text-sm text-gray-300 w-36 cursor-pointer"
            >
              {TYPE_LABELS[opt.type] ?? opt.type}
            </label>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">MOQ override</span>
              <input
                type="number"
                placeholder="(use default)"
                min="1"
                step="1"
                value={opt.minimumQuantity ?? ''}
                onChange={(e) =>
                  setOption(opt.type, {
                    minimumQuantity: e.target.value ? parseInt(e.target.value, 10) : null,
                  })
                }
                disabled={!opt.isEnabled}
                className="w-32 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 disabled:opacity-40"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
