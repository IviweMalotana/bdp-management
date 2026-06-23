import { useCallback, useEffect, useRef, useState } from 'react'
import { Upload, Loader2, Check, AlertCircle, Search, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'
import { shipping as shippingApi } from '../../services/api'
import { useAuthStore } from '../../store/authStore'

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

const btn =(variant: 'primary' | 'secondary') =>
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

  // ── Pricing formula values (fixed; loaded read-only for the Sale ZAR preview) ─
  const [pricingForm, setPricingForm] = useState({ bufferCNY: '', profitCNY: '', cnyToZarRate: '' })

  // ── Section 3: Products table ──────────────────────────────────────────────
  const [products, setProducts] = useState<ProductsPage | null>(null)
  const [productsLoading, setProductsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50

  // ── AI Image Generation (NEW) ──────────────────────────────────────────────

  // ── Load the fixed pricing-formula values (used only for the Sale ZAR preview)
  useEffect(() => {
    shippingApi.getSettings()
      .then((s) => {
        setPricingForm({
          bufferCNY:    String(s.bufferCNY ?? 3),
          profitCNY:    String(s.profitCNY ?? 1),
          cnyToZarRate: String(s.cnyToZarRate),
        })
      })
      .catch(() => { /* preview falls back to defaults */ })
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

  // ── Search ─────────────────────────────────────────────────────────────────
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchProducts(1, search)
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
        <p className="text-sm text-gray-400 mt-0.5">Import the product catalogue CSV and browse all SKUs. Sale prices are derived automatically from the fixed pricing formula.</p>
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
            <button
              onClick={handleImportSheet}
              disabled={sheetImporting || importing}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {sheetImporting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {sheetImporting ? 'Importing from Sheet…' : 'Import from Google Sheet'}
            </button>
          )}
        </div>

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

      {/* ── Section 2: Products Table ─────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold text-white">
              Products {products ? <span className="text-gray-400 font-normal">({products.total})</span> : null}
            </p>
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
