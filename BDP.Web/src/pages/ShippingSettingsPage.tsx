import { useEffect, useState } from 'react'
import { shipping as settingsApi } from '../services/api'
import type { ShippingSettings } from '../types'
import { Settings, Loader2, Check, AlertCircle, RefreshCw } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function ShippingSettingsPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'Admin')
  const [settings, setSettings] = useState<ShippingSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({ cnyPerCbm: '', cnyPerKg: '', cnyToZarRate: '' })

  // Live preview
  const cnyPerCbm = parseFloat(form.cnyPerCbm) || 0
  const cnyPerKg  = parseFloat(form.cnyPerKg)  || 0
  const cnyToZar  = parseFloat(form.cnyToZarRate) || 0

  const previewExamples = [
    { label: 'Serum 30ml',   cbm: 0.000000192, kg: 0.10 },
    { label: 'Serum 40ml',   cbm: 0.000000224, kg: 0.12 },
    { label: 'Pump/Spray',   cbm: 0.000000224, kg: 0.10 },
    { label: 'Jar ≤30ml',    cbm: 0.000000180, kg: 0.12 },
    { label: 'Jar >30ml',    cbm: 0.000000294, kg: 0.15 },
  ]

  const calcPerUnit = (cbm: number, kg: number) =>
    ((cbm * cnyPerCbm) + (kg * cnyPerKg)) * cnyToZar

  useEffect(() => {
    settingsApi.getSettings()
      .then((s) => {
        setSettings(s)
        setForm({
          cnyPerCbm:    String(s.cnyPerCbm),
          cnyPerKg:     String(s.cnyPerKg),
          cnyToZarRate: String(s.cnyToZarRate),
        })
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true); setError(null); setSuccess(false)
    try {
      const updated = await settingsApi.updateSettings({
        cnyPerCbm:    parseFloat(form.cnyPerCbm),
        cnyPerKg:     parseFloat(form.cnyPerKg),
        cnyToZarRate: parseFloat(form.cnyToZarRate),
      })
      setSettings(updated)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  const inp = 'w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
  const lbl = 'block text-xs font-medium text-gray-400 mb-1'

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings size={20} className="text-indigo-400" />
          Shipping Settings
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">Sea freight DDP rates (China → customer). Saving recalculates all product pricing tiers.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={24} className="animate-spin text-indigo-500" />
        </div>
      ) : (
        <>
          {/* Edit form */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <p className="text-sm font-semibold text-white">Rate Configuration</p>

            {error && (
              <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-red-300 text-sm">
                <AlertCircle size={14} />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 bg-green-900/30 border border-green-700 rounded-lg px-3 py-2 text-green-300 text-sm">
                <Check size={14} />
                Settings saved and all pricing tiers recalculated.
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={lbl}>CNY per CBM (¥/m³)</label>
                <input
                  type="number" step="1" className={inp}
                  value={form.cnyPerCbm}
                  onChange={(e) => setForm({ ...form, cnyPerCbm: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
              <div>
                <label className={lbl}>CNY per kg (¥/kg)</label>
                <input
                  type="number" step="0.01" className={inp}
                  value={form.cnyPerKg}
                  onChange={(e) => setForm({ ...form, cnyPerKg: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
              <div>
                <label className={lbl}>CNY → ZAR rate</label>
                <input
                  type="number" step="0.0001" className={inp}
                  value={form.cnyToZarRate}
                  onChange={(e) => setForm({ ...form, cnyToZarRate: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
            </div>

            {isAdmin && (
              <div className="flex justify-end pt-2 border-t border-gray-800">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Save & Recalculate All Tiers
                </button>
              </div>
            )}
          </div>

          {/* Live preview */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <p className="text-sm font-semibold text-white mb-4">Shipping Cost Preview (per unit)</p>
            <p className="text-xs text-gray-500 mb-3">Formula: ((CBM × ¥/CBM) + (kg × ¥/kg)) × CNY→ZAR</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['Product Type', 'CBM', 'Weight', 'Shipping / unit'].map((h) => (
                    <th key={h} className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {previewExamples.map(({ label, cbm, kg }) => (
                  <tr key={label} className="hover:bg-gray-800/40">
                    <td className="py-2.5 text-gray-300">{label}</td>
                    <td className="py-2.5 text-gray-500 font-mono text-xs">{cbm.toFixed(9)}</td>
                    <td className="py-2.5 text-gray-500">{kg} kg</td>
                    <td className="py-2.5 font-semibold text-emerald-400">
                      R{calcPerUnit(cbm, kg).toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {settings && (
            <p className="text-xs text-gray-600">
              Last saved: ¥{settings.cnyPerCbm}/CBM · ¥{settings.cnyPerKg}/kg · ×{settings.cnyToZarRate} ZAR
            </p>
          )}
        </>
      )}
    </div>
  )
}
