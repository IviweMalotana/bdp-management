import { useState, useEffect, useCallback } from 'react'
import { shippingRates as api } from '../services/api'
import type { ShippingRate, ShippingCalcResult } from '../types'
import { useAuthStore } from '../store/authStore'
import { Plus, Pencil, Trash2, Calculator, ChevronDown, ChevronRight, CheckCircle, XCircle } from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────
const SHIPPING_TYPES = ['AirDDP', 'AirDDU', 'SeaDDP', 'SeaDDU'] as const
const TYPE_LABELS: Record<string, string> = {
  AirDDP: 'Air DDP', AirDDU: 'Air DDU', SeaDDP: 'Sea DDP', SeaDDU: 'Sea DDU',
}
const TYPE_COLOURS: Record<string, string> = {
  AirDDP: 'bg-blue-900/40 text-blue-300 border border-blue-700',
  AirDDU: 'bg-cyan-900/40 text-cyan-300 border border-cyan-700',
  SeaDDP: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700',
  SeaDDU: 'bg-teal-900/40 text-teal-300 border border-teal-700',
}

// ── Blank rate template ───────────────────────────────────────────────────────
const blankRate = (): Omit<ShippingRate, 'id' | 'updatedAt'> => ({
  country: '',
  shippingType: 'AirDDP',
  ratePerKg: 0,
  ratePerCbm: 0,
  fuelSurchargePercent: 0,
  dutyRatePercent: 0,
  vatRatePercent: 15,
  handlingFeeZAR: 0,
  minimumChargeZAR: 0,
  exchangeRateCNYToZAR: 2.40,
  estimatedTransitDays: 0,
  isActive: true,
  notes: null,
})

