'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Map, Loader2, Search, ArrowRight, Sparkles, Crown, TrendingUp, ShoppingCart, Compass } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Project { id: string; name: string; industry?: string; language?: string }

interface ClusterArticle {
  title: string
  keyword: string
  intent: 'informational' | 'commercial' | 'transactional' | 'navigational'
  priority: 'high' | 'medium' | 'low'
  description: string
  questionAngle: string
  wordCount: number
  aiCitationPotential: 'high' | 'medium' | 'low'
}

interface TopicalMap {
  pillar: {
    title: string
    keyword: string
    description: string
    wordCount: number
  }
  clusters: ClusterArticle[]
}

const INTENT_ICONS: Record<string, React.ElementType> = {
  informational: TrendingUp,
  commercial: ShoppingCart,
  transactional: ArrowRight,
  navigational: Compass,
}

const INTENT_COLORS: Record<string, string> = {
  informational: 'bg-blue-50 text-blue-700 border-blue-100',
  commercial: 'bg-purple-50 text-purple-700 border-purple-100',
  transactional: 'bg-green-50 text-green-700 border-green-100',
  navigational: 'bg-gray-100 text-gray-600 border-gray-200',
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-50 text-red-600',
  medium: 'bg-yellow-50 text-yellow-600',
  low: 'bg-gray-100 text-gray-500',
}

const AI_COLORS: Record<string, string> = {
  high: 'text-emerald-600',
  medium: 'text-yellow-500',
  low: 'text-gray-400',
}

export default function TopicalMapClient({ projects }: { projects: Project[] }) {
  const router = useRouter()
  const [topic, setTopic] = useState('')
  const [projectId, setProjectId] = useState('')
  const [loading, setLoading] = useState(false)
  const [map, setMap] = useState<TopicalMap | null>(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<string>('all')

  const selectedProject = projects.find(p => p.id === projectId)

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!topic.trim()) return
    setLoading(true)
    setError('')
    setMap(null)
    setFilter('all')

    try {
      const res = await fetch('/api/topical-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          industry: selectedProject?.industry ?? '',
          language: selectedProject?.language ?? 'English',
        }),
      })
      if (!res.ok) throw new Error('Failed to generate topical map')
      const data = await res.json()
      setMap(data.map)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function writeArticle(keyword: string) {
    const params = new URLSearchParams({ keyword })
    if (projectId) params.set('project', projectId)
    router.push(`/writer/new?${params}`)
  }

  const filtered = map ? (filter === 'all' ? map.clusters : map.clusters.filter(c => c.priority === filter)) : []
  const high = map?.clusters.filter(c => c.priority === 'high').length ?? 0
  const highAI = map?.clusters.filter(c => c.aiCitationPotential === 'high').length ?? 0

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Map className="w-5 h-5 text-indigo-500" />
          <h1 className="text-2xl font-bold text-gray-900">Topical Map</h1>
        </div>
        <p className="text-gray-500">Build a full content cluster — pillar page + 12 supporting articles to establish topical authority.</p>
      </div>

      <form onSubmit={handleGenerate} className="max-w-2xl mb-8">
        <div className="flex gap-3">
          <input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. email marketing, project management software, keto diet..."
            required
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
            {loading ? 'Mapping...' : 'Generate map'}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg mb-6 max-w-2xl">{error}</p>}

      {loading && (
        <div className="max-w-3xl">
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Building your topical map...</p>
            <p className="text-gray-400 text-sm mt-1">Identifying pillar topic, mapping 12 cluster articles</p>
          </div>
        </div>
      )}

      {map && (
        <div className="max-w-4xl space-y-6">
          {/* Stats bar */}
          <div className="flex items-center gap-6 text-sm">
            <span className="text-gray-700 font-medium">13 articles total</span>
            <span className="text-red-600 font-medium">{high} high priority</span>
            {highAI > 0 && (
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                {highAI} high AI potential
              </span>
            )}
          </div>

          {/* Pillar article */}
          <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl border-2 border-indigo-200 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Pillar Article</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{map.pillar.title}</h3>
                <p className="text-sm text-indigo-700 font-medium mb-2">Keyword: {map.pillar.keyword}</p>
                <p className="text-sm text-gray-600">{map.pillar.description}</p>
                <p className="text-xs text-gray-400 mt-2">~{map.pillar.wordCount} words</p>
              </div>
              <button
                onClick={() => writeArticle(map.pillar.keyword)}
                className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex-shrink-0"
              >
                Write <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'high', 'medium', 'low'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize',
                  filter === f
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                )}
              >
                {f === 'all' ? `All (${map.clusters.length})` : `${f} priority (${map.clusters.filter(c => c.priority === f).length})`}
              </button>
            ))}
          </div>

          {/* Cluster articles */}
          <div className="grid grid-cols-1 gap-3">
            {filtered.map((article, i) => {
              const IntentIcon = INTENT_ICONS[article.intent] ?? TrendingUp
              return (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-200 hover:shadow-sm transition-all group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium border capitalize flex items-center gap-1', INTENT_COLORS[article.intent])}>
                          <IntentIcon className="w-3 h-3" />
                          {article.intent}
                        </span>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium capitalize', PRIORITY_COLORS[article.priority])}>
                          {article.priority} priority
                        </span>
                        <span className={cn('text-xs font-medium flex items-center gap-0.5', AI_COLORS[article.aiCitationPotential])}>
                          {article.aiCitationPotential === 'high' && <Sparkles className="w-3 h-3" />}
                          {article.aiCitationPotential} AI
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-900 mb-1">{article.title}</h4>
                      <p className="text-xs text-indigo-600 font-medium mb-2">{article.keyword}</p>
                      <p className="text-xs text-gray-500 mb-1">{article.description}</p>
                      <p className="text-xs text-gray-400 italic">{article.questionAngle}</p>
                      <p className="text-xs text-gray-400 mt-1">~{article.wordCount} words</p>
                    </div>
                    <button
                      onClick={() => writeArticle(article.keyword)}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1 whitespace-nowrap"
                    >
                      Write <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!loading && !map && !error && (
        <div className="max-w-xl text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
          <Map className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium mb-1">Enter a topic to build your content cluster</p>
          <p className="text-gray-400 text-xs max-w-xs mx-auto">Get a pillar article + 12 supporting articles with keywords, intent labels, and AI citation potential.</p>
        </div>
      )}
    </div>
  )
}
