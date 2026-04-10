'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'

interface Props {
  projectId: string
  initial: { wp_url?: string | null; wp_username?: string | null; wp_app_password?: string | null }
}

export default function ProjectWpForm({ projectId, initial }: Props) {
  const [form, setForm] = useState({
    wp_url: initial.wp_url ?? '',
    wp_username: initial.wp_username ?? '',
    wp_app_password: initial.wp_app_password ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)

    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } else {
      setError('Failed to save. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <p className="text-xs text-gray-500">
        Save your WordPress credentials here so they auto-fill when publishing articles from this project.
        Use a <strong>WordPress Application Password</strong> — create one in{' '}
        <em>Users → Profile → Application Passwords</em>.
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">WordPress site URL</label>
        <input
          value={form.wp_url}
          onChange={e => setForm(p => ({ ...p, wp_url: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="https://myblog.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
        <input
          value={form.wp_username}
          onChange={e => setForm(p => ({ ...p, wp_username: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="admin"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Application Password</label>
        <input
          type="password"
          value={form.wp_app_password}
          onChange={e => setForm(p => ({ ...p, wp_app_password: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
        />
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
        {saved ? 'Saved!' : 'Save credentials'}
      </button>
    </form>
  )
}
