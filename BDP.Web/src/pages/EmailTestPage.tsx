import { useEffect, useState } from 'react'
import { Mail, Send, CheckCircle, XCircle } from 'lucide-react'
import { email as emailApi } from '../services/api'

export default function EmailTestPage() {
  const [status, setStatus] = useState<{ configured: boolean; fromAddress: string; transport?: 'resend' | 'smtp' | 'none' } | null>(null)
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    emailApi.status().then(setStatus).catch(() => setStatus(null))
  }, [])

  const send = async () => {
    setSending(true)
    setResult(null)
    try {
      const data = await emailApi.sendTest({ to, subject: subject || undefined, message: message || undefined })
      setResult({ success: true, message: data.message ?? 'Sent.' })
    } catch (e: any) {
      setResult({ success: false, message: e?.response?.data?.message ?? e?.message ?? 'Send failed.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Mail size={20} className="text-indigo-400" />
        <div>
          <h1 className="text-xl font-bold text-white">Email Test</h1>
          <p className="text-sm text-gray-400">Verify the Hostking SMTP configuration</p>
        </div>
      </div>

      {/* Email transport status */}
      {status && (() => {
        const transport = status.transport ?? (status.configured ? 'smtp' : 'none')
        // "resend" = good. "smtp" = works locally but blocked on most cloud hosts.
        const ok = transport === 'resend'
        const warn = transport === 'smtp'
        const cls = ok
          ? 'bg-green-900/20 border-green-800 text-green-300'
          : warn
            ? 'bg-amber-900/20 border-amber-800 text-amber-300'
            : 'bg-red-900/20 border-red-800 text-red-400'
        return (
          <div className={`flex items-start gap-2 px-4 py-3 rounded-lg text-sm border ${cls}`}>
            {ok ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
            {transport === 'resend' && (
              <span>Sending via <span className="font-mono">Resend API</span> (HTTPS) · from <span className="font-mono">{status.fromAddress}</span></span>
            )}
            {transport === 'smtp' && (
              <span>Using <span className="font-mono">SMTP</span> fallback — cloud hosts (Railway) usually block this, so sends may time out. Set <span className="font-mono">Resend__ApiKey</span> in Railway to send over HTTPS.</span>
            )}
            {transport === 'none' && (
              <span>Email not configured — set <span className="font-mono">Resend__ApiKey</span> in Railway.</span>
            )}
          </div>
        )
      })()}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Send test to</label>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Subject <span className="text-gray-600">(optional)</span></label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="BDP test email"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Message <span className="text-gray-600">(optional)</span></label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="This is a test email confirming SMTP works."
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>

        <button
          onClick={send}
          disabled={sending || !to}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
        >
          <Send size={15} />
          {sending ? 'Sending…' : 'Send test email'}
        </button>
      </div>

      {result && (
        <div className={`flex items-start gap-2 px-4 py-3 rounded-lg text-sm border ${
          result.success
            ? 'bg-green-900/20 border-green-800 text-green-300'
            : 'bg-red-900/20 border-red-800 text-red-400'
        }`}>
          {result.success ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
          {result.message}
        </div>
      )}
    </div>
  )
}
