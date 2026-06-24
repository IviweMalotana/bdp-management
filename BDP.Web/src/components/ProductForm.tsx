import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  X, Loader2, ChevronRight, Check, Zap, Sparkles, Eye, SkipForward,
} from 'lucide-react'
import { products as productApi, suppliers as suppliersApi } from '../services/api'
import type { Product, Supplier, PricingCalculationResult, PricingTierCalculation } from '../types'

const CATEGORIES = ['Serum', 'Pump', 'Spray', 'Jar']
const TEXTURES   = ['Matte', 'Clear', 'Frosted']
const SIZES_ML   = ['5ml','10ml','15ml','20ml','30ml','50ml','60ml','100ml','120ml','150ml','200ml','250ml','300ml','500ml','1000ml']
const SIZES_G    = ['5g','10g','15g','20g','30g','50g','100g','150g','200g','250g','300g','500g']

const schema = z.object({
  name:                z.string().min(1, 'Required').max(200),
  category:            z.string().min(1, 'Required'),
  size:                z.string().min(1, 'Required'),
  bottleColour:        z.string().min(1, 'Required'),
  lidColour:           z.string().min(1, 'Required'),
  texture:             z.string().min(1, 'Required'),
  costCNY:             z.coerce.number().min(0),
  costWithShippingCNY: z.coerce.number().min(0),
  costPerUnitZAR:      z.coerce.number().min(0),
  supplierId:          z.coerce.number().int().min(1, 'Required'),
  link1688:            z.string().optional(),
  isActive:            z.boolean().default(true),
  weightKg:            z.coerce.number().min(0).default(0.10),
  lengthCm:            z.coerce.number().min(0).default(4),
  widthCm:             z.coerce.number().min(0).default(4),
  heightCm:            z.coerce.number().min(0).default(12),
})
type Fields = z.infer<typeof schema>

type Step = 'product' | 'pricing' | 'ai' | 'review'
const STEPS: Step[] = ['product', 'pricing', 'ai', 'review']
const STEP_LABELS = ['Details', 'Pricing', 'AI Content', 'Review']

function buildSKU(name: string, cat: string, sz: string, bc: string, lc: string, tx: string) {
  const slug = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
  return [slug(name), slug(cat), sz ? slug(sz) : '', slug(bc), slug(lc), slug(tx)]
    .filter(Boolean).join('-')
}

function apiError(e: unknown) {
  return (e as { response?: { data?: { message?: string } } })?.response?.data?.message
    ?? 'Something went wrong.'
}

