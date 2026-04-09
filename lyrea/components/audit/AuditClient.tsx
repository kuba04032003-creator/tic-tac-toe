'use client'

import { useState } from 'react'
import {
  Search, Loader2, CheckCircle, AlertTriangle, XCircle, Sparkles,
  ExternalLink, FileText, Image, Link2, Code2, AlignLeft,
  Globe, Share2, Heading1, BarChart3,
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
  scores: {
    title: ScoreItem
    description: ScoreItem
    h1: ScoreItem
    images: ScoreItem
    schema: ScoreItem
    overall: number
  }
  aiAnalysis: string
}

/* ─── Score ring (SVG donut) ──────────────────────────────────────────────── */
function ScoreRing({ score }: { score: number }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const filled = (score / 100) * circ
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444'
  const label = score >= 80 ? 'Good' : score >= 50 ? 'Needs Work' : 'Poor'
  const textColor = score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle
            cx="64" cy="64" r={r} fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={`${filled} ${circ}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(.4,0,.2,1)' }}
          />
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
  const track = 'bg-gray-100 rounded-full h-2 mt-1.5 overflow-hidden'
  const fill =
    status === 'good' ? 'bg-green-500' :
    status === 'warn' ? 'bg-yellow-400' :
    'bg-red-500'
  return (
    <div className={track}>
      <div
        className={cn('h-2 rounded-full transition-all duration-700', fill)}
        style={{ width: `${score}%` }}
      />
    </div>
  )
}

/* ─── Status icon ─────────────────────────────────────────────────────────── */
function StatusIcon({ status, size = 'sm' }: { status: 'good' | 'warn' | 'fail'; size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'w-5 h-5' : 'w-4 h-4'
  if (status === 'good') return <CheckCircle className={cn(cls, 'text-green-500 flex-shrink-0')} />
  if (status === 'warn') return <AlertTriangle className={cn(cls, 'text-yellow-500 flex-shrink-0')} />
  return <XCircle className={cn(cls, 'text-red-500 flex-shrink-0')} />
}

/* ─── Circular mini-ring for ratios ──────────────────────────────────────── */
function MiniRing({ ratio, color }: { ratio: number; color: string }) {
  const r = 16
  const circ = 2 * Math.PI * r
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
function StatCard({
  icon: Icon, label, value, sub, ring,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  ring?: { ratio: number; color: string }
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
      <div className="flex-shrink-0">
        {ring
          ? <MiniRing ratio={ring.ratio} color={ring.color} />
          : <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
              <Icon className="w-5 h-5 text-gray-400" />
            </div>
        }
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold text-gray-900 leading-tight">{value}</div>
        <div className="text-xs font-medium text-gray-500">{label}</div>
        {sub && <div className="text-xs text-gray-400">{sub}</div>}
      </div>
    </div>
  )
}

/* ─── AI bullet parser ────────────────────────────────────────────────────── */
function AIBullets({ text }: { text: string }) {
  const lines = text
    .split('\n')
    .map(l => l.replace(/^[\-\*•]\s*/, '').trim())
    .filter(Boolean)

  return (
    <ul className="space-y-2">
      {lines.map((line, i) => {
        const isFix = /fix|missing|no |not |fail|add |improve|low|short|long/i.test(line)
        const isWin = /good|great|detected|all |100%|found|correct|present/i.test(line)
        const icon = isWin
          ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
          : isFix
          ? <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          : <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
        return (
          <li key={i} className="flex items-start gap-2.5 text-sm text-indigo-950">
            {icon}
            <span className="leading-snug">{line}</span>
          </li>
        )
      })}
    </ul>
  )
}

/* ─── Section card ────────────────────────────────────────────────────────── */
function Card({ title, icon: Icon, children, className }: {
  title: string; icon?: React.ElementType; children: React.ReactNode; className?: string
}) {
  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 p-5', className)}>
      <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {title}
      </h3>
      {children}
    </div>
  )
}

/* ─── Meta row ────────────────────────────────────────────────────────────── */
function MetaRow({ label, value, status }: { label: string; value: string | null; status?: 'good' | 'warn' | 'fail' }) {
  const missing = value === null || value === ''
  return (
    <div className="flex items-start gap-2 py-2 border-b border-gray-50 last:border-0">
      <div className="w-28 flex-shrink-0 text-xs text-gray-400 pt-0.5">{label}</div>
      <div className="flex-1 min-w-0">
        {missing
          ? <span className={cn('text-xs font-medium', status === 'fail' ? 'text-red-500' : 'text-yellow-600')}>
              Not set
            </span>
          : <span className="text-xs text-gray-800 break-words leading-relaxed">{value}</span>
        }
      </div>
      {status && !missing && (
        <StatusIcon status={status} />
      )}
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

/* ─── Score check labels ──────────────────────────────────────────────────── */
const checkLabels: Record<string, string> = {
  title: 'Page Title',
  description: 'Meta Description',
  h1: 'H1 Heading',
  images: 'Image Alt Text',
  schema: 'Schema Markup',
}

/* ─── Main component ──────────────────────────────────────────────────────── */
export default function AuditClient() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AuditResult | null>(null)
  const [error, setError] = useState('')

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
      setResult(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audit failed')
    } finally {
      setLoading(false)
    }
  }

  const altRatio = result
    ? result.images.total === 0 ? 1 : result.images.withAlt / result.images.total
    : 0
  const altColor = altRatio === 1 ? '#22c55e' : altRatio >= 0.7 ? '#eab308' : '#ef4444'
  const linkTotal = result ? result.links.total || 1 : 1
  const intRatio = result ? result.links.internal / linkTotal : 0

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">SEO Audit</h1>
        <p className="text-gray-500 mt-1 text-sm">Analyse any website and get a full SEO report with AI recommendations.</p>
      </div>

      {/* URL form */}
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

      {/* Loading skeleton */}
      {loading && (
        <div className="max-w-4xl space-y-4 animate-pulse">
          <div className="h-5 w-64 bg-gray-100 rounded" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-48 bg-gray-100 rounded-xl" />
            <div className="col-span-2 h-48 bg-gray-100 rounded-xl" />
          </div>
          <div className="h-32 bg-gray-100 rounded-xl" />
          <div className="grid grid-cols-4 gap-3">
            {[0,1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
          </div>
        </div>
      )}

      {result && (
        <div className="max-w-4xl space-y-5">
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
            {/* Score ring */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-center justify-center">
              <ScoreRing score={result.scores.overall} />
            </div>

            {/* Score breakdown */}
            <Card title="Score Breakdown" icon={BarChart3} className="col-span-2">
              <div className="space-y-3">
                {(['title', 'description', 'h1', 'images', 'schema'] as const).map(key => (
                  <div key={key}>
                    <div className="flex items-center gap-2">
                      <StatusIcon status={result.scores[key].status} />
                      <span className="text-xs font-semibold text-gray-500 w-28 flex-shrink-0">
                        {checkLabels[key]}
                      </span>
                      <span className="text-sm text-gray-700 flex-1 truncate">{result.scores[key].message}</span>
                      <span className={cn(
                        'text-sm font-bold w-8 text-right',
                        result.scores[key].status === 'good' ? 'text-green-600' :
                        result.scores[key].status === 'warn' ? 'text-yellow-600' : 'text-red-600'
                      )}>
                        {result.scores[key].score}
                      </span>
                    </div>
                    <div className="pl-6">
                      <ScoreBar score={result.scores[key].score} status={result.scores[key].status} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* AI Analysis */}
          <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-indigo-900">AI Analysis & Recommendations</h3>
            </div>
            <AIBullets text={result.aiAnalysis} />
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            <StatCard
              icon={AlignLeft}
              label="Word Count"
              value={result.content.wordCount.toLocaleString()}
              sub={result.content.wordCount < 300 ? 'Too thin' : result.content.wordCount < 800 ? 'Moderate' : 'Good length'}
            />
            <StatCard
              icon={Image}
              label="Images"
              value={`${result.images.withAlt} / ${result.images.total}`}
              sub="with alt text"
              ring={{ ratio: altRatio, color: altColor }}
            />
            <StatCard
              icon={Link2}
              label="Links"
              value={`${result.links.total}`}
              sub={`${result.links.internal} int · ${result.links.external} ext`}
              ring={{ ratio: intRatio, color: '#6366f1' }}
            />
            <StatCard
              icon={Code2}
              label="Schema Types"
              value={result.schema.types.length > 0 ? result.schema.types.length.toString() : 'None'}
              sub={result.schema.detected ? result.schema.types.slice(0, 2).join(', ') : 'No JSON-LD found'}
            />
          </div>

          {/* Detail grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Meta tags */}
            <Card title="Meta Tags" icon={FileText}>
              <div>
                <MetaRow
                  label={`Title (${result.meta.titleLength})`}
                  value={result.meta.title}
                  status={result.scores.title.status}
                />
                <MetaRow
                  label={`Description (${result.meta.descriptionLength})`}
                  value={result.meta.description}
                  status={result.scores.description.status}
                />
                <MetaRow label="Canonical" value={result.meta.canonical} status={result.meta.canonical ? 'good' : 'warn'} />
                <MetaRow label="Robots" value={result.meta.robots} />
                <MetaRow
                  label="Viewport"
                  value={result.meta.viewport}
                  status={result.meta.viewport ? 'good' : 'fail'}
                />
                <MetaRow label="Charset" value={result.meta.charset} />
              </div>
            </Card>

            {/* Open Graph */}
            <Card title="Open Graph / Social" icon={Share2}>
              <div>
                <MetaRow label="OG Title" value={result.og.title} status={result.og.title ? 'good' : 'warn'} />
                <MetaRow label="OG Description" value={result.og.description} status={result.og.description ? 'good' : 'warn'} />
                <MetaRow label="OG Image" value={result.og.image} status={result.og.image ? 'good' : 'warn'} />
                <MetaRow label="OG Type" value={result.og.type} />
              </div>
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
                      {result.headings.h2.slice(0, 5).map((h, i) => (
                        <Tag key={i}>{h.slice(0, 40)}{h.length > 40 ? '…' : ''}</Tag>
                      ))}
                      {result.headings.h2.length > 5 && <Tag>+{result.headings.h2.length - 5} more</Tag>}
                    </div>
                  </div>
                )}
                {result.headings.h3.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-gray-700 mb-1.5">H3 <span className="font-normal text-gray-400">({result.headings.h3.length})</span></div>
                    <div className="flex flex-wrap">
                      {result.headings.h3.slice(0, 4).map((h, i) => (
                        <Tag key={i} variant="indigo">{h.slice(0, 35)}{h.length > 35 ? '…' : ''}</Tag>
                      ))}
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
                  <span className={cn(
                    'text-xs font-bold',
                    altRatio === 1 ? 'text-green-600' : altRatio >= 0.7 ? 'text-yellow-600' : 'text-red-600'
                  )}>
                    {result.images.total === 0
                      ? 'No images'
                      : `${result.images.withAlt} / ${result.images.total}`}
                  </span>
                </div>
                {result.images.total > 0 && (
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-700"
                      style={{ width: `${altRatio * 100}%`, backgroundColor: altColor }}
                    />
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

      {/* Empty state */}
      {!loading && !result && !error && (
        <div className="max-w-lg">
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
  )
}
