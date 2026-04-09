'use client'

import { useState, useEffect } from 'react'
import {
  Search, Loader2, CheckCircle, AlertTriangle, XCircle, Sparkles,
  ExternalLink, FileText, Image, Link2, Code2, AlignLeft,
  Globe, Share2, Heading1, BarChart3, Clock, ChevronRight, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScoreItem {
  score: number
  status: 'good' | 'warn' | 'fail'
  message: string
}

interface AuditResult {
  url: string
  fetchedAt: string
  meta: {
    title: string | null
    titleLength: number
    description: string | null
    descriptionLength: number
    canonical: string | null
    robots: string | null
    viewport: string | null
    charset: string | null
  }
  og: { title: string | null; description: string | null; image: string | null; type: string | null }
  headings: { h1: string[]; h2: string[]; h3: string[] }
  content: { wordCount: number; textLength: number }
  images: { total: number; withAlt: number; withoutAlt: number; missingAlt: string[] }
  links: { internal: number; external: number; total: number }
  schema: { detected: boolean; types: string[] }
  keywords: { word: string; count: number }[]
  scores: {
    title: ScoreItem
    description: ScoreItem
    h1: ScoreItem
    images: ScoreItem
    schema: ScoreItem
    overall: number
  }
  aiAnalysis: {
    summary: string
    wins: string[]
    fixes: { issue: string; action: string; priority: 'high' | 'medium' | 'low' }[]
  }
}

interface HistoryEntry {
  url: string
  fetchedAt: string
  overall: number
  title: string | null
  result: AuditResult
}

const HISTORY_KEY = 'lyrea_audit_history'

function loadHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') } catch { return [] }
}

function saveToHistory(result: AuditResult) {
  const entry: HistoryEntry = {
    url: result.url,
    fetchedAt: result.fetchedAt,
    overall: result.scores.overall,
    title: result.meta.title,
    result,
  }
  const prev = loadHistory().filter(h => h.url !== result.url)
  localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...prev].slice(0, 10)))
}

/* ─── Score ring ──────────────────────────────────────────────────────────── */
function ScoreRing({ score }: { score: number }) {
  const r = 54, circ = 2 * Math.PI * r
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444'
  const label = score >= 80 ? 'Good' : score >= 50 ? 'Needs Work' : 'Poor'
  const textColor = score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600'
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle cx="64" cy="64" r={r} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-4xl font-bold leading-none', textColor)}>{score}</span>
          <span className="text-xs text-gray-400 mt-1">/100</span>
        </div>
      </div>
      <span className={cn('text-sm font-semibold', textColor)}>{label}</span>
      <span className="text-xs text-gray-400">Overall SEO Score</span>
    </div>
  )
}

/* ─── Score bar ───────────────────────────────────────────────────────────── */
function ScoreBar({ score, status }: { score: number; status: 'good' | 'warn' | 'fail' }) {
  const fill = status === 'good' ? 'bg-green-500' : status === 'warn' ? 'bg-yellow-400' : 'bg-red-500'
  return (
    <div className="bg-gray-100 rounded-full h-2 mt-1.5 overflow-hidden">
      <div className={cn('h-2 rounded-full transition-all duration-700', fill)} style={{ width: `${score}%` }} />
    </div>
  )
}

/* ─── Status icon ─────────────────────────────────────────────────────────── */
function StatusIcon({ status }: { status: 'good' | 'warn' | 'fail' }) {
  if (status === 'good') return <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
  if (status === 'warn') return <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
  return <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
}

/* ─── Mini ring ───────────────────────────────────────────────────────────── */
function MiniRing({ ratio, color }: { ratio: number; color: string }) {
  const r = 16, circ = 2 * Math.PI * r
  return (
    <svg className="-rotate-90" width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
      <circle cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${ratio * circ} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.7s ease' }} />
    </svg>
  )
}

