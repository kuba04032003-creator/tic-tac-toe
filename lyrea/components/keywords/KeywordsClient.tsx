'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, Loader2, ArrowRight, Copy, Check, Download,
  MessageSquare, BookOpen, BarChart2, ShoppingCart, Zap, TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Project { id: string; name: string; industry?: string; language?: string }

interface Keyword {
  keyword: string
  type: string
  volume: string
  difficulty: number
  relevance: number
}

interface Cluster {
  intent: string
  label: string
  description: string
  keywords: Keyword[]
}

const CLUSTER_ICONS: Record<string, React.ElementType> = {
  conversational: MessageSquare,
  informational: BookOpen,
  comparison: BarChart2,
  commercial: ShoppingCart,
  transactional: Zap,
}

const CLUSTER_COLORS: Record<string, { bg: string; border: string; badge: string; icon: string }> = {
  conversational: { bg: 'bg-violet-50', border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700', icon: 'text-violet-500' },
  informational: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', icon: 'text-blue-500' },
  comparison: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', icon: 'text-amber-500' },
  commercial: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700', icon: 'text-purple-500' },
  transactional: { bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', icon: 'text-emerald-500' },
}

function difficultyLabel(d: number) {
  if (d <= 30) return { label: 'Easy', color: 'text-emerald-600' }
  if (d <= 60) return { label: 'Medium', color: 'text-yellow-600' }
  return { label: 'Hard', color: 'text-red-500' }
}

function DifficultyBar({ value }: { value: number }) {
  const color = value <= 30 ? 'bg-emerald-400' : value <= 60 ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${value}%` }} />
      </div>
      <span className={cn('text-xs font-medium', difficultyLabel(value).color)}>{difficultyLabel(value).label}</span>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white rounded">
      {copied
        ? <Check className="w-3.5 h-3.5 text-emerald-500" />
        : <Copy className="w-3.5 h-3.5 text-gray-400 hover:text-indigo-500" />}
    </button>
  )
}

export default function KeywordsClient({ projects }: { projects: Project[] }) {
  const router = useRouter()
  const [seed, setSeed] = useState('')
  const [projectId, setProjectId] = useState('')
  const [loading, setLoading] = useState(false)
  const [clusters, setClusters] = useState<Cluster[]>([])
  const [error, setError] = useState('')
  const [activeCluster, setActiveCluster] = useState<string | null>(null)

  const selectedProject = projects.find(p => p.id === projectId)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!seed.trim()) return
    setLoading(true)
    setError('')
    setClusters([])
    setActiveCluster(null)

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
      setClusters(data.clusters ?? [])
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

  function exportAll() {
    const lines = clusters.flatMap(c => [
      `## ${c.label}`,
      ...c.keywords.map(k => `${k.keyword}\t${k.volume}\t${k.difficulty}/100\t${k.relevance}% relevant`),
      '',
    ])
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `keywords-${seed.replace(/\s+/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalKeywords = clusters.reduce((a, c) => a + c.keywords.length, 0)
  const displayed = activeCluster ? clusters.filter(c => c.intent === activeCluster) : clusters

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-5 h-5 text-indigo-500" />
          <h1 className="text-2xl font-bold text-gray-900">Keyword Research</h1>
        </div>
        <p className="text-gray-500">
          Generates long-tail, conversational queries optimised for AI search engines (ChatGPT, Perplexity, Google AI).
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} className="max-w-2xl mb-8">
        <div className="flex gap-3">
          <input
            value={seed}
            onChange={e => setSeed(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. gym workout, email marketing, keto diet..."
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
            disabled={loading || !seed.trim()}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Researching...' : 'Find keywords'}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg mb-6 max-w-2xl">{error}</p>}

      {loading && (
        <div className="max-w-2xl bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Generating long-tail keyword clusters...</p>
          <p className="text-gray-400 text-sm mt-1">Identifying conversational, question, and intent-based queries</p>
        </div>
      )}

      {clusters.length > 0 && (
        <div className="max-w-4xl space-y-6">
          {/* Stats + export bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span className="font-semibold text-gray-900">{totalKeywords} keywords across {clusters.length} clusters</span>
              <span className="text-gray-400">for &ldquo;{seed}&rdquo;</span>
            </div>
            <button
              onClick={exportAll}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export all
            </button>
          </div>

          {/* Cluster filter tabs */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveCluster(null)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                !activeCluster
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
              )}
            >
              All clusters ({clusters.length})
            </button>
            {clusters.map(c => {
              const colors = CLUSTER_COLORS[c.intent] ?? CLUSTER_COLORS.informational
              return (
                <button
                  key={c.intent}
                  onClick={() => setActiveCluster(activeCluster === c.intent ? null : c.intent)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    activeCluster === c.intent
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : `bg-white text-gray-600 border-gray-200 hover:border-indigo-300`
                  )}
                >
                  {c.label} ({c.keywords.length})
                </button>
              )
            })}
          </div>

          {/* Clusters */}
          {displayed.map(cluster => {
            const colors = CLUSTER_COLORS[cluster.intent] ?? CLUSTER_COLORS.informational
            const Icon = CLUSTER_ICONS[cluster.intent] ?? TrendingUp
            return (
              <div key={cluster.intent} className={cn('rounded-xl border overflow-hidden', colors.border)}>
                {/* Cluster header */}
                <div className={cn('px-5 py-4 flex items-center justify-between', colors.bg)}>
                  <div className="flex items-center gap-3">
                    <Icon className={cn('w-4 h-4', colors.icon)} />
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{cluster.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{cluster.description}</p>
                    </div>
                  </div>
                  <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full', colors.badge)}>
                    {cluster.keywords.length} queries
                  </span>
                </div>

                {/* Keywords */}
                <div className="bg-white divide-y divide-gray-100">
                  {cluster.keywords.map((kw, i) => (
                    <div key={i} className="px-5 py-3.5 flex items-center gap-4 group hover:bg-gray-50 transition-colors">
                      {/* Keyword text */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 font-medium leading-snug">{kw.keyword}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <DifficultyBar value={kw.difficulty} />
                          <span className="text-xs text-gray-400">
                            <span className="font-medium text-gray-700">{kw.relevance}%</span> relevant
                          </span>
                        </div>
                      </div>

                      {/* Volume */}
                      <div className="text-right flex-shrink-0 w-16">
                        <p className="text-sm font-semibold text-gray-900">{kw.volume}</p>
                        <p className="text-xs text-gray-400">/ mo</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <CopyButton text={kw.keyword} />
                        <button
                          onClick={() => writeArticle(kw.keyword)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded hover:bg-indigo-50 whitespace-nowrap"
                        >
                          Write <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && clusters.length === 0 && !error && (
        <div className="max-w-xl text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
          <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium mb-1">Enter a topic to discover keyword clusters</p>
          <p className="text-gray-400 text-xs max-w-xs mx-auto">
            Get long-tail, conversational queries grouped by intent — optimised for AI search engines and voice search.
          </p>
        </div>
      )}
    </div>
  )
}
