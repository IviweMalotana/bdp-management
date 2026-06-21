import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload, Loader2, Check, AlertCircle, Search, ChevronLeft, ChevronRight, BookOpen, Image as ImageIcon, Trash2 } from 'lucide-react'
import { shipping as shippingApi, catalogue, type GenerateImagesResult } from '../../services/api'
import { useAuthStore } from '../../store/authStore'
import type { ShippingSettings } from '../../types'

const API_BASE = (import.meta.env.VITE_API_URL || '/api') as string

// ── Types ────────────────────────────────────────────────────────────────────

interface ImportResult {
  added: number
  updated: number
  unchanged: number
  imagesSet?: number
  imagesCleared?: number
  productsDeleted?: number
  variantsDeleted?: number
  errors: string[]
  success: boolean
}

interface CatalogueVariant {
  id: number
  skuId: string | null
  sku: string
  specificationSize: string | null
  baseBodyColor: string | null
  lidCapColor: string | null
  unitPriceCNY: number
  supplierMoq: number
  isActive: boolean
}

interface CatalogueProduct {
  id: number
  name: string
  slug: string
  category: string
  supplierItemNumber: string | null
  productType: string | null
  supplierName: string | null
  variantCount: number
  variants: CatalogueVariant[]
}

interface ProductsPage {
  total: number
  page: number
  pageSize: number
  items: CatalogueProduct[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const inp = 'w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
const lbl = 'block text-xs font-medium text-gray-400 mb-1'
const btn = (variant: 'primary' | 'secondary') =>
  variant === 'primary'
    ? 'flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors'
    : 'flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors'

// ── Main component ───────────────────────────────────────────────────────────

export default function CataloguePage() {
  const token = useAuthStore((s) => s.token)
  const isAdmin = useAuthStore((s) => s.user?.role === 'Admin')

  // ── Section 1: Import ──────────────────────────────────────────────────────
  const [dragging, setDragging] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Section 2: Pricing Settings ────────────────────────────────────────────
  const [settings, setSettings] = useState<ShippingSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsSuccess, setSettingsSuccess] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [pricingForm, setPricingForm] = useState({ bufferCNY: '', profitCNY: '', cnyToZarRate: '' })

  // ── Section 3: Products table ──────────────────────────────────────────────
  const [products, setProducts] = useState<ProductsPage | null>(null)
  const [productsLoading, setProductsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50

  // ── AI Image Generation (NEW) ──────────────────────────────────────────────
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationResult, setGenerationResult] = useState<GenerateImagesResult | null>(null)
  const [generationError, setGenerationError] = useState<string | null>(null)

  // ── Load settings ──────────────────────────────────────────────────────────
  useEffect(() => {
    shippingApi.getSettings()
      .then((s) => {
        setSettings(s)
        setPricingForm({
          bufferCNY:    String(s.bufferCNY ?? 3),
          profitCNY:    String(s.profitCNY ?? 1),
          cnyToZarRate: String(s.cnyToZarRate),
        })
      })
      .finally(() => setSettingsLoading(false))
  }, [])

  // ── Load products table ────────────────────────────────────────────────────
  const fetchProducts = useCallback((p: number, q: string) => {
    setProductsLoading(true)
    const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) })
    if (q) params.set('search', q)
    fetch(`${API_BASE}/admin/catalogue/products?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setProducts)
      .catch(() => setProducts(null))
      .finally(() => setProductsLoading(false))
  }, [token])

  useEffect(() => { fetchProducts(page, search) }, [page])

  // ── Wipe All Products ──────────────────────────────────────────────────────
  const [wiping, setWiping] = useState(false)
  const [wipeResult, setWipeResult] = useState<string | null>(null)

  const handleWipeAll = async () => {
    if (!isAdmin) return
    const confirmed = window.confirm(
      'This will DELETE every product, variant, image, and pricing tier. Order history is kept. This cannot be undone. Continue?'
    )
    if (!confirmed) return
    setWiping(true)
    setWipeResult(null)
    try {
      const data = await catalogue.wipeAll()
      setWipeResult(data.success ? `✓ ${data.message}` : `Error: ${data.message}`)
      fetchProducts(1, '')
      setPage(1)
      setSearch('')
    } catch (err: any) {
      setWipeResult(`Error: ${err?.response?.data?.message ?? 'Wipe failed.'}`)
    } finally {
      setWiping(false)
    }
  }

  // ── Import from Google Sheet ───────────────────────────────────────────────
  const [sheetImporting, setSheetImporting] = useState(false)

  const handleImportSheet = async () => {
    setSheetImporting(true)
    setImportResult(null)
    setImportError(null)
    try {
      const res = await fetch(`${API_BASE}/admin/catalogue/import-sheet`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) {
        setImportError(data.message ?? 'Import failed.')
      } else {
        setImportResult(data as ImportResult)
        fetchProducts(1, '')
        setPage(1)
        setSearch('')
      }
    } catch {
      setImportError('Network error. Please try again.')
    } finally {
      setSheetImporting(false)
    }
  }

  // ── CSV Import ─────────────────────────────────────────────────────────────
  const uploadFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setImportError('Only CSV files are accepted.')
      return
    }
    setImporting(true)
    setImportResult(null)
    setImportError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`${API_BASE}/admin/catalogue/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        setImportError(data.message ?? 'Import failed.')
      } else {
        setImportResult(data as ImportResult)
        // Refresh products table
        fetchProducts(1, '')
        setPage(1)
        setSearch('')
      }
    } catch {
      setImportError('Network error. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ''
  }

  // ── Save Pricing Settings ──────────────────────────────────────────────────
  const handleSaveSettings = async () => {
    setSettingsSaving(true)
    setSettingsError(null)
    setSettingsSuccess(false)
    try {
      const updated = await shippingApi.updateSettings({
        cnyPerCbm:    settings?.cnyPerCbm ?? 2000,
        cnyPerKg:     settings?.cnyPerKg ?? 10,
        cnyToZarRate: parseFloat(pricingForm.cnyToZarRate),
        bufferCNY:    parseFloat(pricingForm.bufferCNY),
        profitCNY:    parseFloat(pricingForm.profitCNY),
      })
      setSettings(updated)
      setSettingsSuccess(true)
      setTimeout(() => setSettingsSuccess(false), 3000)
    } catch {
      setSettingsError('Failed to save settings.')
    } finally {
      setSettingsSaving(false)
    }
  }

  // ── Search ─────────────────────────────────────────────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchProducts(1, search)
  }

  // ── AI Image Generation Handler ────────────────────────────────────────────
  const handleGenerateAiImages = async () => {
    if (!isAdmin) return

    setIsGenerating(true)
    setGenerationResult(null)
    setGenerationError(null)

    try {
      // For Phase 1: Generate for all products (onlyMissing = true is smarter long-term)
      const result = await catalogue.generateAiImages({ onlyMissing: true })
      setGenerationResult(result)

      // Refresh the products list in case new image links were saved
      fetchProducts(page, search)
    } catch (err: any) {
      setGenerationError(err?.response?.data?.message || 'Failed to start image generation.')
    } finally {
      setIsGenerating(false)
    }
  }

  const totalPages = products ? Math.ceil(products.total / PAGE_SIZE) : 1

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <BookOpen size={20} className="text-indigo-400" />
          Catalogue
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">Import the product catalogue CSV, configure pricing, and browse all SKUs.</p>
      </div>

      {/* ── Section 1: Import CSV ─────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Import Catalogue</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Pull directly from your Google Sheet, or upload a CSV manually below.
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleWipeAll}
                disabled={wiping || sheetImporting || importing}
                title="Delete every product, variant, image and pricing tier"
                className="flex items-center gap-2 px-4 py-2 bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {wiping ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {wiping ? 'Wiping…' : 'Wipe All Products'}
              </button>
              <button
                onClick={handleImportSheet}
                disabled={sheetImporting || importing || wiping}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {sheetImporting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {sheetImporting ? 'Importing from Sheet…' : 'Import from Google Sheet'}
              </button>
            </div>
          )}
        </div>

        {wipeResult && (
          <div className={`px-3 py-2 rounded-lg text-sm ${wipeResult.startsWith('✓') ? 'bg-green-900/20 border border-green-700 text-green-300' : 'bg-red-900/30 border border-red-700 text-red-300'}`}>
            {wipeResult}
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-lg py-12 cursor-pointer transition-colors ${
            dragging ? 'border-indigo-400 bg-indigo-900/10' : 'border-gray-700 hover:border-gray-500'
          }`}
        >
          {importing ? (
            <Loader2 size={32} className="animate-spin text-indigo-400" />
          ) : (
            <Upload size={32} className="text-gray-500" />
          )}
          <p className="text-sm text-gray-400">
            {importing ? 'Importing…' : 'Drag & drop a CSV file here, or click to browse'}
          </p>
          <p className="text-xs text-gray-600">.csv files only</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
            disabled={importing}
          />
        </div>

        {/* Import result */}
        {importError && (
          <div className="flex items-start gap-2 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-red-300 text-sm">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{importError}</span>
          </div>
        )}
        {importResult && (
          <div className={`border rounded-lg px-3 py-3 text-sm space-y-1 ${importResult.success ? 'bg-green-900/20 border-green-700' : 'bg-yellow-900/20 border-yellow-700'}`}>
            <div className="flex items-center gap-2 font-medium text-white">
              <Check size={14} className="text-green-400" />
              Import complete
            </div>
            <p className="text-gray-300">
              {importResult.added} added &nbsp;·&nbsp; {importResult.updated} updated &nbsp;·&nbsp; {importResult.unchanged} unchanged
            </p>
            <p className="text-gray-400 text-xs">
              {importResult.imagesSet ?? 0} images set &nbsp;·&nbsp; {importResult.imagesCleared ?? 0} cleared
              {(importResult.productsDeleted || importResult.variantsDeleted)
                ? <> &nbsp;·&nbsp; {importResult.productsDeleted ?? 0} products / {importResult.variantsDeleted ?? 0} variants removed (not in sheet)</>
                : null}
            </p>
            {importResult.errors.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {importResult.errors.map((e, i) => (
                  <li key={i} className="text-yellow-300 text-xs">⚠ {e}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* ── Section 2: Pricing Settings ───────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <p className="text-sm font-semibold text-white">Pricing Settings</p>
        <p className="text-xs text-gray-500">
          Formula: <span className="font-mono text-gray-400">(Unit Cost CNY + Buffer + Profit) × CNY→ZAR</span>
        </p>

        {settingsLoading ? (
          <Loader2 size={20} className="animate-spin text-indigo-500" />
        ) : (
          <>
            {settingsError && (
              <div className="flex items-center gap-2 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-red-300 text-sm">
                <AlertCircle size={14} /> {settingsError}
              </div>
            )}
            {settingsSuccess && (
              <div className="flex items-center gap-2 bg-green-900/30 border border-green-700 rounded-lg px-3 py-2 text-green-300 text-sm">
                <Check size={14} /> Settings saved.
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={lbl}>Buffer (CNY) — shipping &amp; fees per unit</label>
                <input
                  type="number" step="0.01" className={inp}
                  value={pricingForm.bufferCNY}
                  onChange={(e) => setPricingForm({ ...pricingForm, bufferCNY: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
              <div>
                <label className={lbl}>Profit (CNY) — margin per unit</label>
                <input
                  type="number" step="0.01" className={inp}
                  value={pricingForm.profitCNY}
                  onChange={(e) => setPricingForm({ ...pricingForm, profitCNY: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
              <div>
                <label className={lbl}>CNY → ZAR Rate</label>
                <input
                  type="number" step="0.0001" className={inp}
                  value={pricingForm.cnyToZarRate}
                  onChange={(e) => setPricingForm({ ...pricingForm, cnyToZarRate: e.target.value })}
                  disabled={!isAdmin}
                />
              </div>
            </div>
            {isAdmin && (
              <div className="flex justify-end">
                <button onClick={handleSaveSettings} disabled={settingsSaving} className={btn('primary')}>
                  {settingsSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Save
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Section 3: Products Table ─────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold text-white">
              Products {products ? <span className="text-gray-400 font-normal">({products.total})</span> : null}
            </p>

            {/* NEW: AI Image Generation Button */}
            {isAdmin && (
              <button
                onClick={handleGenerateAiImages}
                disabled={isGenerating}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white rounded-lg transition-colors"
                title="Generate consistent bottle/jar images using AI based on reference photos + color data. Results are uploaded to Google Drive."
              >
                {isGenerating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ImageIcon size={14} />
                )}
                {isGenerating ? 'Generating…' : 'Generate AI Images'}
              </button>
            )}
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search name or SKU…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-56"
              />
            </div>
            <button type="submit" className={btn('secondary')}>Search</button>
          </form>
        </div>

        {/* AI Image Generation Status (NEW) */}
        {(isGenerating || generationResult || generationError) && (
          <div className="bg-purple-900/20 border border-purple-700 rounded-lg p-4 text-sm space-y-2">
            <div className="flex items-center gap-2 font-medium text-purple-300">
              <ImageIcon size={16} />
              AI Image Generation
            </div>

            {isGenerating && (
              <div className="flex items-center gap-2 text-purple-200">
                <Loader2 size={16} className="animate-spin" />
                Generating product images from reference photos + color variants. This can take a while...
              </div>
            )}

            {generationError && (
              <div className="text-red-300 flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5" />
                {generationError}
              </div>
            )}

            {generationResult && (
              <div className="text-purple-100 space-y-1">
                <p>
                  <strong>{generationResult.generated}</strong> images generated · 
                  <strong> {generationResult.skipped}</strong> skipped · 
                  <strong> {generationResult.totalProcessed}</strong> processed
                </p>
                {generationResult.message && (
                  <p className="text-purple-300 text-xs">{generationResult.message}</p>
                )}
                {generationResult.errors.length > 0 && (
                  <div className="text-xs text-red-300 mt-1">
                    Errors: {generationResult.errors.slice(0, 3).join(' • ')}
                    {generationResult.errors.length > 3 && ` (+${generationResult.errors.length - 3} more)`}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {productsLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={24} className="animate-spin text-indigo-500" />
          </div>
        ) : products && products.items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['Name', 'Supplier Item No.', 'Size', 'Body Colour', 'Lid', 'Unit Cost CNY', 'Sale ZAR*', 'Supplier'].map((h) => (
                      <th key={h} className="pb-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pr-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {products.items.flatMap((p) =>
                    p.variants.length > 0
                      ? p.variants.map((v, vi) => (
                          <tr key={`${p.id}-${v.id}`} className="hover:bg-gray-800/40">
                            {vi === 0 ? (
                              <td className="py-2.5 pr-3 text-gray-200 font-medium align-top" rowSpan={p.variants.length}>
                                {p.name}
                              </td>
                            ) : null}
                            <td className="py-2.5 pr-3 font-mono text-xs text-gray-400">{p.supplierItemNumber ?? '—'}</td>
                            <td className="py-2.5 pr-3 text-gray-300">{v.specificationSize ?? '—'}</td>
                            <td className="py-2.5 pr-3 text-gray-300">{v.baseBodyColor ?? '—'}</td>
                            <td className="py-2.5 pr-3 text-gray-300">{v.lidCapColor ?? '—'}</td>
                            <td className="py-2.5 pr-3 text-emerald-400 font-mono text-xs">
                              ¥{v.unitPriceCNY.toFixed(2)}
                            </td>
                            <td className="py-2.5 pr-3 text-blue-400 font-mono text-xs">
                              {/* Approximate sale price using current form values */}
                              R{(
                                (v.unitPriceCNY + (parseFloat(pricingForm.bufferCNY) || 3) + (parseFloat(pricingForm.profitCNY) || 1))
                                * (parseFloat(pricingForm.cnyToZarRate) || 2.4)
                              ).toFixed(2)}
                            </td>
                            <td className="py-2.5 pr-3 text-gray-400">{p.supplierName ?? '—'}</td>
                          </tr>
                        ))
                      : [
                          <tr key={p.id} className="hover:bg-gray-800/40">
                            <td className="py-2.5 pr-3 text-gray-200 font-medium">{p.name}</td>
                            <td className="py-2.5 pr-3 font-mono text-xs text-gray-400">{p.supplierItemNumber ?? '—'}</td>
                            <td colSpan={5} className="py-2.5 pr-3 text-gray-600 text-xs italic">no variants</td>
                            <td className="py-2.5 pr-3 text-gray-400">{p.supplierName ?? '—'}</td>
                          </tr>,
                        ]
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-600">* Sale ZAR is a live preview based on the pricing settings above — not yet saved to the database.</p>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                <p className="text-xs text-gray-500">
                  Page {page} of {totalPages} &nbsp;·&nbsp; {products.total} products
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={btn('secondary')}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className={btn('secondary')}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500 py-8 text-center">
            No products found. Import a CSV to populate the catalogue.
          </p>
        )}
      </div>
    </div>
  )
}
