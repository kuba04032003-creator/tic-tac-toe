'use client'

import { useState } from 'react'
import { Search, Loader2, ArrowRight, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Project { id: string; name: string; industry?: string; language?: string }
interface Keyword {
  keyword: string
  intent: 'informational' | 'commercial' | 'transactional' | 'navigational'
  difficulty: 'low' | 'medium' | 'high'
  notes: string
}

const INTENT_COLORS: Record<string, string> = {
  informational: 'bg-blue-50 text-blue-700',
  commercial: 'bg-purple-50 text-purple-700',
  transactional: 'bg-green-50 text-green-700',
  navigational: 'bg-gray-100 text-gray-600',
}

const DIFFICULTY_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
}

export default function KeywordsClient({ projects }: { projects: Project[] }) {
  const [seed, setSeed] = useState('')
  const [projectId, setProjectId] = useState('')
  const [loading, setLoading] = useState(false)
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [error, setError] = useState('')

  const selectedProject = projects.find(p => p.id === projectId)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!seed.trim()) return
    setLoading(true)
    setError('')
    setKeywords([])

    try {
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed: seed.trim(),
          industry: selectedProject?.industry ?? '',
          language: selectedProject?.language ?? 'English',
        }),
      })

      if (!res.ok) throw new Error('Failed to generate keywords')
      const data = await res.json()
      setKeywords(data.keywords)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function writeArticle(keyword: string) {
    const params = new URLSearchParams({ keyword: keyword })
    if (projectId) params.set('project', projectId)
    window.location.href = `/writer/new?${params}`
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Keyword Ideas</h1>
        <p className="text-gray-500 mt-1">Enter a topic and get AI-generated keyword suggestions with search intent.</p>
      </div>

      <form onSubmit={handleSearch} className="max-w-2xl mb-8">
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              value={seed}
              onChange={e => setSeed(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g. email marketing, weight loss, project management..."
            />
          </div>
          {projects.length > 0 && (
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm text-gray-600"
            >
              <option value="">No project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
          <button
            type="submit"
            disabled={loading || !seed.trim()}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Researching...' : 'Research'}
          </button>
        </div>
      </form>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg mb-6 max-w-2xl">{error}</p>
      )}

      {keywords.length > 0 && (
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <p className="text-sm font-semibold text-gray-700">{keywords.length} keyword ideas for &quot;{seed}&quot;</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {keywords.map((kw, i) => (
              <div key={i} className="px-5 py-4 flex items-start justify-between gap-4 group hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{kw.keyword}</p>
                  <p className="text-xs text-gray-400 mt-1">{kw.notes}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize', INTENT_COLORS[kw.intent] ?? 'bg-gray-100 text-gray-600')}>
                      {kw.intent}
                    </span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize', DIFFICULTY_COLORS[kw.difficulty] ?? 'bg-gray-100 text-gray-600')}>
                      {kw.difficulty} difficulty
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => writeArticle(kw.keyword)}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1"
                >
                  Write article <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && keywords.length === 0 && !error && (
        <div className="max-w-md text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
          <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Enter a topic above to get keyword ideas.</p>
        </div>
      )}
    </div>
  )
}
