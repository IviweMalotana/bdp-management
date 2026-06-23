import { useEffect, useState } from 'react'
import { shipping as settingsApi } from '../services/api'
import type { ShippingSettings, ShippingQuoteOption } from '../types'
import { Settings, Loader2, Check, AlertCircle, RefreshCw, TrendingUp } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function ShippingSettingsPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'Admin')
  const [settings, setSettings] = useState<ShippingSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState({ cnyPerCbm: '', cnyPerKg: '', cnyToZarRate: '' })

  // ── Margin & Profit (live YunExpress rates, same source as checkout) ─────────
  const [mCountry, setMCountry]   = useState('ZA')
  const [mQty, setMQty]           = useState('100')
  const [mRealKg, setMRealKg]     = useState('0.08')   // true weight/unit → YOUR cost
  const [mBillingKg, setMBillingKg] = useState('0.25')  // billed weight/unit → CUSTOMER charge (checkout uses 0.25)
  const [mCost, setMCost]         = useState('11.23')  // landed product cost/unit (R)
  const [mSale, setMSale]         = useState('13.63')  // product sale/unit (R)
  const [mPsPct, setMPsPct]       = useState('2.9')
  const [mPsFixed, setMPsFixed]   = useState('1')
  const [chargedOpts, setChargedOpts] = useState<ShippingQuoteOption[]>([])
  const [costOpts, setCostOpts]   = useState<ShippingQuoteOption[]>([])
  const [mLoading, setMLoading]   = useState(false)
  const [mErr, setMErr]           = useState<string | null>(null)

  const mNum = {
    qty: parseFloat(mQty) || 0,
    realKg: parseFloat(mRealKg) || 0,
    billingKg: parseFloat(mBillingKg) || 0,
    cost: parseFloat(mCost) || 0,
    sale: parseFloat(mSale) || 0,
    psPct: parseFloat(mPsPct) || 0,
    psFixed: parseFloat(mPsFixed) || 0,
  }

  // Fetch live rates at both weights whenever the shipment inputs change.
  useEffect(() => {
    const { qty, realKg, billingKg } = mNum
    if (qty <= 0 || realKg <= 0 || billingKg <= 0 || !mCountry.trim()) return
    let cancelled = false
    setMLoading(true); setMErr(null)
    Promise.all([
      settingsApi.options(mCountry.trim().toUpperCase(), billingKg * qty * 1000),
      settingsApi.options(mCountry.trim().toUpperCase(), realKg * qty * 1000),
    ])
      .then(([charged, cost]) => { if (!cancelled) { setChargedOpts(charged); setCostOpts(cost) } })
      .catch(() => { if (!cancelled) setMErr('Could not load live shipping rates for that country.') })
      .finally(() => { if (!cancelled) setMLoading(false) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mCountry, mQty, mRealKg, mBillingKg])

  // One row per option the CUSTOMER would be offered (priced at billing weight),
  // costed against the same option at the REAL weight. Customs excluded (buyer pays).
  const marginRows = chargedOpts.map((c) => {
    const cost = costOpts.find((x) => x.code === c.code)
    const shipCharged = c.priceZAR
    const shipCost = cost?.priceZAR ?? null
    const shipMargin = shipCost != null ? shipCharged - shipCost : null
    const { qty, cost: cPer, sale: sPer, psPct, psFixed } = mNum
    const totalSale = sPer * qty + shipCharged
    const totalCost = shipCost != null ? cPer * qty + shipCost : null
    const grossProfit = totalCost != null ? totalSale - totalCost : null
    const paystack = totalSale * (psPct / 100) + psFixed
    const netProfit = grossProfit != null ? grossProfit - paystack : null
    const netMargin = netProfit != null && totalSale > 0 ? (netProfit / totalSale) * 100 : null
    return { c, shipCost, shipCharged, shipMargin, totalCost, totalSale, grossProfit, paystack, netProfit, netMargin }
  })

  // Live preview
  const cnyPerCbm = parseFloat(form.cnyPerCbm) || 0
  const cnyPerKg  = parseFloat(form.cnyPerKg)  || 0
  const cnyToZar  = parseFloat(form.cnyToZarRate) || 0

  // Billable weight per unit is fixed — see ShippingCalculator.FixedUnitWeightKg on the API.
  const FIXED_UNIT_KG = 0.25

  const previewExamples = [
    { label: 'Serum 30ml',   cbm: 0.000000192, kg: FIXED_UNIT_KG },
    { label: 'Serum 40ml',   cbm: 0.000000224, kg: FIXED_UNIT_KG },
    { label: 'Pump/Spray',   cbm: 0.000000224, kg: FIXED_UNIT_KG },
    { label: 'Jar ≤30ml',    cbm: 0.000000180, kg: FIXED_UNIT_KG },
    { label: 'Jar >30ml',    cbm: 0.000000294, kg: FIXED_UNIT_KG },
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
            <p className="text-xs text-gray-500 mb-1">Formula: ((CBM × ¥/CBM) + (kg × ¥/kg)) × CNY→ZAR</p>
            <p className="text-xs text-gray-600 mb-3">Billable weight is fixed at {FIXED_UNIT_KG} kg per unit for every product.</p>
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

          {/* ── Margin & Profit — live YunExpress rates, all real shipping options ── */}
          <div className="bg-gray-900 border border-emerald-800/50 rounded-xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <p className="text-sm font-semibold text-white flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-400" />
                Margin &amp; Profit — live shipping options (YunExpress)
              </p>
              <p className="text-xs text-gray-500 max-w-md text-right">
                Same rates the storefront charges. <span className="text-gray-300">Cost</span> = rate at the real weight; <span className="text-gray-300">charged</span> = rate at the billing weight (checkout uses 0.25 kg/unit). Customs excluded — buyer clears their own.
              </p>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([
                ['Country (ISO)', mCountry, setMCountry, 'text', undefined],
                ['Quantity', mQty, setMQty, 'number', '1'],
                ['Real kg / unit (cost)', mRealKg, setMRealKg, 'number', '0.001'],
                ['Billing kg / unit (charge)', mBillingKg, setMBillingKg, 'number', '0.01'],
                ['Product cost / unit (R)', mCost, setMCost, 'number', '0.01'],
                ['Product sale / unit (R)', mSale, setMSale, 'number', '0.01'],
                ['Paystack %', mPsPct, setMPsPct, 'number', '0.1'],
                ['Paystack fixed (R)', mPsFixed, setMPsFixed, 'number', '0.5'],
              ] as [string, string, (v: string) => void, string, string | undefined][]).map(([label, val, setter, type, step]) => (
                <div key={label}>
                  <label className={lbl}>{label}</label>
                  <input type={type} step={step} min={type === 'number' ? 0 : undefined} value={val}
                    onChange={(e) => setter(e.target.value)} className={inp} />
                </div>
              ))}
            </div>

            {mErr && <p className="text-red-400 text-sm">{mErr}</p>}
            {mLoading && <p className="text-gray-500 text-sm flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Fetching live rates…</p>}

            {!mLoading && !mErr && marginRows.length === 0 && (
              <p className="text-sm text-gray-500">No shipping options returned for {mCountry.toUpperCase()} at this weight.</p>
            )}

            {marginRows.length > 0 && (
              <div className="overflow-x-auto border border-gray-800 rounded-lg">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-800/50 border-b border-gray-800 text-xs text-gray-400">
                      {['Option', 'Transit', 'Ship cost', 'Ship charged', 'Ship margin', 'Total cost', 'Total sale', 'Gross profit', 'Paystack', 'Net profit', 'Net %'].map((h) => (
                        <th key={h} className="px-3 py-2.5 text-right first:text-left font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {marginRows.map(({ c, shipCost, shipCharged, shipMargin, totalCost, totalSale, grossProfit, paystack, netProfit, netMargin }) => (
                      <tr key={c.code} className="hover:bg-gray-800/40">
                        <td className="px-3 py-2.5">
                          <span className="text-gray-200">{c.name}</span>
                          <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${c.icon === 'sea' ? 'bg-teal-900/40 text-teal-300' : 'bg-blue-900/40 text-blue-300'}`}>{c.icon}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-gray-400">{c.transitDaysMin}–{c.transitDaysMax}d</td>
                        <td className="px-3 py-2.5 text-right text-gray-300">{shipCost != null ? `R${shipCost.toFixed(2)}` : '—'}</td>
                        <td className="px-3 py-2.5 text-right text-gray-300">R{shipCharged.toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right text-emerald-400">{shipMargin != null ? `R${shipMargin.toFixed(2)}` : '—'}</td>
                        <td className="px-3 py-2.5 text-right text-gray-400">{totalCost != null ? `R${totalCost.toFixed(2)}` : '—'}</td>
                        <td className="px-3 py-2.5 text-right text-gray-200">R{totalSale.toFixed(2)}</td>
                        <td className="px-3 py-2.5 text-right text-gray-200">{grossProfit != null ? `R${grossProfit.toFixed(2)}` : '—'}</td>
                        <td className="px-3 py-2.5 text-right text-red-300">−R{paystack.toFixed(2)}</td>
                        <td className={`px-3 py-2.5 text-right font-semibold ${netProfit == null ? 'text-gray-500' : netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{netProfit != null ? `R${netProfit.toFixed(2)}` : '—'}</td>
                        <td className="px-3 py-2.5 text-right text-gray-300">{netMargin != null ? `${netMargin.toFixed(1)}%` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-gray-600">
              Rows are the options a customer would actually be offered for {mCountry.toUpperCase()} at the billing weight. A “—” cost means that option isn’t quoted at the real weight (e.g. sea needs ≥3 kg). Net = total sale − total cost − Paystack.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
