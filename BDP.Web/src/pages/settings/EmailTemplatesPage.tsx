import { useEffect, useState } from 'react'
import { Mail, Save, RotateCcw, Loader2, AlertCircle, Check, Eye, Code2 } from 'lucide-react'
import { emailTemplatesApi } from '../../services/api'
import type { EmailTemplateSummary, EmailTemplate } from '../../types'

type Tab = 'edit' | 'preview'

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplateSummary[]>([])
  const [selected, setSelected] = useState<EmailTemplate | null>(null)
  const [subject, setSubject] = useState('')
  const [htmlBody, setHtmlBody] = useState('')
  const [tab, setTab] = useState<Tab>('edit')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    emailTemplatesApi
      .list()
      .then(setTemplates)
      .catch(() => setError('Failed to load email templates.'))
      .finally(() => setLoading(false))
  }, [])

  const handleSelect = async (key: string) => {
    setError(null)
    setSuccess(null)
    setSelected(null)
    try {
      const t = await emailTemplatesApi.get(key)
      setSelected(t)
      setSubject(t.subject)
      setHtmlBody(t.htmlBody)
      setTab('edit')
    } catch {
      setError(`Failed to load template "${key}".`)
    }
  }

  const handleSave = async () => {
    if (!selected) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const updated = await emailTemplatesApi.update(selected.key, { subject, htmlBody })
      setSelected(updated)
      setTemplates((prev) =>
        prev.map((t) =>
          t.key === updated.key ? { ...t, subject: updated.subject, updatedAt: updated.updatedAt } : t
        )
      )
      setSuccess('Template saved.')
    } catch {
      setError('Failed to save template.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!selected) return
    if (!confirm('Reset this template to the built-in default? This cannot be undone.')) return
    setResetting(true)
    setError(null)
    setSuccess(null)
    try {
      const reset = await emailTemplatesApi.reset(selected.key)
      setSelected(reset)
      setSubject(reset.subject)
      setHtmlBody(reset.htmlBody)
      setTemplates((prev) =>
        prev.map((t) =>
          t.key === reset.key ? { ...t, subject: reset.subject, updatedAt: reset.updatedAt } : t
        )
      )
      setSuccess('Template reset to default.')
    } catch {
      setError('Failed to reset template.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center">
          <Mail size={20} className="text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Email Templates</h1>
          <p className="text-sm text-gray-400">Edit the HTML and subject line for every automated email.</p>
        </div>
      </div>

      {/* Alert banners */}
      {error && (
        <div className="flex items-center gap-2 bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-900/40 border border-green-700 rounded-lg px-4 py-3 text-green-300 text-sm">
          <Check size={16} className="flex-shrink-0" />
          {success}
        </div>
      )}

      <div className="flex gap-6 h-[calc(100vh-220px)]">
        {/* Left panel — template list */}
        <aside className="w-72 flex-shrink-0 flex flex-col gap-2 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-gray-500 px-1">No templates found.</p>
          ) : (
            templates.map((t) => (
              <button
                key={t.key}
                onClick={() => handleSelect(t.key)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  selected?.key === t.key
                    ? 'border-indigo-500 bg-indigo-600/10 text-white'
                    : 'border-gray-800 bg-gray-900 text-gray-300 hover:border-gray-700 hover:text-white'
                }`}
              >
                <p className="font-medium text-sm">{t.name}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{t.description}</p>
                <p className="text-xs text-gray-600 mt-1.5">
                  Updated {new Date(t.updatedAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </button>
            ))
          )}
        </aside>

        {/* Right panel — editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center bg-gray-900 border border-gray-800 rounded-xl">
              <div className="text-center text-gray-600">
                <Mail size={36} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">Select a template to edit</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between gap-4 flex-shrink-0">
                <div>
                  <h2 className="text-base font-semibold text-white">{selected.name}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{selected.description}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={handleReset}
                    disabled={resetting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-700 text-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50"
                  >
                    {resetting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                    Reset
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm text-white transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save
                  </button>
                </div>
              </div>

              {/* Subject field */}
              <div className="px-5 py-3 border-b border-gray-800 flex-shrink-0">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5">
                  Subject line
                </label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="Email subject"
                />
              </div>

              {/* Tab bar */}
              <div className="px-5 pt-3 border-b border-gray-800 flex gap-1 flex-shrink-0">
                <button
                  onClick={() => setTab('edit')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-sm font-medium transition-colors ${
                    tab === 'edit'
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Code2 size={14} />
                  HTML
                </button>
                <button
                  onClick={() => setTab('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-sm font-medium transition-colors ${
                    tab === 'preview'
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <Eye size={14} />
                  Preview
                </button>
              </div>

              {/* Editor / Preview */}
              <div className="flex-1 overflow-hidden">
                {tab === 'edit' ? (
                  <textarea
                    value={htmlBody}
                    onChange={(e) => setHtmlBody(e.target.value)}
                    spellCheck={false}
                    className="w-full h-full bg-gray-800 text-sm text-gray-200 font-mono p-4 resize-none focus:outline-none border-0"
                    placeholder="HTML body..."
                  />
                ) : (
                  <iframe
                    srcDoc={htmlBody}
                    title="Email preview"
                    className="w-full h-full border-0 bg-white"
                    sandbox="allow-same-origin"
                  />
                )}
              </div>

              {/* Footer — last updated */}
              <div className="px-5 py-2 border-t border-gray-800 flex-shrink-0">
                <p className="text-xs text-gray-600">
                  Last updated:{' '}
                  {new Date(selected.updatedAt).toLocaleString('en-ZA', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