type FormData = Omit<ShippingRate, 'id' | 'updatedAt'>

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ShippingRatesPage() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'Admin'

  const [rates, setRates] = useState<ShippingRate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Per-country collapsed state
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormData>(blankRate())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Delete confirm
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // Calculator panel
  const [calcOpen, setCalcOpen] = useState(false)
  const [calcCountry, setCalcCountry] = useState('')
  const [calcType, setCalcType] = useState<string>('AirDDP')
  const [calcWeight, setCalcWeight] = useState('')
  const [calcVolume, setCalcVolume] = useState('')
  const [calcResult, setCalcResult] = useState<ShippingCalcResult | null>(null)
  const [calcError, setCalcError] = useState<string | null>(null)
  const [calcLoading, setCalcLoading] = useState(false)

  // ── Load ────────────────────────────────────────────────────────────────────
  const loadRates = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.getAll()
      setRates(data)
    } catch {
      setError('Failed to load shipping rates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadRates() }, [loadRates])

  // ── Group by country ────────────────────────────────────────────────────────
  const grouped = rates.reduce<Record<string, ShippingRate[]>>((acc, r) => {
    ;(acc[r.country] ??= []).push(r)
    return acc
  }, {})
  const countries = Object.keys(grouped).sort()

  // ── Modal helpers ───────────────────────────────────────────────────────────
  function openAdd(country?: string) {
    setForm({ ...blankRate(), country: country ?? '' })
    setEditingId(null)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(rate: ShippingRate) {
    setForm({
      country: rate.country,
      shippingType: rate.shippingType,
      ratePerKg: rate.ratePerKg,
      ratePerCbm: rate.ratePerCbm,
      fuelSurchargePercent: rate.fuelSurchargePercent,
      dutyRatePercent: rate.dutyRatePercent,
      vatRatePercent: rate.vatRatePercent,
      handlingFeeZAR: rate.handlingFeeZAR,
      minimumChargeZAR: rate.minimumChargeZAR,
      exchangeRateCNYToZAR: rate.exchangeRateCNYToZAR,
      estimatedTransitDays: rate.estimatedTransitDays,
      isActive: rate.isActive,
      notes: rate.notes,
    })
    setEditingId(rate.id)
    setFormError(null)
    setModalOpen(true)
  }

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!form.country.trim()) { setFormError('Country is required'); return }
    if (!form.shippingType) { setFormError('Shipping type is required'); return }
    setSaving(true)
    setFormError(null)
    try {
      if (editingId !== null) {
        await api.update(editingId, form)
      } else {
        await api.create(form)
      }
      setModalOpen(false)
      await loadRates()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setFormError(msg ?? 'Failed to save rate')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    try {
      await api.delete(id)
      setDeletingId(null)
      await loadRates()
    } catch {
      alert('Failed to delete rate')
    }
  }

  // ── Calculator ──────────────────────────────────────────────────────────────
  async function handleCalculate() {
    if (!calcCountry || !calcType || !calcWeight || !calcVolume) {
      setCalcError('Fill in all fields'); return
    }
    setCalcLoading(true)
    setCalcError(null)
    setCalcResult(null)
    try {
      const result = await api.calculate({
        country: calcCountry,
        shippingType: calcType,
        weightKg: parseFloat(calcWeight),
        volumeCBM: parseFloat(calcVolume),
      })
      setCalcResult(result)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setCalcError(msg ?? 'Calculation failed')
    } finally {
      setCalcLoading(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-red-400 text-center">{error}</div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Shipping Rates</h1>
          <p className="text-gray-400 text-sm mt-1">Per-country, per-type rate configuration for China → Destination</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setCalcOpen((o) => !o); setCalcResult(null); setCalcError(null) }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
          >
            <Calculator className="w-4 h-4" />
            Calculator
          </button>
          {isAdmin && (
            <button
              onClick={() => openAdd()}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Rate
            </button>
          )}
        </div>
      </div>

      {/* Calculator Panel */}
      {calcOpen && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-violet-400" />
            Shipping Cost Calculator
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Country</label>
              <input
                value={calcCountry}
                onChange={(e) => setCalcCountry(e.target.value)}
                list="calc-countries"
                placeholder="e.g. South Africa"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
              />
              <datalist id="calc-countries">
                {countries.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Shipping Type</label>
              <select
                value={calcType}
                onChange={(e) => setCalcType(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
              >
                {SHIPPING_TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Weight (kg)</label>
              <input
                type="number"
                value={calcWeight}
                onChange={(e) => setCalcWeight(e.target.value)}
                placeholder="0.00"
                min={0}
                step="0.001"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Volume (CBM)</label>
              <input
                type="number"
                value={calcVolume}
                onChange={(e) => setCalcVolume(e.target.value)}
                placeholder="0.000"
                min={0}
                step="0.001"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleCalculate}
              disabled={calcLoading}
              className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-sm transition-colors"
            >
              {calcLoading ? 'Calculating…' : 'Calculate'}
            </button>
            {calcError && <p className="text-red-400 text-sm">{calcError}</p>}
          </div>
          {calcResult && (
            <div className="bg-gray-900 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLOURS[calcResult.shippingType]}`}>
                  {TYPE_LABELS[calcResult.shippingType]}
                </span>
                <span className="text-gray-300 text-sm">{calcResult.country}</span>
                <span className="text-gray-500 text-xs">· {calcResult.estimatedTransitDays} days transit</span>
                {calcResult.minimumApplied && (
                  <span className="text-xs bg-yellow-900/40 text-yellow-300 border border-yellow-700 px-2 py-0.5 rounded">
                    Minimum Applied
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">Base Cost</p>
                  <p className="text-white font-medium">¥{calcResult.baseCostCNY.toFixed(2)}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">+ Surcharge</p>
                  <p className="text-white font-medium">¥{calcResult.withSurchargeCNY.toFixed(2)}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-gray-400 text-xs mb-1">+ Duties/VAT</p>
                  <p className="text-white font-medium">¥{calcResult.withDutiesCNY.toFixed(2)}</p>
                </div>
                <div className="bg-violet-900/40 border border-violet-700 rounded-lg p-3">
                  <p className="text-violet-300 text-xs mb-1">Total ZAR</p>
                  <p className="text-white font-bold text-lg">R{calcResult.totalZAR.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {countries.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg mb-2">No shipping rates configured yet</p>
          {isAdmin && (
            <button
              onClick={() => openAdd()}
              className="text-violet-400 hover:text-violet-300 text-sm underline"
            >
              Add your first rate
            </button>
          )}
        </div>
      )}

      {/* Rates grouped by country */}
      {countries.map((country) => {
        const countryRates = grouped[country]
        const isCollapsed = collapsed[country]
        return (
          <div key={country} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            {/* Country header */}
            <div
              className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-750 select-none"
              onClick={() => setCollapsed((c) => ({ ...c, [country]: !c[country] }))}
            >
              <div className="flex items-center gap-3">
                {isCollapsed ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                <h2 className="text-white font-semibold text-base">{country}</h2>
                <span className="text-xs text-gray-500">{countryRates.length} rate{countryRates.length !== 1 ? 's' : ''}</span>
              </div>
              {isAdmin && (
                <button
                  onClick={(e) => { e.stopPropagation(); openAdd(country) }}
                  className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 px-2 py-1 rounded hover:bg-gray-700 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add type
                </button>
              )}
            </div>

            {/* Rates table */}
            {!isCollapsed && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-gray-700 bg-gray-900/50">
                      <th className="text-left px-5 py-3 text-xs text-gray-400 font-medium">Type</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">Rate/kg (¥)</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">Rate/CBM (¥)</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">Fuel %</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">Duty %</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">VAT %</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">Handling (R)</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">Min (R)</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">Rate ¥→R</th>
                      <th className="text-right px-4 py-3 text-xs text-gray-400 font-medium">Days</th>
                      <th className="text-center px-4 py-3 text-xs text-gray-400 font-medium">Active</th>
                      {isAdmin && <th className="px-4 py-3" />}
                    </tr>
                  </thead>
                  <tbody>
                    {countryRates.map((r) => (
                      <tr key={r.id} className="border-t border-gray-700/50 hover:bg-gray-700/20 transition-colors">
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLOURS[r.shippingType] ?? 'bg-gray-700 text-gray-300'}`}>
                            {TYPE_LABELS[r.shippingType] ?? r.shippingType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-200 font-mono">{r.ratePerKg.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-gray-200 font-mono">{r.ratePerCbm.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-gray-200 font-mono">{r.fuelSurchargePercent.toFixed(1)}%</td>
                        <td className="px-4 py-3 text-right text-gray-200 font-mono">
                          {r.shippingType.endsWith('DDP') ? `${r.dutyRatePercent.toFixed(1)}%` : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-200 font-mono">
                          {r.shippingType.endsWith('DDP') ? `${r.vatRatePercent.toFixed(1)}%` : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-200 font-mono">R{r.handlingFeeZAR.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-gray-200 font-mono">R{r.minimumChargeZAR.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-gray-200 font-mono">{r.exchangeRateCNYToZAR.toFixed(4)}</td>
                        <td className="px-4 py-3 text-right text-gray-200 font-mono">{r.estimatedTransitDays}d</td>
                        <td className="px-4 py-3 text-center">
                          {r.isActive
                            ? <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto" />
                            : <XCircle className="w-4 h-4 text-gray-600 mx-auto" />}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                onClick={() => openEdit(r)}
                                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingId(r.id)}
                                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-white">
                {editingId !== null ? 'Edit Shipping Rate' : 'New Shipping Rate'}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white text-xl leading-none"
              >×</button>
            </div>

            <div className="p-6 space-y-5">
              {/* Country + Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Country *</label>
                  <input
                    value={form.country}
                    onChange={(e) => setField('country', e.target.value)}
                    list="modal-countries"
                    placeholder="e.g. South Africa"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                  <datalist id="modal-countries">
                    {countries.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Shipping Type *</label>
                  <select
                    value={form.shippingType}
                    onChange={(e) => setField('shippingType', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  >
                    {SHIPPING_TYPES.map((t) => (
                      <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rates */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Base Rates (CNY)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Rate per kg (¥)</label>
                    <input
                      type="number"
                      value={form.ratePerKg}
                      onChange={(e) => setField('ratePerKg', parseFloat(e.target.value) || 0)}
                      min={0}
                      step="0.01"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Rate per CBM (¥)</label>
                    <input
                      type="number"
                      value={form.ratePerCbm}
                      onChange={(e) => setField('ratePerCbm', parseFloat(e.target.value) || 0)}
                      min={0}
                      step="0.01"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
              </div>

              {/* Surcharge + Duties */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Surcharges &amp; Duties</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Fuel Surcharge %</label>
                    <input
                      type="number"
                      value={form.fuelSurchargePercent}
                      onChange={(e) => setField('fuelSurchargePercent', parseFloat(e.target.value) || 0)}
                      min={0}
                      step="0.1"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Duty Rate %{' '}
                      {!form.shippingType.endsWith('DDP') && <span className="text-gray-600">(DDU — not applied)</span>}
                    </label>
                    <input
                      type="number"
                      value={form.dutyRatePercent}
                      onChange={(e) => setField('dutyRatePercent', parseFloat(e.target.value) || 0)}
                      min={0}
                      step="0.1"
                      disabled={!form.shippingType.endsWith('DDP')}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 disabled:opacity-40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      VAT Rate %{' '}
                      {!form.shippingType.endsWith('DDP') && <span className="text-gray-600">(DDU — not applied)</span>}
                    </label>
                    <input
                      type="number"
                      value={form.vatRatePercent}
                      onChange={(e) => setField('vatRatePercent', parseFloat(e.target.value) || 0)}
                      min={0}
                      step="0.1"
                      disabled={!form.shippingType.endsWith('DDP')}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 disabled:opacity-40"
                    />
                  </div>
                </div>
              </div>

              {/* ZAR fees */}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">ZAR Fees &amp; Exchange</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Handling Fee (R)</label>
                    <input
                      type="number"
                      value={form.handlingFeeZAR}
                      onChange={(e) => setField('handlingFeeZAR', parseFloat(e.target.value) || 0)}
                      min={0}
                      step="0.01"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Minimum Charge (R)</label>
                    <input
                      type="number"
                      value={form.minimumChargeZAR}
                      onChange={(e) => setField('minimumChargeZAR', parseFloat(e.target.value) || 0)}
                      min={0}
                      step="0.01"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">CNY → ZAR Rate</label>
                    <input
                      type="number"
                      value={form.exchangeRateCNYToZAR}
                      onChange={(e) => setField('exchangeRateCNYToZAR', parseFloat(e.target.value) || 0)}
                      min={0}
                      step="0.0001"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
              </div>

              {/* Transit + Active */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Estimated Transit (days)</label>
                  <input
                    type="number"
                    value={form.estimatedTransitDays}
                    onChange={(e) => setField('estimatedTransitDays', parseInt(e.target.value) || 0)}
                    min={0}
                    step="1"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setField('isActive', e.target.checked)}
                      className="w-4 h-4 accent-violet-500"
                    />
                    <span className="text-sm text-gray-300">Active</span>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Notes (optional)</label>
                <textarea
                  value={form.notes ?? ''}
                  onChange={(e) => setField('notes', e.target.value || null)}
                  rows={2}
                  placeholder="Any additional notes about this rate…"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 resize-none"
                />
              </div>

              {/* Formula preview */}
              <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-3 text-xs text-gray-500 font-mono leading-relaxed">
                <p className="text-gray-400 font-sans font-semibold text-xs mb-1">Formula</p>
                <p>base = weightKg × {form.ratePerKg} + volumeCBM × {form.ratePerCbm}</p>
                <p>surcharge = base × (1 + {form.fuelSurchargePercent}/100)</p>
                {form.shippingType.endsWith('DDP') ? (
                  <p>duties = surcharge × (1 + {form.dutyRatePercent}/100) × (1 + {form.vatRatePercent}/100)</p>
                ) : (
                  <p className="text-gray-600">duties = surcharge (DDU — buyer pays duties)</p>
                )}
                <p>raw = duties × {form.exchangeRateCNYToZAR} + {form.handlingFeeZAR}</p>
                <p>total = CEILING(MAX(raw, {form.minimumChargeZAR}))</p>
              </div>

              {formError && <p className="text-red-400 text-sm">{formError}</p>}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {saving ? 'Saving…' : editingId !== null ? 'Update Rate' : 'Create Rate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deletingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-white font-semibold mb-2">Delete Shipping Rate</h3>
            <p className="text-gray-400 text-sm mb-5">This will permanently remove this rate. Are you sure?</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-4 py-2 text-sm bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
