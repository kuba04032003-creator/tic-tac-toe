'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Loader2, Search, ArrowRight, Copy, Check, ChevronDown, ChevronRight, Sparkles, Target, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Project { id: string; name: string; industry?: string; language?: string }

interface OutlineItem {
  heading: string
  type: string
  notes: string
  subheadings?: { heading: string; type: string; notes: string }[]
}

interface Brief {
  titles: string[]
  metaDescription: string
  contentType: string
  targetWordCount: number
  readingLevel: string
  outline: OutlineItem[]
  questionsToAnswer: string[]
  semanticKeywords: string[]
  competitorAngles: string[]
  featuredSnippetOpportunity: string
  callToAction: string
  internalLinkTopics: string[]
  estimatedReadTime: number
  aiCitationTip: string
}

const CONTENT_TYPE_COLORS: Record<string, string> = {
  'how-to': 'bg-blue-50 text-blue-700',
  listicle: 'bg-purple-50 text-purple-700',
  comparison: 'bg-yellow-50 text-yellow-700',
  guide: 'bg-indigo-50 text-indigo-700',
  'case-study': 'bg-pink-50 text-pink-700',
  review: 'bg-orange-50 text-orange-700',
  pillar: 'bg-emerald-50 text-emerald-700',
}

const LEVEL_COLORS: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700',
}