/* ─── Stat card ───────────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, ring }: {
  icon: React.ElementType; label: string; value: string; sub?: string
  ring?: { ratio: number; color: string }
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
      <div className="flex-shrink-0">
        {ring
          ? <MiniRing ratio={ring.ratio} color={ring.color} />
          : <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
              <Icon className="w-5 h-5 text-gray-400" />
            </div>}
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold text-gray-900 leading-tight">{value}</div>
        <div className="text-xs font-medium text-gray-500">{label}</div>
        {sub && <div className="text-xs text-gray-400">{sub}</div>}
      </div>
    </div>
  )
}

/* ─── Section card ────────────────────────────────────────────────────────── */
function Card({ title, icon: Icon, children, className }: {
  title: string; icon?: React.ElementType; children: React.ReactNode; className?: string
}) {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 p-5', className)}>
      <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
        {Icon && <Icon className="w-3.5 h-3.5" />}{title}
      </h3>
      {children}
    </div>
  )
}

/* ─── Meta row ────────────────────────────────────────────────────────────── */
function MetaRow({ label, value, status }: { label: string; value: string | null; status?: 'good' | 'warn' | 'fail' }) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-gray-50 last:border-0">
      <div className="w-28 flex-shrink-0 text-xs text-gray-400 pt-0.5">{label}</div>
      <div className="flex-1 min-w-0">
        {!value
          ? <span className={cn('text-xs font-medium', status === 'fail' ? 'text-red-500' : 'text-yellow-600')}>Not set</span>
          : <span className="text-xs text-gray-800 break-words leading-relaxed">{value}</span>}
      </div>
      {status && value && <StatusIcon status={status} />}
    </div>
  )
}

/* ─── Tag ─────────────────────────────────────────────────────────────────── */
function Tag({ children, variant = 'gray' }: { children: React.ReactNode; variant?: 'gray' | 'green' | 'red' | 'indigo' }) {
  return (
    <span className={cn('inline-block text-xs px-2 py-0.5 rounded-full font-medium mr-1 mb-1', {
      'bg-gray-100 text-gray-600': variant === 'gray',
      'bg-green-100 text-green-700': variant === 'green',
      'bg-red-100 text-red-700': variant === 'red',
      'bg-indigo-100 text-indigo-700': variant === 'indigo',
    })}>
      {children}
    </span>
  )
}

/* ─── Priority badge ──────────────────────────────────────────────────────── */
function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full', {
      'bg-red-100 text-red-700': priority === 'high',
      'bg-yellow-100 text-yellow-700': priority === 'medium',
      'bg-gray-100 text-gray-600': priority === 'low',
    })}>
      {priority === 'high' && <Zap className="w-3 h-3" />}
      {priority}
    </span>
  )
}

const checkLabels: Record<string, string> = {
  title: 'Page Title', description: 'Meta Description',
  h1: 'H1 Heading', images: 'Image Alt Text', schema: 'Schema Markup',
}

