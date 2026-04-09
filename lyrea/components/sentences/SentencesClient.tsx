'use client'

import { useState } from 'react'
import { Search, Loader2, ArrowRight, Sparkles, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Project { id: string; name: string; industry?: string; language?: string }

interface Sentence {
  sentence: string
  type: string
  format: string
  ai_potential: 'high' | 'medium' | 'low'
  notes: string
}

const TYPE_COLORS: Record<string, string> = {
  how:        'bg-blue-50 text-blue-700',
  why:        'bg-purple-50 text-purple-700',
  what:       'bg-indigo-50 text-indigo-700',
  who:        'bg-pink-50 text-pink-700',
  when:       'bg-orange-50 text-orange-700',
  where:      'bg-teal-50 text-teal-700',
  best:       'bg-green-50 text-green-700',
  compare:    'bg-yellow-50 text-yellow-700',
  should:     'bg-red-50 text-red-700',
  definition: 'bg-gray-100 text-gray-600',
}

const FORMAT_LABELS: Record<string, string> = {
  'paragraph':      'Paragraph',
  'numbered-steps': 'Step-by-step',
  'bullet-list':    'Bullet list',
  'table':          'Table',
  'definition':     'Definition',
  'faq':            'FAQ',
}

const AI_POTENTIAL_STYLES: Record<string, string> = {
  high:   'bg-emerald-100 text-emerald-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low:    'bg-gray-100 text-gray-500',
}

const TYPE_ORDER = ['how', 'why', 'what', 'best', 'compare', 'should', 'who', 'when', 'where', 'definition']

export default function SentencesClient({ projects }: { projects: Project[] }) {
  const [topic, setTopic] = useState('')
  const [projectId, setProjectId] = useState('')
  const [loading, setLoading] = useState(false)
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<string>('all')

  const selectedProject = projects.find(p => p.id === projectId)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!topic.trim()) return
    setLoading(true)
    setError('')
    setSentences([])
    setFilter('all')

    try {
      const res = await fetch('/api/sentences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          industry: selectedProject?.industry ?? '',
          language: selectedProject?.language ?? 'English',
        }),
      })
      if (!res.ok) throw new Error('Failed to generate sentences')
      const data = await res.json()
      setSentences(data.sentences)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function writeArticle(sentence: string) {
    const params = new URLSearchParams({ keyword: sentence })
    if (projectId) params.set('project', projectId)
    window.location.href = `/writer/new?${params}`
  }

  const types = ['all', ...TYPE_ORDER.filter(t => sentences.some(s => s.type === t))]
  const filtered = filter === 'all' ? sentences : sentences.filter(s => s.type === filter)
  const highAI = sentences.filter(s => s.ai_potential === 'high').length

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <h1 className="text-2xl font-bold text-gray-900">Sentence Search</h1>
        </div>
        <p className="text-gray-500">
          Discover how people <em>actually</em> search — full questions and sentences, not just keywords.
          Content that answers these gets cited by AI engines and wins featured snippets.
        </p>
      </div>

      <form onSubmit={handleSearch} className="max-w-2xl mb-8">
        <div className="flex gap-3">
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. email marketing, losing weight, project management software..."
          />
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
            disabled={loading || !topic.trim()}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Researching...' : 'Find sentences'}
          </button>
        </div>
      </form>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg mb-6 max-w-2xl">{error}</p>
      )}

      {sentences.length > 0 && (
        <div className="max-w-3xl">
          {/* Stats bar */}
          <div className="flex items-center gap-6 mb-5 text-sm">
            <span className="text-gray-700 font-medium">{sentences.length} search sentences</span>
            {highAI > 0 && (
              <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                {highAI} high AI citation potential
              </span>
            )}
          </div>

          {/* Type filter tabs */}
          <div className="flex gap-1.5 flex-wrap mb-5">
            {types.map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize',
                  filter === t
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                )}
              >
                {t === 'all' ? `All (${sentences.length})` : `${t} (${sentences.filter(s => s.type === t).length})`}
              </button>
            ))}
          </div>

          {/* Sentences list */}
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {filtered.map((s, i) => (
              <div key={i} className="px-5 py-4 group hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <p className="font-medium text-gray-900">{s.sentence}</p>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{s.notes}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize', TYPE_COLORS[s.type] ?? 'bg-gray-100 text-gray-600')}>
                        {s.type}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">
                        {FORMAT_LABELS[s.format] ?? s.format}
                      </span>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', AI_POTENTIAL_STYLES[s.ai_potential])}>
                        {s.ai_potential === 'high' ? '⚡ High AI potential' : s.ai_potential === 'medium' ? 'Medium AI potential' : 'Low AI potential'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => writeArticle(s.sentence)}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1 whitespace-nowrap"
                  >
                    Write article <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && sentences.length === 0 && !error && (
        <div className="max-w-xl">
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200 mb-6">
            <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-medium mb-1">Enter a topic to discover search sentences</p>
            <p className="text-gray-400 text-xs max-w-xs mx-auto">
              You&apos;ll get full questions people type and speak — the kind AI engines answer from your content.
            </p>
          </div>

          {/* Explainer */}
          <div className="bg-indigo-50 rounded-xl p-5 border border-indigo-100">
            <h3 className="font-semibold text-indigo-900 mb-2 text-sm">Why sentences beat keywords</h3>
            <ul className="space-y-1.5 text-xs text-indigo-800">
              <li>• AI engines (ChatGPT, Perplexity) answer questions — they cite content that answers them directly</li>
              <li>• Voice search is 100% sentence-based — nobody speaks in keywords</li>
              <li>• Google Featured Snippets reward direct answers to questions</li>
              <li>• Sentence-targeted articles get higher click-through rates</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