export default function BriefClient({ projects }: { projects: Project[] }) {
  const router = useRouter()
  const [keyword, setKeyword] = useState('')
  const [projectId, setProjectId] = useState('')
  const [audience, setAudience] = useState('')
  const [loading, setLoading] = useState(false)
  const [brief, setBrief] = useState<Brief | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [expandedH2s, setExpandedH2s] = useState<Set<number>>(new Set())
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null)

  const selectedProject = projects.find(p => p.id === projectId)

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!keyword.trim()) return
    setLoading(true)
    setError('')
    setBrief(null)
    setExpandedH2s(new Set())

    try {
      const res = await fetch('/api/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: keyword.trim(),
          industry: selectedProject?.industry ?? '',
          language: selectedProject?.language ?? 'English',
          audience: audience.trim(),
        }),
      })
      if (!res.ok) throw new Error('Failed to generate brief')
      const data = await res.json()
      setBrief(data.brief)
      setExpandedH2s(new Set(data.brief.outline.map((_: OutlineItem, i: number) => i)))
    setSelectedTitle(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function copyBrief() {
    if (!brief) return
    const text = [
      `# Content Brief: ${keyword}`,
      ``,
      `## Recommended Titles`,
      ...brief.titles.map((t, i) => `${i + 1}. ${t}`),
      ``,
      `## Meta Description`,
      brief.metaDescription,
      ``,
      `## Content Type: ${brief.contentType} | Target: ${brief.targetWordCount} words | Level: ${brief.readingLevel}`,
      ``,
      `## Outline`,
      ...brief.outline.flatMap(h => [
        `### ${h.heading}`,
        `Notes: ${h.notes}`,
        ...(h.subheadings?.flatMap(s => [`#### ${s.heading}`, `Notes: ${s.notes}`]) ?? []),
      ]),
      ``,
      `## Questions to Answer`,
      ...brief.questionsToAnswer.map(q => `- ${q}`),
      ``,
      `## Semantic Keywords`,
      brief.semanticKeywords.join(', '),
      ``,
      `## Competitor Angles`,
      ...brief.competitorAngles.map(a => `- ${a}`),
      ``,
      `## Featured Snippet Opportunity`,
      brief.featuredSnippetOpportunity,
      ``,
      `## AI Citation Tip`,
      brief.aiCitationTip,
    ].join('\n')

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function writeFromBrief(overrideTitle?: string) {
    const chosenTitle = overrideTitle ?? selectedTitle ?? ''
    const params = new URLSearchParams({ keyword: keyword.trim() })
    if (chosenTitle) params.set('title', chosenTitle)
    if (projectId) params.set('project', projectId)
    router.push(`/writer/new?${params}`)
  }

  function toggleH2(i: number) {
    setExpandedH2s(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-5 h-5 text-indigo-500" />
          <h1 className="text-2xl font-bold text-gray-900">Content Brief</h1>
        </div>
        <p className="text-gray-500">Generate a full SEO content brief before writing — outline, questions, semantic keywords, and AI citation tips.</p>
      </div>

      <form onSubmit={handleGenerate} className="max-w-2xl mb-8">
        <div className="flex gap-3 mb-3">
          <input
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Target keyword or topic..."
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
        </div>
        <div className="flex gap-3">
          <input
            value={audience}
            onChange={e => setAudience(e.target.value)}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            placeholder="Target audience (optional) e.g. SaaS founders, beginners, marketers..."
          />
          <button
            type="submit"
            disabled={loading || !keyword.trim()}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Generating...' : 'Generate brief'}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg mb-6 max-w-2xl">{error}</p>}

      {loading && (
        <div className="max-w-3xl">
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Generating your content brief...</p>
            <p className="text-gray-400 text-sm mt-1">Analysing keyword, crafting outline, identifying questions</p>
          </div>
        </div>
      )}

      {brief && (
        <div className="max-w-3xl space-y-5">
          {/* Header actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium capitalize', CONTENT_TYPE_COLORS[brief.contentType] ?? 'bg-gray-100 text-gray-600')}>
                {brief.contentType}
              </span>
              <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium capitalize', LEVEL_COLORS[brief.readingLevel] ?? 'bg-gray-100 text-gray-600')}>
                {brief.readingLevel}
              </span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                ~{brief.targetWordCount} words
              </span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                ~{brief.estimatedReadTime} min read
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyBrief}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy brief'}
              </button>
              <button
                onClick={() => writeFromBrief()}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium"
                title={selectedTitle ? `Write: ${selectedTitle}` : 'Write article from this brief'}
              >
                {selectedTitle ? 'Write selected' : 'Write article'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Recommended titles */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-500" /> Recommended Titles
            </h3>
            <p className="text-xs text-gray-400 mb-3">Click a title to select it, then click &ldquo;Write selected&rdquo; to generate.</p>
            <div className="space-y-2">
              {brief.titles.map((t, i) => {
                const isSelected = selectedTitle === t
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedTitle(isSelected ? null : t)}
                    className={cn(
                      'flex items-start gap-3 group rounded-lg px-3 py-2.5 cursor-pointer transition-all border',
                      isSelected
                        ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200'
                        : 'border-transparent hover:bg-gray-50 hover:border-gray-200'
                    )}
                  >
                    <span className={cn(
                      'text-xs font-bold mt-0.5 w-4 flex-shrink-0',
                      isSelected ? 'text-indigo-500' : 'text-gray-400'
                    )}>{i + 1}</span>
                    <p className={cn(
                      'text-sm font-medium flex-1 leading-snug',
                      isSelected ? 'text-indigo-900' : 'text-gray-800'
                    )}>{t}</p>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(t) }}
                        title="Copy title"
                        className="p-1 rounded hover:bg-gray-200 transition-colors"
                      >
                        <Copy className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); writeFromBrief(t) }}
                        title="Write article with this title"
                        className="flex items-center gap-0.5 text-xs text-indigo-600 hover:text-white hover:bg-indigo-600 font-medium border border-indigo-200 hover:border-indigo-600 px-2 py-0.5 rounded-md transition-all"
                      >
                        Write <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    {isSelected && (
                      <span className="flex-shrink-0 text-indigo-500 mt-0.5">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-1">Meta Description</p>
              <p className="text-xs text-gray-600">{brief.metaDescription}</p>
            </div>
          </div>

          {/* Outline */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-500" /> Article Outline
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {brief.outline.map((section, i) => (
                <div key={i}>
                  <button
                    onClick={() => toggleH2(i)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-indigo-500 uppercase bg-indigo-50 px-1.5 py-0.5 rounded">H2</span>
                      <span className="text-sm font-semibold text-gray-900">{section.heading}</span>
                    </div>
                    {expandedH2s.has(i)
                      ? <ChevronDown className="w-4 h-4 text-gray-400" />
                      : <ChevronRight className="w-4 h-4 text-gray-400" />
                    }
                  </button>
                  {expandedH2s.has(i) && (
                    <div className="px-5 pb-4 bg-gray-50">
                      <p className="text-xs text-gray-500 mb-3 italic">{section.notes}</p>
                      {section.subheadings?.map((sub, j) => (
                        <div key={j} className="ml-4 mb-2 last:mb-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-gray-400 uppercase bg-gray-200 px-1.5 py-0.5 rounded">H3</span>
                            <span className="text-sm text-gray-800 font-medium">{sub.heading}</span>
                          </div>
                          <p className="text-xs text-gray-400 ml-12 italic">{sub.notes}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Questions to answer */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Questions to Answer</h3>
            <ul className="space-y-2">
              {brief.questionsToAnswer.map((q, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <span className="text-indigo-400 font-bold flex-shrink-0 mt-0.5">?</span>
                  {q}
                </li>
              ))}
            </ul>
          </div>

          {/* Semantic keywords + competitor angles */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Semantic Keywords</h3>
              <div className="flex flex-wrap gap-1.5">
                {brief.semanticKeywords.map((kw, i) => (
                  <span key={i} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full font-medium">{kw}</span>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Competitor Angles</h3>
              <ul className="space-y-2">
                {brief.competitorAngles.map((a, i) => (
                  <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                    <span className="text-emerald-500 font-bold flex-shrink-0">→</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Featured snippet + AI tip */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-amber-50 rounded-xl border border-amber-100 p-5">
              <h3 className="text-sm font-bold text-amber-900 mb-2">Featured Snippet Tip</h3>
              <p className="text-xs text-amber-800">{brief.featuredSnippetOpportunity}</p>
            </div>
            <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-5">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <h3 className="text-sm font-bold text-indigo-900">AI Citation Tip</h3>
              </div>
              <p className="text-xs text-indigo-800">{brief.aiCitationTip}</p>
            </div>
          </div>

          {/* CTA + internal links */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">Recommended CTA</h3>
                <p className="text-xs text-gray-600">{brief.callToAction}</p>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">Internal Link Topics</h3>
                <div className="flex flex-wrap gap-1.5">
                  {brief.internalLinkTopics.map((t, i) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !brief && !error && (
        <div className="max-w-xl text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium mb-1">Enter a keyword to generate your brief</p>
          <p className="text-gray-400 text-xs max-w-xs mx-auto">Get titles, outline, questions, semantic keywords, featured snippet tips and AI citation advice.</p>
        </div>
      )}
    </div>
  )
}