const formatZAR = (n: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(n)

interface Props {
  product?: Product | null
  onClose: () => void
  onSaved: (p: Product) => void
}

export default function ProductForm({ product, onClose, onSaved }: Props) {
  const isEdit = !!product
  const [step, setStep] = useState<Step>('product')
  const [savedProduct, setSavedProduct] = useState<Product | null>(product ?? null)
  const [supplierList, setSupplierList] = useState<Supplier[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Step 2 — Pricing ────────────────────────────────────────────────────
  const [calcResult, setCalcResult] = useState<PricingCalculationResult | null>(null)
  const [overrides, setOverrides] = useState<Record<number, string>>({})
  const [calculating, setCalculating] = useState(false)
  const [savingTiers, setSavingTiers] = useState(false)

  // ── Step 3 — AI ─────────────────────────────────────────────────────────
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [generatingAi, setGeneratingAi] = useState(false)
  const [aiTitle, setAiTitle] = useState(product?.shopifyTitle ?? '')
  const [aiHtml, setAiHtml] = useState(product?.shopifyBodyHtml ?? '')
  const [showHtmlPreview, setShowHtmlPreview] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: product
      ? {
          name: product.name, category: product.category,
          size: product.variants?.[0]?.size ?? (product.sizeML ? `${product.sizeML}ml` : ''),
          bottleColour: product.variants?.[0]?.bottleColour ?? product.bottleColour ?? '',
          lidColour: product.variants?.[0]?.lidColour ?? product.lidColour ?? '',
          texture: product.variants?.[0]?.texture ?? product.texture ?? '',
          costCNY: product.costCNY,
          costWithShippingCNY: product.costWithShippingCNY,
          costPerUnitZAR: product.costPerUnitZAR, supplierId: product.supplierId,
          link1688: product.link1688 ?? '', isActive: product.isActive,
          weightKg: product.weightKg ?? 0.10,
          lengthCm: product.lengthCm ?? 4,
          widthCm: product.widthCm ?? 4,
          heightCm: product.heightCm ?? 12,
        }
      : { isActive: true, weightKg: 0.10, lengthCm: 4, widthCm: 4, heightCm: 12 },
  })

  useEffect(() => { suppliersApi.getAll().then(setSupplierList).catch(() => {}) }, [])

  const [n, cat, sz, bc, lc, tx, wKg, lCm, wCm, hCm] = watch(['name', 'category', 'size', 'bottleColour', 'lidColour', 'texture', 'weightKg', 'lengthCm', 'widthCm', 'heightCm'] as const)
  const skuPreview = buildSKU(n ?? '', cat ?? '', sz ?? '', bc ?? '', lc ?? '', tx ?? '')
  const cbmPreview = ((lCm || 0) * (wCm || 0) * (hCm || 0) / 1_000_000).toFixed(9)
  const shippingPerUnitPreview = (((Number(lCm) * Number(wCm) * Number(hCm) / 1_000_000) * 2000 + (Number(wKg) * 10)) * 2.40).toFixed(2)

  const inputCls = (hasErr?: boolean) =>
    `w-full px-3 py-2 bg-gray-800 border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 ${hasErr ? 'border-red-500' : 'border-gray-700'}`

  // ── Step 1 submit ────────────────────────────────────────────────────────
  const onSubmitProduct = async (data: Fields) => {
    setSaving(true); setError(null)
    try {
      const payload = { ...data, skuBase: skuPreview, link1688: data.link1688 || null }
      const result = isEdit && product
        ? await productApi.update(product.id, payload)
        : await productApi.create(payload)
      setSavedProduct(result as Product)
      if (isEdit) { onSaved(result as Product) } else { setStep('pricing') }
    } catch (e) { setError(apiError(e)) }
    finally { setSaving(false) }
  }

  // ── Step 2: calculate pricing ────────────────────────────────────────────
  const handleCalculate = async () => {
    if (!savedProduct) return
    setCalculating(true); setError(null)
    try {
      const variantSize = savedProduct.variants?.[0]?.size ?? (savedProduct.sizeML ? `${savedProduct.sizeML}ml` : '')
      const result = await productApi.calculatePricing({
        costCNY: savedProduct.costCNY,
        productName: savedProduct.name,
        category: savedProduct.category,
        size: variantSize,
        bottleColour: savedProduct.variants?.[0]?.bottleColour ?? savedProduct.bottleColour ?? '',
        lidColour: savedProduct.variants?.[0]?.lidColour ?? savedProduct.lidColour ?? '',
        texture: savedProduct.variants?.[0]?.texture ?? savedProduct.texture ?? '',
      })
      setCalcResult(result)
      setOverrides({})
    } catch (e) { setError(apiError(e)) }
    finally { setCalculating(false) }
  }

  const effectiveTiers = (): PricingTierCalculation[] => {
    if (!calcResult) return []
    return calcResult.tiers.map((t) => {
      const ov = overrides[t.quantity]
      if (ov !== undefined) {
        const newSale = parseFloat(ov) || t.salePricePerUnit
        const newTotal = Math.round(newSale * t.quantity * 100) / 100
        const newProfit = Math.round((newTotal - t.totalCostPrice) * 100) / 100
        const newMargin = newTotal > 0 ? Math.round(newProfit / newTotal * 10000) / 100 : 0
        return { ...t, salePricePerUnit: newSale, totalSalePrice: newTotal, totalProfit: newProfit, marginPercent: newMargin }
      }
      return t
    })
  }

  const handleSaveTiers = async () => {
    if (!savedProduct || !calcResult) { setStep('ai'); return }
    setSavingTiers(true); setError(null)
    try {
      const tiers = effectiveTiers().map((t) => ({
        sku: t.sku,
        quantity: t.quantity,
        markupPercent: t.markupPercent,
        salePricePerUnit: t.salePricePerUnit,
        totalSalePrice: t.totalSalePrice,
        totalCostPrice: t.totalCostPrice,
        profitPerUnit: t.profitPerUnit,
        totalProfit: t.totalProfit,
        marginPercent: t.marginPercent,
        compareAtPrice: t.compareAtPrice,
        deliveryCostZAR: 0,
        logoSilkScreen: null,
        logoHotStamping: null,
      }))
      await productApi.setPricingTiers(savedProduct.id, tiers)
      setStep('ai')
    } catch (e) { setError(apiError(e)) }
    finally { setSavingTiers(false) }
  }

  // ── Step 3: AI content ───────────────────────────────────────────────────
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setImageFile(f)
    if (f) setImagePreview(URL.createObjectURL(f))
  }

  const handleGenerateAi = async () => {
    if (!savedProduct || !imageFile) return
    setGeneratingAi(true); setError(null)
    try {
      const fd = new FormData()
      fd.append('image', imageFile)
      const vSize = savedProduct.variants?.[0]?.size ?? (savedProduct.sizeML ? `${savedProduct.sizeML}ml` : '')
      const vBottle = savedProduct.variants?.[0]?.bottleColour ?? savedProduct.bottleColour ?? ''
      const vLid = savedProduct.variants?.[0]?.lidColour ?? savedProduct.lidColour ?? ''
      const vTexture = savedProduct.variants?.[0]?.texture ?? savedProduct.texture ?? ''
      fd.append('productName', savedProduct.name)
      fd.append('size', vSize)
      fd.append('category', savedProduct.category)
      fd.append('colour', `${vBottle}/${vLid}`)
      fd.append('texture', vTexture)
      const result = await productApi.generateAiContent(fd)
      setAiTitle(result.title)
      setAiHtml(result.htmlBody)
    } catch (e) { setError(apiError(e)) }
    finally { setGeneratingAi(false) }
  }

  const handleSaveAiContent = async () => {
    if (!savedProduct) { setStep('review'); return }
    if (!aiTitle && !aiHtml) { setStep('review'); return }
    try {
      const updated = await productApi.update(savedProduct.id, {
        name: savedProduct.name, skuBase: savedProduct.skuBase,
        category: savedProduct.category, sizeML: savedProduct.sizeML,
        bottleColour: savedProduct.bottleColour, lidColour: savedProduct.lidColour,
        texture: savedProduct.texture, costCNY: savedProduct.costCNY,
        costWithShippingCNY: savedProduct.costWithShippingCNY,
        costPerUnitZAR: savedProduct.costPerUnitZAR,
        link1688: savedProduct.link1688,
        supplierId: savedProduct.supplierId, isActive: savedProduct.isActive,
        shopifyTitle: aiTitle || null,
        shopifyBodyHtml: aiHtml || null,
      })
      setSavedProduct(updated as Product)
    } catch { /* non-critical */ }
    setStep('review')
  }

  // ── Stepper header ───────────────────────────────────────────────────────
  const stepIdx = STEPS.indexOf(step)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-3xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-white">
              {isEdit ? 'Edit Product' : 'Add Product'}
            </h2>
            {!isEdit && (
              <div className="flex items-center gap-1.5 mt-1.5">
                {STEP_LABELS.map((label, i) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={`flex items-center gap-1 text-xs font-medium ${
                      i < stepIdx ? 'text-green-400' : i === stepIdx ? 'text-indigo-400' : 'text-gray-600'
                    }`}>
                      {i < stepIdx && <Check size={10} />}
                      <span>{i + 1}. {label}</span>
                    </div>
                    {i < STEP_LABELS.length - 1 && <ChevronRight size={10} className="text-gray-700" />}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* ── Step 1: Product Details ─────────────────────────────────────── */}
        {step === 'product' && (
          <form onSubmit={handleSubmit(onSubmitProduct)} className="p-6 space-y-5">
            {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</p>}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-400 mb-1">Product Name</label>
                <input {...register('name')} className={inputCls(!!errors.name)} placeholder="e.g. Devin" />
                {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Category</label>
                <select {...register('category')} className={inputCls(!!errors.category)}>
                  <option value="">Select…</option>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
                {errors.category && <p className="text-xs text-red-400 mt-1">{errors.category.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Size</label>
                <select {...register('size')} className={inputCls(!!errors.size)}>
                  <option value="">Select size…</option>
                  <optgroup label="— ml —">
                    {SIZES_ML.map((s) => <option key={s} value={s}>{s}</option>)}
                  </optgroup>
                  <optgroup label="— g —">
                    {SIZES_G.map((s) => <option key={s} value={s}>{s}</option>)}
                  </optgroup>
                </select>
                {errors.size && <p className="text-xs text-red-400 mt-1">{errors.size.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Bottle Colour</label>
                <input {...register('bottleColour')} className={inputCls(!!errors.bottleColour)} placeholder="e.g. Clear, Black" />
                {errors.bottleColour && <p className="text-xs text-red-400 mt-1">{errors.bottleColour.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Lid Colour</label>
                <input {...register('lidColour')} className={inputCls(!!errors.lidColour)} placeholder="e.g. White, Gold" />
                {errors.lidColour && <p className="text-xs text-red-400 mt-1">{errors.lidColour.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Texture</label>
                <select {...register('texture')} className={inputCls(!!errors.texture)}>
                  <option value="">Select…</option>
                  {TEXTURES.map((t) => <option key={t}>{t}</option>)}
                </select>
                {errors.texture && <p className="text-xs text-red-400 mt-1">{errors.texture.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Supplier</label>
                <select {...register('supplierId')} className={inputCls(!!errors.supplierId)}>
                  <option value="0">Select supplier…</option>
                  {supplierList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {errors.supplierId && <p className="text-xs text-red-400 mt-1">{errors.supplierId.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Cost (CNY)</label>
                <input {...register('costCNY')} type="number" step="0.01" className={inputCls()} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Cost with Shipping (CNY)</label>
                <input {...register('costWithShippingCNY')} type="number" step="0.01" className={inputCls()} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Cost per Unit (ZAR) <span className="text-gray-600">optional override</span></label>
                <input {...register('costPerUnitZAR')} type="number" step="0.0001" className={inputCls()} placeholder="auto-calculated" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-400 mb-1">Supplier Link <span className="text-gray-600">(optional)</span></label>
                <input {...register('link1688')} type="url" className={inputCls()} placeholder="https://…" />
              </div>

              {/* Dimensions */}
              <div className="col-span-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Shipping Dimensions (per unit)</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Weight (kg)</label>
                <input {...register('weightKg')} type="number" step="0.001" className={inputCls()} placeholder="0.10" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Length (cm)</label>
                <input {...register('lengthCm')} type="number" step="0.1" className={inputCls()} placeholder="4" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Width (cm)</label>
                <input {...register('widthCm')} type="number" step="0.1" className={inputCls()} placeholder="4" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Height (cm)</label>
                <input {...register('heightCm')} type="number" step="0.1" className={inputCls()} placeholder="12" />
              </div>
              <div className="col-span-2 bg-gray-800/40 rounded-lg px-3 py-2 flex gap-6 text-xs text-gray-400">
                <span>CBM: <span className="text-gray-200 font-mono">{cbmPreview}</span></span>
                <span>Shipping/unit (est.): <span className="text-gray-200 font-mono">R{shippingPerUnitPreview}</span></span>
                <span className="text-gray-600">at ¥2000/CBM + ¥10/kg × 2.40</span>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-400 mb-1">Generated SKU</label>
                <div className="px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm font-mono text-indigo-300 min-h-[36px]">
                  {skuPreview || <span className="text-gray-600">Fill in fields above…</span>}
                </div>
              </div>
              {isEdit && (
                <div className="col-span-2 flex items-center gap-2">
                  <input {...register('isActive')} type="checkbox" id="isActive" className="rounded border-gray-600 bg-gray-800 accent-indigo-500" />
                  <label htmlFor="isActive" className="text-sm text-gray-300">Active</label>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-800">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
              <button type="submit" disabled={saving} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                {isEdit ? 'Save Changes' : 'Next'}
                {!isEdit && !saving && <ChevronRight size={14} />}
              </button>
            </div>
          </form>
        )}

        {/* ── Step 2: Auto-Pricing ────────────────────────────────────────── */}
        {step === 'pricing' && (
          <div className="p-6 space-y-4">
            {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</p>}

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{savedProduct?.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">Cost: <span className="text-gray-300">¥{savedProduct?.costCNY}</span></p>
              </div>
              <button
                onClick={handleCalculate}
                disabled={calculating}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {calculating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                Calculate Pricing
              </button>
            </div>

            {calcResult && (
              <>
                <div className="flex gap-4 text-xs text-gray-400 bg-gray-800/50 rounded-lg px-4 py-2.5">
                  <span>Exchange rate: <span className="text-white font-medium">1 CNY = {calcResult.exchangeRate.toFixed(4)} ZAR</span></span>
                  <span className="text-gray-700">·</span>
                  <span>Cost/unit: <span className="text-white font-medium">{formatZAR(calcResult.costPerUnitZAR)}</span></span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-800">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 bg-gray-800/50">
                        {['Qty', 'Markup %', 'Sale/Unit', 'Total Sale', 'Margin %'].map((h) => (
                          <th key={h} className="px-3 py-2 text-left text-gray-400 font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {calcResult.tiers.map((tier) => {
                        const ov = overrides[tier.quantity]
                        const salePrice = ov !== undefined ? (parseFloat(ov) || tier.salePricePerUnit) : tier.salePricePerUnit
                        const totalSale = Math.round(salePrice * tier.quantity * 100) / 100
                        const margin = totalSale > 0 ? Math.round((totalSale - tier.totalCostPrice) / totalSale * 10000) / 100 : 0
                        return (
                          <tr key={tier.quantity} className="hover:bg-gray-800/30">
                            <td className="px-3 py-2 font-semibold text-gray-300">{tier.quantity.toLocaleString()}</td>
                            <td className="px-3 py-2 text-gray-400">{tier.markupPercent}%</td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                step="0.01"
                                value={ov ?? tier.salePricePerUnit}
                                onChange={(e) => setOverrides((prev) => ({ ...prev, [tier.quantity]: e.target.value }))}
                                className="w-24 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-indigo-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-gray-300 font-mono">{formatZAR(totalSale)}</td>
                            <td className="px-3 py-2">
                              <span className={margin >= 20 ? 'text-green-400' : margin >= 10 ? 'text-yellow-400' : 'text-red-400'}>
                                {margin.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="flex justify-between gap-3 pt-2 border-t border-gray-800">
              <button onClick={() => setStep('ai')} className="text-xs text-gray-500 hover:text-gray-400 transition-colors flex items-center gap-1">
                <SkipForward size={12} /> Skip pricing
              </button>
              <div className="flex gap-3">
                {calcResult && (
                  <button
                    onClick={handleSaveTiers}
                    disabled={savingTiers}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    {savingTiers ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
                    Save & Next
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: AI Content ──────────────────────────────────────────── */}
        {step === 'ai' && (
          <div className="p-6 space-y-4">
            {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</p>}

            <div className="bg-indigo-900/20 border border-indigo-800/40 rounded-lg px-4 py-3">
              <p className="text-xs text-indigo-300 font-medium flex items-center gap-1.5"><Sparkles size={12} /> AI Content Generation</p>
              <p className="text-xs text-gray-400 mt-1">Upload a product image to generate a Shopify-ready title and HTML description using GPT-4o mini.</p>
            </div>

            {/* Image upload */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Product Image</label>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-700 hover:border-indigo-600 rounded-lg p-6 text-center cursor-pointer transition-colors"
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="preview" className="max-h-32 mx-auto rounded object-contain" />
                ) : (
                  <p className="text-sm text-gray-500">Click to upload image (JPG, PNG, WEBP)</p>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </div>

            <button
              onClick={handleGenerateAi}
              disabled={generatingAi || !imageFile}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {generatingAi ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {generatingAi ? 'Generating…' : 'Generate AI Title & Description'}
            </button>

            {(aiTitle || aiHtml) && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Title (editable)</label>
                  <input
                    value={aiTitle}
                    onChange={(e) => setAiTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-400">HTML Body (editable)</label>
                    <button onClick={() => setShowHtmlPreview((v) => !v)} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                      <Eye size={11} /> {showHtmlPreview ? 'Edit' : 'Preview'}
                    </button>
                  </div>
                  {showHtmlPreview ? (
                    <div
                      className="p-3 bg-white rounded-lg text-gray-900 text-sm max-h-48 overflow-y-auto"
                      dangerouslySetInnerHTML={{ __html: aiHtml }}
                    />
                  ) : (
                    <textarea
                      value={aiHtml}
                      onChange={(e) => setAiHtml(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-300 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-between gap-3 pt-2 border-t border-gray-800">
              <button onClick={() => setStep('review')} className="text-xs text-gray-500 hover:text-gray-400 transition-colors flex items-center gap-1">
                <SkipForward size={12} /> Skip AI content
              </button>
              <button
                onClick={handleSaveAiContent}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <ChevronRight size={14} /> {aiTitle || aiHtml ? 'Save & Review' : 'Next'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Review ──────────────────────────────────────────────── */}
        {step === 'review' && savedProduct && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Product', savedProduct.name],
                ['SKU Base', savedProduct.skuBase],
                ['Category', savedProduct.category],
                ['Size', savedProduct.variants?.[0]?.size ?? (savedProduct.sizeML ? `${savedProduct.sizeML}ml` : '—')],
                ['Bottle / Lid', `${savedProduct.bottleColour} / ${savedProduct.lidColour}`],
                ['Texture', savedProduct.texture],
                ['Cost (CNY)', `¥${savedProduct.costCNY}`],
                ['Cost/unit (ZAR)', formatZAR(savedProduct.costPerUnitZAR ?? 0)],
              ].map(([l, v]) => (
                <div key={l} className="bg-gray-800/50 rounded-lg px-3 py-2.5">
                  <p className="text-xs text-gray-500 mb-0.5">{l}</p>
                  <p className="text-sm text-white font-medium font-mono">{v}</p>
                </div>
              ))}
            </div>

            {(savedProduct.pricingTiers?.length ?? 0) > 0 && (
              <div className="bg-gray-800/30 rounded-lg px-4 py-3">
                <p className="text-xs text-gray-400 font-medium mb-2">{savedProduct.pricingTiers!.length} pricing tiers saved</p>
                <div className="flex flex-wrap gap-2">
                  {savedProduct.pricingTiers!.slice(0, 5).map((t) => (
                    <span key={t.quantity} className="text-xs bg-indigo-900/40 text-indigo-300 border border-indigo-800/40 px-2 py-0.5 rounded">
                      {t.quantity.toLocaleString()} × {formatZAR(t.salePricePerUnit)}
                    </span>
                  ))}
                  {savedProduct.pricingTiers!.length > 5 && (
                    <span className="text-xs text-gray-500">+{savedProduct.pricingTiers!.length - 5} more</span>
                  )}
                </div>
              </div>
            )}

            {(aiTitle || savedProduct.shopifyTitle) && (
              <div className="bg-purple-900/20 border border-purple-800/30 rounded-lg px-4 py-3">
                <p className="text-xs text-purple-400 font-medium mb-1 flex items-center gap-1"><Sparkles size={10} /> AI Content</p>
                <p className="text-sm text-white">{aiTitle || savedProduct.shopifyTitle}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2 border-t border-gray-800">
              <button
                onClick={async () => {
                  const refreshed = await productApi.getById(savedProduct.id)
                  onSaved(refreshed)
                }}
                className="px-6 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Check size={14} /> Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
