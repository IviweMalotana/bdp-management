import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText, Download, ChevronDown, Truck, X, Info } from 'lucide-react'
import type { Order, Invoice } from '../../types'
import { orders as ordersApi } from '../../services/api'
import OrderStatusTimeline from '../../components/OrderStatusTimeline'
import InvoiceStatusBadge from '../../components/InvoiceStatusBadge'

const fmt = (n: number) => `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`

const ORDER_STATUSES = ['Draft', 'Confirmed', 'InProduction', 'Shipped', 'Delivered', 'Cancelled']

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusOpen, setStatusOpen] = useState(false)
  const [invoicing, setInvoicing] = useState(false)
  const [invoiceError, setInvoiceError] = useState('')
  const [fulfilmentTab, setFulfilmentTab] = useState<'yun' | 'manual'>('yun')
  const [shipForm, setShipForm] = useState({
    productCode: '',
    weightKg: '',
    lengthCm: '30',
    widthCm: '20',
    heightCm: '10',
    pieces: '1',
    declaredValueUSD: '10',
    recipientName: '',
    recipientPhone: '',
    recipientAddress: '',
    recipientCity: '',
    recipientPostcode: '',
    countryCode: 'ZA',
  })
  const [manualForm, setManualForm] = useState({ trackingNumber: '', trackingCarrier: 'YunExpress' })
  const [shipping, setShipping] = useState(false)
  const [shipError, setShipError] = useState('')
  const [yunInfo, setYunInfo] = useState<{ status?: string; waybillNumber?: string; productName?: string; createdAt?: string } | null>(null)
  const [loadingYunInfo, setLoadingYunInfo] = useState(false)

  const load = () => {
    const orderId = Number(id)
    setLoading(true)
    Promise.all([
      ordersApi.getById(orderId),
      ordersApi.getInvoice(orderId).catch(() => null),
    ])
      .then(([o, inv]) => {
        setOrder(o)
        setInvoice(inv)
        setShipForm(prev => ({
          ...prev,
          productCode: o.shippingServiceCode ?? '',
          countryCode: 'ZA',
        }))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return
    setStatusOpen(false)
    try {
      const updated = await ordersApi.updateStatus(order.id, newStatus)
      setOrder(updated)
    } catch { /* ignore */ }
  }

  const handleGenerateInvoice = async () => {
    if (!order) return
    setInvoicing(true); setInvoiceError('')
    try {
      const inv = await ordersApi.generateInvoice(order.id)
      setInvoice(inv)
    } catch (e: any) {
      setInvoiceError(e?.response?.data?.message ?? 'Failed to generate invoice')
    } finally {
      setInvoicing(false)
    }
  }

  const handleCreateShipment = async () => {
    if (!order) return
    setShipping(true); setShipError('')
    try {
      await ordersApi.createShipment(order.id, {
        productCode: shipForm.productCode,
        weightKg: parseFloat(shipForm.weightKg) || 0,
        lengthCm: parseFloat(shipForm.lengthCm) || 30,
        widthCm: parseFloat(shipForm.widthCm) || 20,
        heightCm: parseFloat(shipForm.heightCm) || 10,
        pieces: parseInt(shipForm.pieces) || 1,
        declaredValueUSD: parseFloat(shipForm.declaredValueUSD) || 10,
        recipientName: shipForm.recipientName,
        recipientPhone: shipForm.recipientPhone,
        recipientAddress: shipForm.recipientAddress,
        recipientCity: shipForm.recipientCity,
        recipientPostcode: shipForm.recipientPostcode,
        countryCode: shipForm.countryCode,
      })
      load()
    } catch (e: any) {
      setShipError(e?.response?.data?.message ?? 'Failed to create shipment')
    } finally {
      setShipping(false)
    }
  }

  const handleMarkShipped = async () => {
    if (!order || !manualForm.trackingNumber) return
    setShipping(true); setShipError('')
    try {
      await ordersApi.markShipped(order.id, {
        trackingNumber: manualForm.trackingNumber,
        trackingCarrier: manualForm.trackingCarrier || 'Manual',
      })
      load()
    } catch (e: any) {
      setShipError(e?.response?.data?.message ?? 'Failed to mark as shipped')
    } finally {
      setShipping(false)
    }
  }

  const handlePrintLabel = async () => {
    if (!order) return
    try {
      const data = await ordersApi.getLabel(order.id)
      if (data?.labelUrl) {
        window.open(data.labelUrl, '_blank')
      }
    } catch (e: any) {
      setShipError(e?.response?.data?.message ?? 'Failed to retrieve label')
    }
  }

  const handleCancelShipment = async () => {
    if (!order) return
    if (!window.confirm('Cancel this shipment with YunExpress? This cannot be undone.')) return
    setShipping(true); setShipError('')
    try {
      await ordersApi.cancelShipment(order.id)
      load()
    } catch (e: any) {
      setShipError(e?.response?.data?.message ?? 'Failed to cancel shipment')
    } finally {
      setShipping(false)
    }
  }

  const handleGetYunInfo = async () => {
    if (!order) return
    setLoadingYunInfo(true)
    try {
      const info = await ordersApi.getYunInfo(order.id)
      setYunInfo(info)
    } catch {
      setYunInfo(null)
    } finally {
      setLoadingYunInfo(false)
    }
  }

  if (loading) return <div className="text-gray-500 py-12 text-center">Loading…</div>
  if (!order) return <div className="text-gray-500 py-12 text-center">Order not found</div>

  const total = order.totalZAR ?? order.totalAmountZAR ?? 0
  const items = order.items ?? order.orderItems ?? []

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/b2b-orders')} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white font-mono">{order.orderNumber}</h1>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                { Draft: 'bg-gray-700 text-gray-300', Confirmed: 'bg-blue-900/50 text-blue-300', InProduction: 'bg-purple-900/50 text-purple-300', Shipped: 'bg-amber-900/50 text-amber-300', Delivered: 'bg-green-900/50 text-green-300', Cancelled: 'bg-red-900/50 text-red-400' }[order.status] ?? 'bg-gray-700 text-gray-300'
              }`}>
                {order.status}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">
              {order.clientName ?? order.customerName} · {new Date(order.orderDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status dropdown */}
          <div className="relative">
            <button
              onClick={() => setStatusOpen(!statusOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white rounded-lg text-sm font-medium"
            >
              Update Status <ChevronDown size={14} />
            </button>
            {statusOpen && (
              <div className="absolute right-0 z-10 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                {ORDER_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-700 ${s === order.status ? 'text-indigo-400' : 'text-white'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Invoice button */}
          {!invoice ? (
            <button
              onClick={handleGenerateInvoice}
              disabled={invoicing}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
            >
              <FileText size={15} />
              {invoicing ? 'Generating…' : 'Generate & Send Invoice'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <InvoiceStatusBadge status={invoice.status} />
              {invoice.pdfUrl && (
                <a
                  href={invoice.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white rounded-lg text-sm"
                >
                  <Download size={14} /> Invoice PDF
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {invoiceError && (
        <div className="px-4 py-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">{invoiceError}</div>
      )}

      {/* Timeline */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <OrderStatusTimeline currentStatus={order.status} />
      </div>

      {/* Fulfilment panel */}
      {order.status !== 'Delivered' && order.status !== 'Cancelled' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-2">
            <Truck size={16} className="text-indigo-400" />
            <h2 className="font-semibold text-white">Fulfilment</h2>
          </div>

          <div className="p-5">
            {order.trackingNumber ? (
              // ── Shipped state ──────────────────────────────────────────────
              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-white text-lg">{order.trackingNumber}</span>
                  {order.trackingCarrier && (
                    <span className="text-xs px-2 py-0.5 rounded bg-indigo-900/50 text-indigo-300 font-medium">
                      {order.trackingCarrier}
                    </span>
                  )}
                  {order.shippedDate && (
                    <span className="text-xs text-gray-500">
                      Shipped on {new Date(order.shippedDate).toLocaleDateString()}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handlePrintLabel}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white rounded-lg text-sm"
                  >
                    <Download size={14} /> Print Label
                  </button>
                  <button
                    onClick={handleGetYunInfo}
                    disabled={loadingYunInfo}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white rounded-lg text-sm disabled:opacity-50"
                  >
                    <Info size={14} /> {loadingYunInfo ? 'Loading…' : 'YunExpress Info'}
                  </button>
                  <button
                    onClick={handleCancelShipment}
                    disabled={shipping}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-900/30 border border-red-800 hover:bg-red-900/50 text-red-400 rounded-lg text-sm disabled:opacity-50"
                  >
                    <X size={14} /> Cancel Shipment
                  </button>
                </div>

                {yunInfo && (
                  <div className="bg-gray-800 rounded-lg p-4 text-sm space-y-1">
                    {yunInfo.status && <p className="text-gray-300"><span className="text-gray-500">Status:</span> {yunInfo.status}</p>}
                    {yunInfo.productName && <p className="text-gray-300"><span className="text-gray-500">Service:</span> {yunInfo.productName}</p>}
                    {yunInfo.createdAt && <p className="text-gray-300"><span className="text-gray-500">Created:</span> {yunInfo.createdAt}</p>}
                  </div>
                )}

                {shipError && (
                  <div className="px-4 py-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">{shipError}</div>
                )}
              </div>
            ) : (
              // ── Not yet shipped ────────────────────────────────────────────
              <div className="space-y-4">
                {/* Tab switcher */}
                <div className="flex gap-1 bg-gray-800 rounded-lg p-1 w-fit">
                  <button
                    onClick={() => setFulfilmentTab('yun')}
                    className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${fulfilmentTab === 'yun' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    Create via YunExpress API
                  </button>
                  <button
                    onClick={() => setFulfilmentTab('manual')}
                    className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${fulfilmentTab === 'manual' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  >
                    Enter tracking manually
                  </button>
                </div>

                {fulfilmentTab === 'yun' ? (
                  <div className="space-y-3">
                    {/* Product code */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Product Code</label>
                      <input
                        type="text"
                        value={shipForm.productCode}
                        onChange={e => setShipForm(p => ({ ...p, productCode: e.target.value }))}
                        placeholder="e.g. YWEN001"
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    {/* Weight + dimensions */}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'Weight kg', key: 'weightKg', type: 'number' },
                        { label: 'Length cm', key: 'lengthCm', type: 'number' },
                        { label: 'Width cm', key: 'widthCm', type: 'number' },
                        { label: 'Height cm', key: 'heightCm', type: 'number' },
                      ].map(({ label, key, type }) => (
                        <div key={key}>
                          <label className="block text-xs text-gray-500 mb-1">{label}</label>
                          <input
                            type={type}
                            value={(shipForm as any)[key]}
                            onChange={e => setShipForm(p => ({ ...p, [key]: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      ))}
                    </div>
                    {/* Pieces + declared value */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Pieces', key: 'pieces', type: 'number' },
                        { label: 'Declared Value USD', key: 'declaredValueUSD', type: 'number' },
                      ].map(({ label, key, type }) => (
                        <div key={key}>
                          <label className="block text-xs text-gray-500 mb-1">{label}</label>
                          <input
                            type={type}
                            value={(shipForm as any)[key]}
                            onChange={e => setShipForm(p => ({ ...p, [key]: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      ))}
                    </div>
                    {/* Recipient name + phone */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Recipient Name', key: 'recipientName' },
                        { label: 'Phone', key: 'recipientPhone' },
                      ].map(({ label, key }) => (
                        <div key={key}>
                          <label className="block text-xs text-gray-500 mb-1">{label}</label>
                          <input
                            type="text"
                            value={(shipForm as any)[key]}
                            onChange={e => setShipForm(p => ({ ...p, [key]: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      ))}
                    </div>
                    {/* Address, city, postcode, country */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Address</label>
                        <input
                          type="text"
                          value={shipForm.recipientAddress}
                          onChange={e => setShipForm(p => ({ ...p, recipientAddress: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      {[
                        { label: 'City', key: 'recipientCity' },
                        { label: 'Postcode', key: 'recipientPostcode' },
                      ].map(({ label, key }) => (
                        <div key={key}>
                          <label className="block text-xs text-gray-500 mb-1">{label}</label>
                          <input
                            type="text"
                            value={(shipForm as any)[key]}
                            onChange={e => setShipForm(p => ({ ...p, [key]: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      ))}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Country Code</label>
                        <input
                          type="text"
                          value={shipForm.countryCode}
                          onChange={e => setShipForm(p => ({ ...p, countryCode: e.target.value }))}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleCreateShipment}
                      disabled={shipping}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                    >
                      <Truck size={15} />
                      {shipping ? 'Creating shipment…' : 'Create Shipment'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 max-w-sm">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Tracking Number</label>
                      <input
                        type="text"
                        value={manualForm.trackingNumber}
                        onChange={e => setManualForm(p => ({ ...p, trackingNumber: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Carrier</label>
                      <input
                        type="text"
                        value={manualForm.trackingCarrier}
                        onChange={e => setManualForm(p => ({ ...p, trackingCarrier: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <button
                      onClick={handleMarkShipped}
                      disabled={shipping || !manualForm.trackingNumber}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                    >
                      <Truck size={15} />
                      {shipping ? 'Marking shipped…' : 'Mark as Shipped'}
                    </button>
                  </div>
                )}

                {shipError && (
                  <div className="px-4 py-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">{shipError}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Items table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-white">Line Items</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              {['Product', 'Qty', 'Unit Price', 'Logo', 'Shipping', 'Line Total'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-800/40">
                <td className="px-4 py-3">
                  <p className="font-medium text-white">{item.productName}</p>
                  <p className="text-xs text-gray-500">{item.variantSku ?? item.sku}</p>
                </td>
                <td className="px-4 py-3 text-gray-300">{item.quantity.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-300">{fmt(item.unitPriceZAR)}</td>
                <td className="px-4 py-3 text-gray-300">{(item.customisationCostZAR ?? item.brandingCostZAR ?? 0) > 0 ? fmt(item.customisationCostZAR ?? item.brandingCostZAR ?? 0) : '—'}</td>
                <td className="px-4 py-3 text-gray-300">{fmt(item.shippingCostZAR ?? 0)}</td>
                <td className="px-4 py-3 font-medium text-white">{fmt(item.lineTotal ?? item.totalPriceZAR ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Totals */}
        <div className="px-4 py-4 border-t border-gray-800 space-y-1.5 text-sm max-w-xs ml-auto">
          <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>{fmt(order.subtotalZAR ?? 0)}</span></div>
          <div className="flex justify-between text-gray-400"><span>Shipping</span><span>{fmt(order.shippingCostZAR ?? 0)}</span></div>
          <div className="flex justify-between text-white font-bold text-base pt-1.5 border-t border-gray-700"><span>Total</span><span>{fmt(total)}</span></div>
        </div>
      </div>

      {/* Payment + notes */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-2">Payment</p>
          <div className="flex items-center gap-2">
            <span className={`text-sm px-2 py-0.5 rounded font-medium ${order.isPaid ? 'bg-green-900/50 text-green-300' : 'bg-amber-900/20 text-amber-400'}`}>
              {order.isPaid ? 'Paid' : 'Unpaid'}
            </span>
            {order.isPaid && order.paidAt && <span className="text-xs text-gray-500">{new Date(order.paidAt).toLocaleDateString()}</span>}
          </div>
          {order.paystackPaymentReference && (
            <p className="text-xs text-gray-500 mt-1.5">Ref: <span className="font-mono text-gray-400">{order.paystackPaymentReference}</span></p>
          )}
        </div>
        {order.notes && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">Notes</p>
            <p className="text-sm text-gray-300">{order.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
