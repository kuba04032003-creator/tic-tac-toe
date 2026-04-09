'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Wand2, Loader2 } from 'lucide-react'

interface Project { id: string; name: string }

const TONES = ['Professional', 'Casual', 'Authoritative', 'Friendly', 'Technical', 'Playful']
const LENGTHS = [
  { value: 'short', label: 'Short (~600 words)' },
  { value: 'medium', label: 'Medium (~1200 words)' },
  { value: 'long', label: 'Long (~2000 words)' },
]

export default function NewArticleClient({
  projects,
  defaultKeyword,
  defaultProjectId,
}: {
  projects: Project[]
  defaultKeyword?: string
  defaultProjectId?: string
}) {
  const router = useRouter()
  const [form, setForm] = useState({
    title: '',
    keyword: defaultKeyword ?? '',
    tone: 'Professional',
    length: 'medium',
    projectId: defaultProjectId ?? '',
  })
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title && !form.keyword) {
      setError('Enter a title or target keyword.')
      return
    }
    setGenerating(true)
    setError('')

    try {
      // First create empty article to get ID
      const createRes = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title || form.keyword,
          keyword: form.keyword,
          project_id: form.projectId || null,
        }),
      })

      if (!createRes.ok) throw new Error('Failed to create article')
      const article = await createRes.json()

      // Stream generation
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          keyword: form.keyword,
          tone: form.tone,
          length: form.length,
          projectId: form.projectId || null,
        }),
      })

      if (!genRes.ok) throw new Error('Generation failed')

      const reader = genRes.body!.getReader()
      const decoder = new TextDecoder()
      let content = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        content += decoder.decode(value, { stream: true })
      }

      // Save content
      await fetch(`/api/articles/${article.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title || form.keyword, content }),
      })

      router.push(`/writer/${article.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setGenerating(false)
    }
  }

  return (
    <div className="p-8">
      <Link href="/writer" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to articles
      </Link>

      <div className="max-w-lg">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">New article</h1>
        <p className="text-gray-500 mb-8">Let AI write a full SEO article for you.</p>

        <form onSubmit={handleGenerate} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Article title</label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. 10 Best SEO Tools for Small Businesses"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target keyword</label>
            <input
              value={form.keyword}
              onChange={e => set('keyword', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. seo tools for small business"
            />
            <p className="text-xs text-gray-400 mt-1">Enter at least one of title or keyword.</p>
          </div>

          {projects.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project <span className="text-gray-400">(optional)</span></label>
              <select
                value={form.projectId}
                onChange={e => set('projectId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tone</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('tone', t)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    form.tone === t
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Length</label>
            <div className="flex gap-2">
              {LENGTHS.map(l => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => set('length', l.value)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    form.length === l.value
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button
            type="submit"
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating article...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Generate article
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
