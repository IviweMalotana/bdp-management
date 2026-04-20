import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Loader2, Plus, Trash2 } from 'lucide-react'
import { orders as ordersApi, customers as customersApi, products as productsApi } from '../services/api'
import type { Order, Customer, Product } from '../types'

const STATUSES = ['Pending', 'Confirmed', 'In Production', 'Quality Check', 'Dispatched', 'Delivered', 'Cancelled']
const BRANDING_TYPES = ['None', 'Silk Screen', 'Hot Stamping', 'Both']

const itemSchema = z.object({
  productId: z.coerce.number().int().min(1, 'Required'),
  sku: z.string().min(1, 'Required'),
  quantity: z.coerce.number().int().min(1, 'Min 1'),
  unitPriceZAR: z.coerce.number().min(0),
  brandingCostZAR: z.coerce.number().min(0),
})

const schema = z.object({
  customerId: z.coerce.number().int().min(1, 'Required'),
  status: z.string().min(1),
  brandingType: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Add at least one item'),
})

type Fields = z.infer<typeof schema>

interface Props {
  customerId?: number
  onClose: () => void
  onSaved: (o: Order) => void
}

function apiError(e: unknown) {
  return (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Something went wrong.'
}

export default function OrderForm({ customerId: presetCustomerId, onClose, onSaved }: Props) {
  const [customerList, setCustomerList] = useState<Customer[]>([])
  const [productList, setProductList] = useState<Product[]>([])
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting } } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerId: presetCustomerId ?? 0,
      status: 'Pending',
      brandingType: 'None',
      items: [{ productId: 0, sku: '', quantity: 1, unitPriceZAR: 0, brandingCostZAR: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems = watch('items')

  useEffect(() => {
    customersApi.getAll({ pageSize: 200 }).then((r) => setCustomerList(r.items)).catch(() => {})
    productsApi.getAll({ pageSize: 200 }).then((r) => setProductList(r.items)).catch(() => {})
  }, [])

  const handleProductChange = (index: number, productId: number) => {
    const product = productList.find((p) => p.id === productId)
    if (!product) return
    setValue(`items.${index}.sku`, product.skuBase)
    const qty = watchedItems[index]?.quantity ?? 1
    const tier = product.pricingTiers
      .filter((t) => t.quantity <= qty)
      .sort((a, b) => b.quantity - a.quantity)[0]
    if (tier) setValue(`items.${index}.unitPriceZAR`, tier.salePricePerUnit)
  }

  const handleQtyChange = (index: number, qty: number) => {
    const productId = watchedItems[index]?.productId
    const product = productList.find((p) => p.id === productId)
    if (!product) return
    const tier = product.pricingTiers
      .filter((t) => t.quantity <= qty)
      .sort((a, b) => b.quantity - a.quantity)[0]
    if (tier) setValue(`items.${index}.unitPriceZAR`, tier.salePricePerUnit)
  }

  const orderTotal = watchedItems.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0
    const price = Number(item.unitPriceZAR) || 0
    const branding = Number(item.brandingCostZAR) || 0
    return sum + qty * price + branding
  }, 0)

  const formatZAR = (n: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n)

  const onSubmit = async (data: Fields) => {
    setError(null)
    try {
      const result = await ordersApi.create({
        ...data,
        brandingType: data.brandingType === 'None' ? null : (data.brandingType || null),
        notes: data.notes || null,
      })
      onSaved(result)
    } catch (e) { setError(apiError(e)) }
  }

  const inp = `px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500`

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-3xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-base font-semibold text-white">Create Order</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</p>}

          {/* Order header */}
          <div className="grid grid-cols-2 gap-4">
            <div className={presetCustomerId ? 'col-span-2' : 'col-span-2'}>
              {presetCustomerId ? (
                <input type="hidden" {...register('customerId')} />
              ) : (
                <>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Customer</label>
                  <select {...register('customerId')} className={`w-full ${inp} ${errors.customerId ? 'border-red-500' : ''}`}>
                    <option value="0">Select customer…</option>
                    {customerList.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                  </select>
                  {errors.customerId && <p className="text-xs text-red-400 mt-1">{errors.customerId.message}</p>}
                </>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Status</label>
              <select {...register('status')} className={`w-full ${inp}`}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Branding Type</label>
              <select {...register('brandingType')} className={`w-full ${inp}`}>
                {BRANDING_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-400 mb-1">Notes <span className="text-gray-600">(optional)</span></label>
              <textarea {...register('notes')} rows={2} className={`w-full ${inp} resize-none`} placeholder="Order notes…" />
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-white">Line Items</h3>
              <button
                type="button"
                onClick={() => append({ productId: 0, sku: '', quantity: 1, unitPriceZAR: 0, brandingCostZAR: 0 })}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <Plus size={13} /> Add Item
              </button>
            </div>
            {errors.items?.root && <p className="text-xs text-red-400 mb-2">{errors.items.root.message}</p>}

            <div className="space-y-2">
              {fields.map((field, index) => {
                const item = watchedItems[index]
                const lineTotal = (Number(item?.quantity) || 0) * (Number(item?.unitPriceZAR) || 0) + (Number(item?.brandingCostZAR) || 0)
                return (
                  <div key={field.id} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3">
                    <div className="grid grid-cols-12 gap-2 items-start">
                      {/* Product */}
                      <div className="col-span-4">
                        <label className="block text-xs text-gray-500 mb-1">Product</label>
                        <select
                          {...register(`items.${index}.productId`)}
                          onChange={(e) => {
                            register(`items.${index}.productId`).onChange(e)
                            handleProductChange(index, parseInt(e.target.value))
                          }}
                          className={`w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-indigo-500 ${errors.items?.[index]?.productId ? 'border-red-500' : ''}`}
                        >
                          <option value="0">Select…</option>
                          {productList.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.sizeML}ml)</option>)}
                        </select>
                      </div>

                      {/* SKU */}
                      <div className="col-span-3">
                        <label className="block text-xs text-gray-500 mb-1">SKU</label>
                        <input {...register(`items.${index}.sku`)} className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs font-mono text-gray-300 focus:outline-none focus:border-indigo-500" placeholder="auto-filled" />
                      </div>

                      {/* Qty */}
                      <div className="col-span-1">
                        <label className="block text-xs text-gray-500 mb-1">Qty</label>
                        <input
                          {...register(`items.${index}.quantity`)}
                          type="number"
                          min="1"
                          onChange={(e) => {
                            register(`items.${index}.quantity`).onChange(e)
                            handleQtyChange(index, parseInt(e.target.value))
                          }}
                          className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white text-right focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Unit Price (R)</label>
                        <input {...register(`items.${index}.unitPriceZAR`)} type="number" step="0.01" className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white text-right focus:outline-none focus:border-indigo-500" />
                      </div>

                      {/* Branding */}
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Branding (R)</label>
                        <input {...register(`items.${index}.brandingCostZAR`)} type="number" step="0.01" className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white text-right focus:outline-none focus:border-indigo-500" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500">Line total: <span className="text-white font-semibold">{formatZAR(lineTotal)}</span></p>
                      {fields.length > 1 && (
                        <button type="button" onClick={() => remove(index)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors">
                          <Trash2 size={11} /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Order total */}
            <div className="flex items-center justify-between mt-3 px-3 py-2.5 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <span className="text-sm font-semibold text-gray-300">Order Total</span>
              <span className="text-base font-bold text-white">{formatZAR(orderTotal)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              Create Order
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
