import { useEffect, useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || '/api'

interface PendingClient {
  id: number
  companyName: string
  tradingName: string | null
  companyRegistrationNumber: string | null
  vatNumber: string | null
  contactPersonName: string
  contactPhone: string | null
  billingAddress: string | null
  industry: string | null
  requestedPaymentTermsDays: number
  createdAt: string
}

interface PendingApplication {
  userId: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  client: PendingClient | null
}

interface ApproveFormState {
  creditLimit: string
  paymentTermsDays: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function authHeader() {
  const token = localStorage.getItem('bdp_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export default function PendingApplications() {
  const [applications, setApplications] = useState<PendingApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Track which client is being approved (showing inline form)
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const [approveForm, setApproveForm] = useState<ApproveFormState>({
    creditLimit: '0',
    paymentTermsDays: '30',
  })

  // Track which client is being rejected (showing confirmation)
  const [rejectingId, setRejectingId] = useState<number | null>(null)

  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  async function fetchApplications() {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get(`${API}/clients/pending-b2b`, {
        headers: authHeader(),
      })
      setApplications(res.data)
    } catch {
      setError('Failed to load pending applications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [])

  async function handleApprove(clientId: number) {
    setActionLoading(true)
    setActionError(null)
    try {
      await axios.post(
        `${API}/clients/${clientId}/approve-b2b`,
        {
          creditLimit: parseFloat(approveForm.creditLimit) || 0,
          paymentTermsDays: parseInt(approveForm.paymentTermsDays) || 30,
        },
        { headers: authHeader() }
      )
      setApprovingId(null)
      setApproveForm({ creditLimit: '0', paymentTermsDays: '30' })
      await fetchApplications()
    } catch {
      setActionError('Failed to approve application. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReject(clientId: number) {
    setActionLoading(true)
    setActionError(null)
    try {
      await axios.post(
        `${API}/clients/${clientId}/reject-b2b`,
        {},
        { headers: authHeader() }
      )
      setRejectingId(null)
      await fetchApplications()
    } catch {
      setActionError('Failed to reject application. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">B2B Applications</h1>
        <p className="text-gray-400 text-sm mt-1">
          Review and approve or reject pending business account applications.
        </p>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 mb-6">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {actionError && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 mb-6">
          <p className="text-red-300 text-sm">{actionError}</p>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 text-sm">Loading applications…</div>
      ) : applications.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-400">No pending B2B applications.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            if (!app.client) return null
            const client = app.client
            const isApproving = approvingId === client.id
            const isRejecting = rejectingId === client.id

            return (
              <div
                key={app.userId}
                className="bg-gray-900 border border-gray-800 rounded-xl p-6"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      {client.companyName}
                    </h2>
                    {client.tradingName && (
                      <p className="text-sm text-gray-400">
                        Trading as: {client.tradingName}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-0.5">
                      Applied {formatDate(client.createdAt)}
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-900/40 text-amber-300 border border-amber-700 whitespace-nowrap">
                    Pending Review
                  </span>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mb-5">
                  <div>
                    <span className="text-gray-500">Contact person</span>
                    <p className="text-gray-200">{client.contactPersonName}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Account holder</span>
                    <p className="text-gray-200">{app.firstName} {app.lastName}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Email</span>
                    <p className="text-gray-200">{app.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone</span>
                    <p className="text-gray-200">{client.contactPhone ?? app.phone ?? '—'}</p>
                  </div>
                  {client.companyRegistrationNumber && (
                    <div>
                      <span className="text-gray-500">Reg. number</span>
                      <p className="text-gray-200">{client.companyRegistrationNumber}</p>
                    </div>
                  )}
                  {client.vatNumber && (
                    <div>
                      <span className="text-gray-500">VAT number</span>
                      <p className="text-gray-200">{client.vatNumber}</p>
                    </div>
                  )}
                  {client.industry && (
                    <div>
                      <span className="text-gray-500">Industry</span>
                      <p className="text-gray-200">{client.industry}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Requested payment terms</span>
                    <p className="text-gray-200">{client.requestedPaymentTermsDays} days</p>
                  </div>
                  {client.billingAddress && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Billing address</span>
                      <p className="text-gray-200">{client.billingAddress}</p>
                    </div>
                  )}
                </div>

                {/* Approve form */}
                {isApproving && (
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
                    <p className="text-sm font-medium text-white mb-3">Set account terms</p>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Credit limit (ZAR)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={approveForm.creditLimit}
                          onChange={(e) =>
                            setApproveForm((f) => ({ ...f, creditLimit: e.target.value }))
                          }
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">
                          Payment terms (days)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="90"
                          value={approveForm.paymentTermsDays}
                          onChange={(e) =>
                            setApproveForm((f) => ({
                              ...f,
                              paymentTermsDays: e.target.value,
                            }))
                          }
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(client.id)}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition-colors"
                      >
                        {actionLoading ? 'Approving…' : 'Confirm approval'}
                      </button>
                      <button
                        onClick={() => setApprovingId(null)}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Reject confirmation */}
                {isRejecting && (
                  <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-4">
                    <p className="text-sm text-red-300 mb-3">
                      Reject this application? The user will be reset to a personal account
                      and may re-apply.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleReject(client.id)}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-sm rounded-lg font-medium transition-colors"
                      >
                        {actionLoading ? 'Rejecting…' : 'Confirm rejection'}
                      </button>
                      <button
                        onClick={() => setRejectingId(null)}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                {!isApproving && !isRejecting && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setApprovingId(client.id)
                        setRejectingId(null)
                        setApproveForm({
                          creditLimit: '0',
                          paymentTermsDays: String(client.requestedPaymentTermsDays),
                        })
                      }}
                      className="px-4 py-2 bg-green-800 hover:bg-green-700 text-white text-sm rounded-lg font-medium transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setRejectingId(client.id)
                        setApprovingId(null)
                      }}
                      className="px-4 py-2 bg-red-900/60 hover:bg-red-800 text-red-300 hover:text-white text-sm rounded-lg font-medium transition-colors border border-red-800"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
