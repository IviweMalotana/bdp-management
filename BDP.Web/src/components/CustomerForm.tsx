import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Loader2 } from 'lucide-react'
import { customers as customersApi } from '../services/api'
import type { Customer } from '../types'

const schema = z.object({
  companyName: z.string().min(1, 'Required').max(200),
  contactName: z.string().min(1, 'Required').max(100),
  email: z.string().email('Invalid email'),
  phone: z.string().optional(),
  brandName: z.string().optional(),
  country: z.string().min(1, 'Required'),
  notes: z.string().optional(),
})

type Fields = z.infer<typeof schema>

interface Props {
  customer?: Customer | null
  onClose: () => void
  onSaved: (c: Customer) => void
}

export default function CustomerForm({ customer, onClose, onSaved }: Props) {
  const isEdit = !!customer
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: customer
      ? { companyName: customer.companyName, contactName: customer.contactName, email: customer.email, phone: customer.phone ?? '', brandName: customer.brandName ?? '', country: customer.country, notes: customer.notes ?? '' }
      : { country: 'South Africa' },
  })

  const onSubmit = async (data: Fields) => {
    setError(null)
    try {
      const payload = { ...data, phone: data.phone || null, brandName: data.brandName || null, notes: data.notes || null }
      const result = isEdit && customer
        ? await customersApi.update(customer.id, payload)
        : await customersApi.create(payload)
      onSaved(result as Customer)
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to save.')
    }
  }

  const inp = (hasErr?: boolean) =>
    `w-full px-3 py-2 bg-gray-800 border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 ${hasErr ? 'border-red-500' : 'border-gray-700'}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-base font-semibold text-white">{isEdit ? 'Edit Customer' : 'Add Customer'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-400 mb-1">Company Name</label>
              <input {...register('companyName')} className={inp(!!errors.companyName)} placeholder="e.g. Acme Beauty Co." />
              {errors.companyName && <p className="text-xs text-red-400 mt-1">{errors.companyName.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Contact Name</label>
              <input {...register('contactName')} className={inp(!!errors.contactName)} placeholder="Full name" />
              {errors.contactName && <p className="text-xs text-red-400 mt-1">{errors.contactName.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
              <input {...register('email')} type="email" className={inp(!!errors.email)} placeholder="email@company.com" />
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Phone <span className="text-gray-600">(optional)</span></label>
              <input {...register('phone')} className={inp()} placeholder="+27 ..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Country</label>
              <input {...register('country')} className={inp(!!errors.country)} />
              {errors.country && <p className="text-xs text-red-400 mt-1">{errors.country.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-400 mb-1">Brand Name <span className="text-gray-600">(optional)</span></label>
              <input {...register('brandName')} className={inp()} placeholder="Customer's brand name" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-400 mb-1">Notes <span className="text-gray-600">(optional)</span></label>
              <textarea {...register('notes')} rows={2} className={`${inp()} resize-none`} placeholder="Any notes…" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1 border-t border-gray-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
