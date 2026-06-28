import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save } from 'lucide-react'
import { clients as clientsApi } from '../../services/api'

const schema = z.object({
  companyName: z.string().min(1, 'Required'),
  tradingName: z.string().optional(),
  companyRegistrationNumber: z.string().min(1, 'Required'),
  vatNumber: z.string().optional(),
  contactPersonName: z.string().min(1, 'Required'),
  contactEmail: z.string().email('Invalid email'),
  contactPhone: z.string().min(1, 'Required'),
  industry: z.string().optional(),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  creditLimit: z.coerce.number().min(0),
  paymentTermsDays: z.coerce.number().min(1),
  isActive: z.boolean().default(true),
})

type Fields = z.infer<typeof schema>

const inp = (err?: boolean) =>
  `w-full px-3 py-2 bg-gray-800 border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 ${err ? 'border-red-500' : 'border-gray-700'}`

const INDUSTRIES = ['Beauty', 'Healthcare', 'Pharmaceutical', 'Hospitality', 'Retail', 'Other']

export default function ClientForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const [sameAddress, setSameAddress] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<Fields>({
    resolver: zodResolver(schema),
    defaultValues: { isActive: true, paymentTermsDays: 30, creditLimit: 0 },
  })

  // Load existing client for edit
  useEffect(() => {
    if (!isEdit) return
    clientsApi.getById(Number(id)).then((c) => {
      setValue('companyName', c.companyName)
      setValue('tradingName', c.tradingName ?? '')
      setValue('companyRegistrationNumber', c.companyRegistrationNumber ?? '')
      setValue('vatNumber', c.vatNumber ?? '')
      setValue('contactPersonName', c.contactPersonName)
      setValue('contactEmail', c.contactEmail)
      setValue('contactPhone', c.contactPhone ?? '')
      setValue('industry', c.industry ?? '')
      setValue('billingAddress', c.billingAddress ?? '')
      setValue('shippingAddress', c.shippingAddress ?? '')
      setValue('creditLimit', c.creditLimit)
      setValue('paymentTermsDays', c.paymentTermsDays)
      setValue('isActive', c.isActive)
    })
  }, [id, isEdit, setValue])

  const billing = watch('billingAddress')
  useEffect(() => {
    if (sameAddress) setValue('shippingAddress', billing ?? '')
  }, [billing, sameAddress, setValue])

  const onSubmit = async (data: Fields) => {
    setSaving(true)
    setError('')
    try {
      if (isEdit) {
        await clientsApi.update(Number(id), data)
        navigate(`/clients/${id}`)
      } else {
        const created = await clientsApi.create(data)
        navigate(`/clients/${created.id}`)
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl font-bold text-white">{isEdit ? 'Edit Client' : 'New Client'}</h1>
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">{error}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Company info */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Company Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-gray-400 mb-1.5">Company Name *</label>
              <input {...register('companyName')} className={inp(!!errors.companyName)} placeholder="Acme Beauty (Pty) Ltd" />
              {errors.companyName && <p className="text-xs text-red-400 mt-1">{errors.companyName.message}</p>}
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-gray-400 mb-1.5">Trading Name</label>
              <input {...register('tradingName')} className={inp()} placeholder="Acme Beauty" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Company Reg Number *</label>
              <input {...register('companyRegistrationNumber')} className={inp(!!errors.companyRegistrationNumber)} placeholder="2020/123456/07" />
              {errors.companyRegistrationNumber && <p className="text-xs text-red-400 mt-1">{errors.companyRegistrationNumber.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">VAT Number</label>
              <input {...register('vatNumber')} className={inp()} placeholder="4560123456" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Industry</label>
              <select {...register('industry')} className={inp()}>
                <option value="">Select industry…</option>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Contact Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1.5">Contact Person Name *</label>
              <input {...register('contactPersonName')} className={inp(!!errors.contactPersonName)} placeholder="Jane Smith" />
              {errors.contactPersonName && <p className="text-xs text-red-400 mt-1">{errors.contactPersonName.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Contact Email *</label>
              <input {...register('contactEmail')} type="email" className={inp(!!errors.contactEmail)} placeholder="jane@acme.co.za" />
              {errors.contactEmail && <p className="text-xs text-red-400 mt-1">{errors.contactEmail.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Contact Phone *</label>
              <input {...register('contactPhone')} className={inp(!!errors.contactPhone)} placeholder="+27 11 000 0000" />
              {errors.contactPhone && <p className="text-xs text-red-400 mt-1">{errors.contactPhone.message}</p>}
            </div>
          </div>
        </div>

        {/* Addresses */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Addresses</h2>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Billing Address</label>
            <textarea {...register('billingAddress')} rows={3} className={inp()} placeholder="123 Main Street, Johannesburg, 2001" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={sameAddress} onChange={(e) => setSameAddress(e.target.checked)} className="accent-indigo-500" />
            <span className="text-sm text-gray-300">Shipping address same as billing</span>
          </label>
          {!sameAddress && (
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Shipping Address</label>
              <textarea {...register('shippingAddress')} rows={3} className={inp()} placeholder="Same or different address" />
            </div>
          )}
        </div>

        {/* Status (edit only) — credit limit / payment terms removed: customers pay upfront */}
        {isEdit && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Status</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('isActive')} className="accent-indigo-500" />
              <span className="text-sm text-gray-300">Client is active</span>
            </label>
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Save size={15} />
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Client'}
          </button>
        </div>
      </form>
    </div>
  )
}
