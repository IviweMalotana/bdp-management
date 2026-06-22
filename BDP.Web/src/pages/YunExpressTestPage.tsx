import { useState } from 'react'
import { FlaskConical, Truck, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { orders as ordersApi } from '../services/api'

const DEFAULTS = {
  productCode: '',
  weightKg: '2.5',
  lengthCm: '30',
  widthCm: '20',
  heightCm: '15',
  pieces: '6',
  declaredValueUSD: '40',
  recipientName: 'Test Buyer',
  recipientPhone: '0821234567',
  recipientAddress: '12 Test Street, Sandton',
  recipientCity: 'Johannesburg',
  recipientPostcode: '2196',
  recipientProvince: 'Gauteng',
  countryCode: 'ZA',
}

type Result = {
  mode: string
  success?: boolean
  reference?: string
  hasCredentials?: boolean
  trackingNumber?: string
  yunOrderId?: string
  labelUrl?: string
  cancelled?: boolean
  note?: string
  soapPayload?: string
  message?: string
}

export default function YunExpressTestPage() {
  const [form, setForm] = useState(DEFAULTS)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [payloadOpen, setPayloadOpen] = useState(false)

  const field = (key: keyof typeof DEFAULTS, label: string, opts?: { placeholder?: string; half?: boolean }) => (
    <div className={opts?.half ? '' : 'col-span-2'}>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type="text"
        value={form[key]}
        onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
        placeholder={opts?.placeholder}
        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-indigo-500"
      />
    </div>
  )

  const run = async (dryRun: boolean) => {
    setLoading(true)
    setResult(null)
    setError('')
    setPayloadOpen(false)
    try {
      const body = {
        productCode: form.productCode,
        weightKg: parseFloat(form.weightKg) || 2.5,
        lengthCm: parseFloat(form.lengthCm) || 30,
        widthCm: parseFloat(form.widthCm) || 20,
        heightCm: parseFloat(form.heightCm) || 15,
        pieces: parseInt(form.pieces) || 6,
        declaredValueUSD: parseFloat(form.declaredValueUSD) || 40,
        recipientName: form.recipientName,
        recipientPhone: form.recipientPhone,
        recipientAddress: form.recipientAddress,
        recipientCity: form.recipientCity,
        recipientPostcode: form.recipientPostcode,
        recipientProvince: form.recipientProvince,
        countryCode: form.countryCode,
      }
      const data = await ordersApi.testShipment(body, dryRun)
      setResult(data)
      if (data.soapPayload) setPayloadOpen(true)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <FlaskConical size={20} className="text-indigo-400" />
        <div>
          <h1 className="text-xl font-bold text-white">YunExpress Test</h1>
          <p className="text-sm text-gray-400">Validate the integration without touching a real order</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest">Shipment details</p>

        <div className="grid grid-cols-2 gap-3">
          {field('productCode', 'Product Code (shipping_method)', { placeholder: 'e.g. YWEN001 — leave blank to check credentials only' })}
          <div className="grid grid-cols-4 gap-2 col-span-2">
            {(['weightKg', 'lengthCm', 'widthCm', 'heightCm'] as const).map((k) => (
              <div key={k}>
                <label className="block text-xs text-gray-500 mb-1">
                  {{ weightKg: 'Weight kg', lengthCm: 'Length cm', widthCm: 'Width cm', heightCm: 'Height cm' }[k]}
                </label>
                <input
                  type="number"
                  value={form[k]}
                  onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 col-span-2">
            {field('pieces', 'Pieces', { half: true })}
            {field('declaredValueUSD', 'Declared Value USD', { half: true })}
          </div>
          {field('recipientName', 'Recipient Name')}
          {field('recipientPhone', 'Phone', { half: true })}
          {field('countryCode', 'Country Code', { half: true })}
          {field('recipientAddress', 'Address')}
          {field('recipientCity', 'City', { half: true })}
          {field('recipientPostcode', 'Postcode', { half: true })}
          {field('recipientProvince', 'Province')}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => run(true)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
          >
            <FlaskConical size={15} />
            {loading ? 'Running…' : 'Dry Run — Preview SOAP payload'}
          </button>
          <button
            onClick={() => run(false)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
          >
            <Truck size={15} />
            {loading ? 'Running…' : 'Live Test — Create & Cancel'}
          </button>
        </div>

        <p className="text-xs text-gray-600">
          Dry run: no network call to YunExpress — just previews what we'd send.<br />
          Live test: creates a real test order then immediately cancels it. Needs credentials in Railway.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-4 py-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
          <XCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            {result.success === false ? (
              <XCircle size={18} className="text-red-400" />
            ) : (
              <CheckCircle size={18} className="text-green-400" />
            )}
            <span className="font-semibold text-white capitalize">{result.mode} result</span>
          </div>

          <div className="text-sm space-y-1.5">
            {result.reference && (
              <p className="text-gray-300"><span className="text-gray-500 w-36 inline-block">Reference</span><span className="font-mono">{result.reference}</span></p>
            )}
            {result.hasCredentials !== undefined && (
              <p className="text-gray-300">
                <span className="text-gray-500 w-36 inline-block">Credentials set</span>
                <span className={result.hasCredentials ? 'text-green-400' : 'text-red-400'}>
                  {result.hasCredentials ? 'Yes — API calls will reach YunExpress' : 'No — set YunExpress__AppKey + AppToken in Railway'}
                </span>
              </p>
            )}
            {result.trackingNumber && (
              <p className="text-gray-300"><span className="text-gray-500 w-36 inline-block">Tracking</span><span className="font-mono">{result.trackingNumber}</span></p>
            )}
            {result.yunOrderId && (
              <p className="text-gray-300"><span className="text-gray-500 w-36 inline-block">YunExpress ID</span><span className="font-mono">{result.yunOrderId}</span></p>
            )}
            {result.labelUrl && (
              <p className="text-gray-300">
                <span className="text-gray-500 w-36 inline-block">Label</span>
                <a href={result.labelUrl} target="_blank" rel="noreferrer" className="text-indigo-400 underline">Open label PDF</a>
              </p>
            )}
            {result.cancelled !== undefined && (
              <p className="text-gray-300">
                <span className="text-gray-500 w-36 inline-block">Auto-cancelled</span>
                <span className={result.cancelled ? 'text-green-400' : 'text-amber-400'}>
                  {result.cancelled ? 'Yes' : 'No — cancel manually in YunExpress portal'}
                </span>
              </p>
            )}
            {result.note && (
              <p className="text-gray-500 text-xs mt-1">{result.note}</p>
            )}
            {result.message && (
              <p className="text-red-400">{result.message}</p>
            )}
          </div>

          {result.soapPayload && (
            <div>
              <button
                onClick={() => setPayloadOpen((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300"
              >
                {payloadOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {payloadOpen ? 'Hide' : 'Show'} SOAP payload
              </button>
              {payloadOpen && (
                <pre className="mt-3 p-4 bg-gray-800 rounded-lg text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap break-all font-mono leading-5">
                  {result.soapPayload}
                </pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
