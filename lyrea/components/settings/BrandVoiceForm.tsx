'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Check, Loader2 } from 'lucide-react'

const TONE_OPTIONS = ['Confident', 'Warm', 'Authoritative', 'Witty', 'Empathetic', 'Direct', 'Playful', 'Technical']

interface BrandVoice {
  id?: string
  description?: string
  tone_attributes?: string[]
  words_to_use?: string[]
  words_to_avoid?: string[]
  target_audience?: string
}

export default function BrandVoiceForm({
  existing,
  userId,
  projectId,
}: {
  existing: BrandVoice | null
  userId: string
  projectId?: string
}) {
  const [form, setForm] = useState({
    description: existing?.description ?? '',
    tone_attributes: existing?.tone_attributes ?? [] as string[],
    words_to_use: existing?.words_to_use?.join(', ') ?? '',
    words_to_avoid: existing?.words_to_avoid?.join(', ') ?? '',
    target_audience: existing?.target_audience ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function toggleTone(t: string) {
    setForm(prev => ({
      ...prev,
      tone_attributes: prev.tone_attributes.includes(t)
        ? prev.tone_attributes.filter(x => x !== t)
        : [...prev.tone_attributes, t],
    }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const supabase = createClient()
    const payload = {
      user_id: userId,
      project_id: projectId ?? null,
      description: form.description,
      tone_attributes: form.tone_attributes,
      words_to_use: form.words_to_use.split(',').map(s => s.trim()).filter(Boolean),
      words_to_avoid: form.words_to_avoid.split(',').map(s => s.trim()).filter(Boolean),
      target_audience: form.target_audience,
    }

    if (existing?.id) {
      await supabase.from('brand_voices').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('brand_voices').insert(payload)
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Brand description</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          placeholder="Describe your brand, what you do, and how you communicate..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Tone attributes</label>
        <div className="flex flex-wrap gap-2">
          {TONE_OPTIONS.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => toggleTone(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                form.tone_attributes.includes(t)
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Target audience</label>
        <input
          value={form.target_audience}
          onChange={e => setForm(p => ({ ...p, target_audience: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. SaaS founders, small business owners aged 30-50"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Words to always use</label>
          <input
            value={form.words_to_use}
            onChange={e => setForm(p => ({ ...p, words_to_use: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="word1, word2, ..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Words to avoid</label>
          <input
            value={form.words_to_avoid}
            onChange={e => setForm(p => ({ ...p, words_to_avoid: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="word1, word2, ..."
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
        {saved ? 'Saved!' : saving ? 'Saving...' : 'Save brand voice'}
      </button>
    </form>
  )
}
