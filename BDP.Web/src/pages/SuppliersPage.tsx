import { useEffect, useState, useRef } from 'react'
import { suppliers as suppliersApi, customisation as customisationApi } from '../services/api'
import type { Supplier, CustomisationOption } from '../types'
import {
  Factory, Plus, Pencil, Trash2, Search, X, Check,
  ChevronRight, Loader2, AlertCircle, Tag,
} from 'lucide-react'

type OptionForm = {
  id?: number
  type: 'SilkScreen' | 'HotStamping'
  minQuantity: string
  totalPriceZAR: string
  notes: string
}

const EMPTY_OPTION: OptionForm = { type: 'SilkScreen', minQuantity: '', totalPriceZAR: '', notes: '' }

type SupplierForm = {
  name: string
  country: string
  contactEmail: string
  contactPhone: string
  website: string
  leadTimeDays: string
  minOrderQuantity: string
  offersCustomisation: boolean
  notes: string
}

const EMPTY_FORM: SupplierForm = {
  name: '', country: 'China', contactEmail: '', contactPhone: '',
  website: '', leadTimeDays: '45', minOrderQuantity: '10',
  offersCustomisation: false, notes: '',
}

export default function SuppliersPage() {
  const [list, setList]         = useState<Supplier[]>([])
  const [filtered, setFiltered] = useState<Supplier[]>([])
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const [panelOpen, setPanelOpen]       = useState(false)
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null)
  const [form, setForm]                 = useState<SupplierForm>(EMPTY_FORM)

  // customisation options for the currently-edited supplier
  const [options, setOptions]           = useState<CustomisationOption[]>([])
  const [optionForm, setOptionForm]     = useState<OptionForm | null>(null)
  const [optionSaving, setOptionSaving] = useState(false)

  const panelRef = useRef<HTMLDivElement>(null)

  const load = () => {
    setLoading(true)
    suppliersApi.getAll()
      .then((data) => { setList(data); setFiltered(data) })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(q ? list.filter((s) =>
      s.name.toLowerCase().includes(q) || s.country.toLowerCase().includes(q)
    ) : list)
  }, [search, list])

  const openAdd = () => {
    setEditSupplier(null)
    setForm(EMPTY_FORM)
    setOptions([])
    setOptionForm(null)
    setPanelOpen(true)
  }

  const openEdit = (s: Supplier) => {
    setEditSupplier(s)
    setForm({
      name: s.name,
      country: s.country,
      contactEmail: s.contactEmail ?? '',
      contactPhone: s.contactPhone ?? '',
      website: s.website ?? '',
      leadTimeDays: String(s.leadTimeDays ?? 0),
      minOrderQuantity: String(s.minOrderQuantity ?? 0),
      offersCustomisation: s.offersCustomisation ?? false,
      notes: s.notes ?? '',
    })
    setOptionForm(null)
    setPanelOpen(true)
    // Load customisation options
    customisationApi.getBySupplier(s.id)
      .then(setOptions)
      .catch(() => setOptions([]))
  }

  const closePanel = () => {
    setPanelOpen(false)
    setOptionForm(null)
    setTimeout(() => { setEditSupplier(null); setOptions([]) }, 300)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    setError(null)
    const payload = {
      name: form.name.trim(),
      country: form.country,
      contactEmail: form.contactEmail || null,
      contactPhone: form.contactPhone || null,
      website: form.website || null,
      leadTimeDays: parseInt(form.leadTimeDays) || 0,
      minOrderQuantity: parseInt(form.minOrderQuantity) || 0,
      offersCustomisation: form.offersCustomisation,
      notes: form.notes || null,
    }
    try {
      if (editSupplier) {
        await suppliersApi.update(editSupplier.id, payload)
      } else {
        await suppliersApi.create(payload)
      }
      closePanel()
      load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Failed to save supplier.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (s: Supplier) => {
    if (!confirm(`Delete "${s.name}"? This cannot be undone.`)) return
    try {
      await suppliersApi.delete(s.id)
      load()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(msg ?? 'Cannot delete supplier.')
    }
  }

  // ── Option CRUD ──────────────────────────────────────────────────────────

  const openOptionAdd = () => setOptionForm({ ...EMPTY_OPTION })
  const openOptionEdit = (o: CustomisationOption) => setOptionForm({
    id: o.id, type: o.type, minQuantity: String(o.minQuantity),
    totalPriceZAR: String(o.totalPriceZAR), notes: o.notes ?? '',
  })

  const saveOption = async () => {
    if (!optionForm || !editSupplier) return
    setOptionSaving(true)
    const payload = {
      supplierId: editSupplier.id,
      type: optionForm.type,
      minQuantity: parseInt(optionForm.minQuantity) || 0,
      totalPriceZAR: parseFloat(optionForm.totalPriceZAR) || 0,
      notes: optionForm.notes || undefined,
    }
    try {
      if (optionForm.id) {
        await customisationApi.update(optionForm.id, payload)
      } else {
        await customisationApi.create(payload)
      }
      const fresh = await customisationApi.getBySupplier(editSupplier.id)
      setOptions(fresh)
      setOptionForm(null)
    } finally {
      setOptionSaving(false)
    }
  }

  const deleteOption = async (id: number) => {
    if (!confirm('Delete this customisation tier?')) return
    await customisationApi.delete(id)
    if (editSupplier) {
      customisationApi.getBySupplier(editSupplier.id).then(setOptions)
    }
  }

  const inp = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
  const lbl = 'block text-xs text-gray-400 mb-1'

  const silkOptions  = options.filter((o) => o.type === 'SilkScreen')
  const hotOptions   = options.filter((o) => o.type === 'HotStamping')

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Factory size={20} className="text-indigo-400" />
            Suppliers
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">{list.length} supplier{list.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={15} />
          Add Supplier
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search suppliers…"
          className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={24} className="animate-spin text-indigo-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500">
            <Factory size={28} className="mb-2 opacity-40" />
            <p className="text-sm">{search ? 'No suppliers match your search.' : 'No suppliers yet.'}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                {['Name', 'Country', 'Offers Logo', 'Products', 'Lead Time', 'Min Order', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => openEdit(s)}
                  className="hover:bg-gray-800/60 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{s.name}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{s.country}</td>
                  <td className="px-4 py-3">
                    {s.offersCustomisation ? (
                      <span className="flex items-center gap-1 text-emerald-400 text-xs font-medium">
                        <Check size={12} /> Yes
                      </span>
                    ) : (
                      <span className="text-gray-500 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-300">{s.productCount}</td>
                  <td className="px-4 py-3 text-gray-300">{s.leadTimeDays}d</td>
                  <td className="px-4 py-3 text-gray-300">{(s.minOrderQuantity ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => openEdit(s)}
                        className="p-1.5 text-gray-500 hover:text-indigo-400 hover:bg-gray-800 rounded transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(s)}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                      <ChevronRight size={14} className="text-gray-600" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Slide-in panel ── */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${panelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={closePanel}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed inset-y-0 right-0 z-50 w-[520px] bg-gray-900 border-l border-gray-800 flex flex-col transform transition-transform duration-300 ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
          <h2 className="text-base font-semibold text-white">
            {editSupplier ? 'Edit Supplier' : 'New Supplier'}
          </h2>
          <button onClick={closePanel} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Panel body (scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-red-300 text-sm">
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={lbl}>Supplier Name *</label>
              <input className={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Hongxin Pharmaceutical" />
            </div>
            <div>
              <label className={lbl}>Country</label>
              <input className={inp} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="China" />
            </div>
            <div>
              <label className={lbl}>Lead Time (days)</label>
              <input type="number" className={inp} value={form.leadTimeDays} onChange={(e) => setForm({ ...form, leadTimeDays: e.target.value })} />
            </div>
            <div>
              <label className={lbl}>Min Order Quantity</label>
              <input type="number" className={inp} value={form.minOrderQuantity} onChange={(e) => setForm({ ...form, minOrderQuantity: e.target.value })} />
            </div>
            <div>
              <label className={lbl}>Contact Email</label>
              <input type="email" className={inp} value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
            </div>
            <div>
              <label className={lbl}>Contact Phone</label>
              <input className={inp} value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Website</label>
              <input className={inp} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://..." />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Notes</label>
              <textarea rows={2} className={inp} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>

          {/* Offers Customisation toggle */}
          <div className="flex items-center gap-3 py-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, offersCustomisation: !form.offersCustomisation })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.offersCustomisation ? 'bg-indigo-600' : 'bg-gray-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.offersCustomisation ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-sm font-medium text-white">Offers Logo / Customisation</span>
          </div>

          {/* Customisation Options sub-section (only for existing suppliers) */}
          {editSupplier && (
            <div className="border border-gray-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-800/50 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <Tag size={14} className="text-indigo-400" />
                  <span className="text-sm font-medium text-white">Customisation Tiers</span>
                  <span className="text-xs text-gray-500">({options.length})</span>
                </div>
                <button
                  onClick={openOptionAdd}
                  className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <Plus size={13} />
                  Add Tier
                </button>
              </div>

              {/* Option form (inline) */}
              {optionForm && (
                <div className="px-4 py-3 bg-indigo-950/30 border-b border-gray-800 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className={lbl}>Type</label>
                      <select
                        className={inp}
                        value={optionForm.type}
                        onChange={(e) => setOptionForm({ ...optionForm, type: e.target.value as 'SilkScreen' | 'HotStamping' })}
                      >
                        <option value="SilkScreen">Silk Screen</option>
                        <option value="HotStamping">Hot Stamping</option>
                      </select>
                    </div>
                    <div>
                      <label className={lbl}>Min Quantity</label>
                      <input type="number" className={inp} value={optionForm.minQuantity} onChange={(e) => setOptionForm({ ...optionForm, minQuantity: e.target.value })} />
                    </div>
                    <div>
                      <label className={lbl}>Total Price ZAR</label>
                      <input type="number" className={inp} value={optionForm.totalPriceZAR} onChange={(e) => setOptionForm({ ...optionForm, totalPriceZAR: e.target.value })} />
                    </div>
                    <div className="col-span-3">
                      <label className={lbl}>Notes (optional)</label>
                      <input className={inp} value={optionForm.notes} onChange={(e) => setOptionForm({ ...optionForm, notes: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveOption}
                      disabled={optionSaving}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      {optionSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      Save Tier
                    </button>
                    <button onClick={() => setOptionForm(null)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Options list */}
              {options.length === 0 ? (
                <p className="px-4 py-4 text-xs text-gray-500 text-center">No customisation tiers yet.</p>
              ) : (
                <div>
                  {(['SilkScreen', 'HotStamping'] as const).map((type) => {
                    const group = type === 'SilkScreen' ? silkOptions : hotOptions
                    if (group.length === 0) return null
                    return (
                      <div key={type}>
                        <div className="px-4 py-1.5 bg-gray-800/30 border-y border-gray-800">
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            {type === 'SilkScreen' ? 'Silk Screen' : 'Hot Stamping'}
                          </span>
                        </div>
                        {group.map((o) => (
                          <div key={o.id} className="flex items-center px-4 py-2 border-b border-gray-800/50 hover:bg-gray-800/30 group">
                            <div className="flex-1 flex items-center gap-4 text-sm">
                              <span className="text-gray-300 font-medium w-24">{(o.minQuantity ?? 0).toLocaleString()} units</span>
                              <span className="text-emerald-400">R{(o.totalPriceZAR ?? 0).toLocaleString()}</span>
                              {o.notes && <span className="text-gray-500 text-xs truncate">{o.notes}</span>}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openOptionEdit(o)} className="p-1 text-gray-500 hover:text-indigo-400 rounded">
                                <Pencil size={12} />
                              </button>
                              <button onClick={() => deleteOption(o.id)} className="p-1 text-gray-500 hover:text-red-400 rounded">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Panel footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800 flex-shrink-0">
          <button onClick={closePanel} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {editSupplier ? 'Save Changes' : 'Create Supplier'}
          </button>
        </div>
      </div>
    </div>
  )
}