/* ─── AI recommendations panel ───────────────────────────────────────────── */
function AIPanel({ ai }: { ai: AuditResult['aiAnalysis'] }) {
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <h3 className="text-sm font-semibold text-indigo-900">AI Analysis & Recommendations</h3>
      </div>

      {ai.summary && (
        <p className="text-sm text-indigo-800 mb-4 leading-relaxed">{ai.summary}</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Wins */}
        {ai.wins.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">What's working</p>
            <ul className="space-y-2">
              {ai.wins.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-green-900">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="leading-snug">{w}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Fixes */}
        {ai.fixes.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Priority fixes</p>
            <ul className="space-y-2.5">
              {ai.fixes.map((f, i) => (
                <li key={i} className="bg-white/60 rounded-lg p-2.5 border border-white">
                  <div className="flex items-center gap-2 mb-1">
                    <PriorityBadge priority={f.priority} />
                    <span className="text-xs font-semibold text-gray-800">{f.issue}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-snug">{f.action}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Fallback if no structured data */}
        {ai.wins.length === 0 && ai.fixes.length === 0 && ai.summary && (
          <div className="col-span-2 text-sm text-indigo-900 whitespace-pre-wrap leading-relaxed">{ai.summary}</div>
        )}
      </div>
    </div>
  )
}

/* ─── Keyword density panel ───────────────────────────────────────────────── */
function KeywordPanel({ keywords }: { keywords: { word: string; count: number }[] }) {
  if (!keywords.length) return null
  const max = keywords[0].count
  return (
    <Card title="Keyword Density" icon={BarChart3}>
      <div className="space-y-2">
        {keywords.slice(0, 15).map(({ word, count }) => (
          <div key={word} className="flex items-center gap-3">
            <span className="text-xs font-mono text-gray-700 w-28 flex-shrink-0 truncate">{word}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-2 rounded-full bg-indigo-400 transition-all duration-500"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 w-6 text-right flex-shrink-0">{count}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ─── Audit history sidebar ───────────────────────────────────────────────── */
function HistorySidebar({
  history, onSelect, activeUrl,
}: {
  history: HistoryEntry[]
  onSelect: (r: AuditResult) => void
  activeUrl: string
}) {
  if (!history.length) return null
  return (
    <div className="w-64 flex-shrink-0">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
          <Clock className="w-3.5 h-3.5" /> Recent audits
        </h3>
        <ul className="space-y-1">
          {history.map(h => {
            const isActive = h.url === activeUrl
            const color = h.overall >= 80 ? 'text-green-600' : h.overall >= 50 ? 'text-yellow-600' : 'text-red-600'
            return (
              <li key={h.url + h.fetchedAt}>
                <button
                  onClick={() => onSelect(h.result)}
                  className={cn(
                    'w-full text-left flex items-center gap-2 px-2 py-2 rounded-lg text-xs transition-colors',
                    isActive ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-gray-50'
                  )}
                >
                  <span className={cn('font-bold w-7 flex-shrink-0', color)}>{h.overall}</span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-700">{new URL(h.url).hostname}</p>
                    <p className="text-gray-400">{new Date(h.fetchedAt).toLocaleDateString()}</p>
                  </div>
                  {isActive && <ChevronRight className="w-3 h-3 text-indigo-400 ml-auto flex-shrink-0" />}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

/* ─── Main ────────────────────────────────────────────────────────────────── */
export default function AuditClient() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AuditResult | null>(null)
  const [error, setError] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>([])

  useEffect(() => { setHistory(loadHistory()) }, [])

  async function handleAudit(e: React.FormEvent) {
    e.preventDefault()
    const target = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data: AuditResult = await res.json()
      setResult(data)
      saveToHistory(data)
      setHistory(loadHistory())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audit failed')
    } finally {
      setLoading(false)
    }
  }

  function selectHistory(r: AuditResult) {
    setResult(r)
    setUrl(r.url)
    setError('')
  }

  const altRatio = result
    ? result.images.total === 0 ? 1 : result.images.withAlt / result.images.total : 0
  const altColor = altRatio === 1 ? '#22c55e' : altRatio >= 0.7 ? '#eab308' : '#ef4444'
  const linkTotal = result ? result.links.total || 1 : 1
  const intRatio = result ? result.links.internal / linkTotal : 0

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">SEO Audit</h1>
        <p className="text-gray-500 mt-1 text-sm">Analyse any website and get a full SEO report with AI recommendations.</p>
      </div>

      <form onSubmit={handleAudit} className="flex gap-3 max-w-2xl mb-8">
        <div className="relative flex-1">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            placeholder="https://example.com"
            type="text"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap text-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? 'Auditing…' : 'Run Audit'}
        </button>
      </form>

      {error && (
        <div className="max-w-2xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading && (
        <div className="max-w-4xl space-y-4 animate-pulse">
          <div className="h-5 w-64 bg-gray-100 rounded" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-48 bg-gray-100 rounded-xl" />
            <div className="col-span-2 h-48 bg-gray-100 rounded-xl" />
          </div>
          <div className="h-40 bg-gray-100 rounded-xl" />
          <div className="grid grid-cols-4 gap-3">
            {[0,1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
          </div>
        </div>
      )}

      {/* Layout: sidebar + main content */}
      <div className="flex gap-6 items-start">
        {history.length > 0 && (
          <HistorySidebar
            history={history}
            onSelect={selectHistory}
            activeUrl={result?.url ?? ''}
          />
        )}

        {result && (
          <div className="flex-1 min-w-0 space-y-5">
            {/* Audit meta */}
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <a href={result.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-indigo-600 hover:underline font-medium text-sm">
                {result.url} <ExternalLink className="w-3 h-3" />
              </a>
              <span>·</span>
              <span>Audited at {new Date(result.fetchedAt).toLocaleTimeString()}</span>
            </div>

            {/* Score + breakdown */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center">
                <ScoreRing score={result.scores.overall} />
              </div>
              <Card title="Score Breakdown" icon={BarChart3} className="col-span-2">
                <div className="space-y-3">
                  {(['title', 'description', 'h1', 'images', 'schema'] as const).map(key => (
                    <div key={key}>
                      <div className="flex items-center gap-2">
                        <StatusIcon status={result.scores[key].status} />
                        <span className="text-xs font-semibold text-gray-500 w-28 flex-shrink-0">{checkLabels[key]}</span>
                        <span className="text-sm text-gray-700 flex-1 truncate">{result.scores[key].message}</span>
                        <span className={cn(
                          'text-sm font-bold w-8 text-right',
                          result.scores[key].status === 'good' ? 'text-green-600' :
                          result.scores[key].status === 'warn' ? 'text-yellow-600' : 'text-red-600'
                        )}>{result.scores[key].score}</span>
                      </div>
                      <div className="pl-6">
                        <ScoreBar score={result.scores[key].score} status={result.scores[key].status} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* AI Analysis — structured */}
            <AIPanel ai={result.aiAnalysis} />

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3">
              <StatCard icon={AlignLeft} label="Word Count" value={result.content.wordCount.toLocaleString()}
                sub={result.content.wordCount < 300 ? 'Too thin' : result.content.wordCount < 800 ? 'Moderate' : 'Good length'} />
              <StatCard icon={Image} label="Images" value={`${result.images.withAlt} / ${result.images.total}`}
                sub="with alt text" ring={{ ratio: altRatio, color: altColor }} />
              <StatCard icon={Link2} label="Links" value={`${result.links.total}`}
                sub={`${result.links.internal} int · ${result.links.external} ext`}
                ring={{ ratio: intRatio, color: '#6366f1' }} />
              <StatCard icon={Code2} label="Schema Types"
                value={result.schema.types.length > 0 ? result.schema.types.length.toString() : 'None'}
                sub={result.schema.detected ? result.schema.types.slice(0, 2).join(', ') : 'No JSON-LD found'} />
            </div>

            {/* Keyword density + detail grid */}
            <div className="grid grid-cols-2 gap-4">
              <KeywordPanel keywords={result.keywords} />

              {/* Meta tags */}
              <Card title="Meta Tags" icon={FileText}>
                <MetaRow label={`Title (${result.meta.titleLength})`} value={result.meta.title} status={result.scores.title.status} />
                <MetaRow label={`Description (${result.meta.descriptionLength})`} value={result.meta.description} status={result.scores.description.status} />
                <MetaRow label="Canonical" value={result.meta.canonical} status={result.meta.canonical ? 'good' : 'warn'} />
                <MetaRow label="Robots" value={result.meta.robots} />
                <MetaRow label="Viewport" value={result.meta.viewport} status={result.meta.viewport ? 'good' : 'fail'} />
                <MetaRow label="Charset" value={result.meta.charset} />
              </Card>

              {/* Open Graph */}
              <Card title="Open Graph / Social" icon={Share2}>
                <MetaRow label="OG Title" value={result.og.title} status={result.og.title ? 'good' : 'warn'} />
                <MetaRow label="OG Description" value={result.og.description} status={result.og.description ? 'good' : 'warn'} />
                <MetaRow label="OG Image" value={result.og.image} status={result.og.image ? 'good' : 'warn'} />
                <MetaRow label="OG Type" value={result.og.type} />
              </Card>

              {/* Heading structure */}
              <Card title="Heading Structure" icon={Heading1}>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-xs font-bold text-gray-700">H1</span>
                      <span className="text-xs text-gray-400">({result.headings.h1.length})</span>
                      <StatusIcon status={result.scores.h1.status} />
                    </div>
                    {result.headings.h1.length
                      ? result.headings.h1.map((h, i) => (
                          <p key={i} className="text-sm font-semibold text-gray-900 bg-gray-50 rounded px-2 py-1 mb-1">{h}</p>
                        ))
                      : <p className="text-xs text-red-500">No H1 found</p>}
                  </div>
                  {result.headings.h2.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-gray-700 mb-1.5">H2 <span className="font-normal text-gray-400">({result.headings.h2.length})</span></div>
                      <div className="flex flex-wrap">
                        {result.headings.h2.slice(0, 5).map((h, i) => <Tag key={i}>{h.slice(0, 40)}{h.length > 40 ? '…' : ''}</Tag>)}
                        {result.headings.h2.length > 5 && <Tag>+{result.headings.h2.length - 5} more</Tag>}
                      </div>
                    </div>
                  )}
                  {result.headings.h3.length > 0 && (
                    <div>
                      <div className="text-xs font-bold text-gray-700 mb-1.5">H3 <span className="font-normal text-gray-400">({result.headings.h3.length})</span></div>
                      <div className="flex flex-wrap">
                        {result.headings.h3.slice(0, 4).map((h, i) => <Tag key={i} variant="indigo">{h.slice(0, 35)}{h.length > 35 ? '…' : ''}</Tag>)}
                        {result.headings.h3.length > 4 && <Tag>+{result.headings.h3.length - 4} more</Tag>}
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Schema + images */}
              <Card title="Schema & Images" icon={Code2}>
                {result.schema.detected ? (
                  <div className="mb-4">
                    <p className="text-sm text-green-700 font-medium flex items-center gap-1.5 mb-2">
                      <CheckCircle className="w-4 h-4" /> Schema markup detected
                    </p>
                    <div className="flex flex-wrap">
                      {result.schema.types.map(t => <Tag key={t} variant="green">{t}</Tag>)}
                    </div>
                  </div>
                ) : (
                  <div className="mb-4 flex items-start gap-2 bg-red-50 rounded-lg px-3 py-2.5">
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-700">No JSON-LD schema found</p>
                      <p className="text-xs text-red-500 mt-0.5">Add structured data to improve rich results.</p>
                    </div>
                  </div>
                )}
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-600">Image alt coverage</span>
                    <span className={cn('text-xs font-bold',
                      altRatio === 1 ? 'text-green-600' : altRatio >= 0.7 ? 'text-yellow-600' : 'text-red-600'
                    )}>
                      {result.images.total === 0 ? 'No images' : `${result.images.withAlt} / ${result.images.total}`}
                    </span>
                  </div>
                  {result.images.total > 0 && (
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="h-2 rounded-full transition-all duration-700"
                        style={{ width: `${altRatio * 100}%`, backgroundColor: altColor }} />
                    </div>
                  )}
                  {result.images.withoutAlt > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-gray-400">Missing alt text:</p>
                      {result.images.missingAlt.map((src, i) => (
                        <p key={i} className="text-xs text-red-500 truncate font-mono bg-red-50 px-2 py-0.5 rounded">{src}</p>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Empty state (no history) */}
        {!loading && !result && !error && history.length === 0 && (
          <div className="flex-1">
            <div className="text-center py-14 bg-white rounded-xl border border-dashed border-gray-200">
              <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-indigo-400" />
              </div>
              <p className="text-gray-700 font-semibold mb-1">Enter a URL to begin</p>
              <p className="text-gray-400 text-sm max-w-xs mx-auto">
                Get a full SEO report — meta tags, headings, images, schema, links and AI recommendations.
              </p>
              <div className="grid grid-cols-3 gap-3 mt-6 mx-6">
                {[
                  { icon: BarChart3, label: 'Score breakdown' },
                  { icon: Sparkles, label: 'AI analysis' },
                  { icon: Code2, label: 'Schema check' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="bg-gray-50 rounded-lg py-3 flex flex-col items-center gap-1.5">
                    <Icon className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
