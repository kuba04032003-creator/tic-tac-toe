'use client'

import { useState } from 'react'
import { Search, Loader2, CheckCircle, AlertTriangle, XCircle, Sparkles, ExternalLink } from 'lucide-react'
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

function StatusIcon({ status }: { status: 'good' | 'warn' | 'fail' }) {
  if (status === 'good') return <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
  if (status === 'warn') return <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
  return <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
      <div className={cn('h-1.5 rounded-full transition-all', color)} style={{ width: `${score}%` }} />
    </div>
  )
}

function OverallScore({ score }: { score: number }) {
  const color = score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600'
  const bg = score >= 80 ? 'bg-green-50 border-green-200' : score >= 50 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
  const label = score >= 80 ? 'Good' : score >= 50 ? 'Needs Work' : 'Poor'
  return (
    <div className={cn('rounded-2xl border p-6 text-center', bg)}>
      <div className={cn('text-6xl font-bold mb-1', color)}>{score}</div>
      <div className={cn('text-sm font-semibold', color)}>{label}</div>
      <div className="text-xs text-gray-500 mt-1">Overall SEO Score</div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  )
}

function Tag({ children, variant = 'gray' }: { children: React.ReactNode; variant?: 'gray' | 'green' | 'red' }) {
  return (
    <span className={cn('inline-block text-xs px-2 py-0.5 rounded-full font-medium mr-1 mb-1', {
      'bg-gray-100 text-gray-600': variant === 'gray',
      'bg-green-100 text-green-700': variant === 'green',
      'bg-red-100 text-red-700': variant === 'red',
    })}>
      {children}
    </span>
  )
}

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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">SEO Audit</h1>
        <p className="text-gray-500 mt-1">Analyse any website and get a full SEO report with AI recommendations.</p>
      </div>

      <form onSubmit={handleAudit} className="flex gap-3 max-w-2xl mb-8">
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="https://example.com"
          type="text"
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? 'Auditing...' : 'Run audit'}
        </button>
      </form>

      {error && (
        <div className="max-w-2xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {result && (
        <div className="max-w-4xl space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <a href={result.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-600 hover:underline font-medium">
              {result.url} <ExternalLink className="w-3 h-3" />
            </a>
            <span>·</span>
            <span>Audited {new Date(result.fetchedAt).toLocaleTimeString()}</span>
          </div>

          {/* Top row: score + checks */}
          <div className="grid grid-cols-3 gap-4">
            <OverallScore score={result.scores.overall} />

            <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Score Breakdown</h3>
              <div className="space-y-3">
                {(['title', 'description', 'h1', 'images', 'schema'] as const).map(key => (
                  <div key={key}>
                    <div className="flex items-center gap-2">
                      <StatusIcon status={result.scores[key].status} />
                      <span className="text-sm text-gray-700 flex-1">{result.scores[key].message}</span>
                      <span className="text-sm font-semibold text-gray-900">{result.scores[key].score}</span>
                    </div>
                    <ScoreBar score={result.scores[key].score} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-semibold text-indigo-900">AI Analysis & Recommendations</h3>
            </div>
            <div className="text-sm text-indigo-900 whitespace-pre-wrap leading-relaxed">{result.aiAnalysis}</div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Word Count', value: result.content.wordCount.toLocaleString() },
              { label: 'Images', value: `${result.images.withAlt}/${result.images.total} alt` },
              { label: 'Links', value: `${result.links.internal} int · ${result.links.external} ext` },
              { label: 'Schema Types', value: result.schema.types.length > 0 ? result.schema.types.length.toString() : 'None' },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Two column detail */}
          <div className="grid grid-cols-2 gap-4">
            {/* Meta */}
            <Card title="Meta Tags">
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">Title ({result.meta.titleLength} chars)</dt>
                  <dd className="text-gray-900 font-medium">{result.meta.title ?? <span className="text-red-500">Missing</span>}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">Description ({result.meta.descriptionLength} chars)</dt>
                  <dd className="text-gray-700">{result.meta.description ?? <span className="text-red-500">Missing</span>}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">Canonical</dt>
                  <dd className="text-gray-700 text-xs break-all">{result.meta.canonical ?? <span className="text-yellow-600">Not set</span>}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">Robots</dt>
                  <dd className="text-gray-700">{result.meta.robots ?? 'Not set'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">Viewport</dt>
                  <dd className="text-gray-700 text-xs">{result.meta.viewport ?? <span className="text-red-500">Missing — not mobile-friendly</span>}</dd>
                </div>
              </dl>
            </Card>

            {/* Open Graph */}
            <Card title="Open Graph / Social">
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">OG Title</dt>
                  <dd className="text-gray-900">{result.og.title ?? <span className="text-yellow-600">Not set</span>}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">OG Description</dt>
                  <dd className="text-gray-700">{result.og.description ?? <span className="text-yellow-600">Not set</span>}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">OG Image</dt>
                  <dd className="text-gray-700 text-xs break-all">{result.og.image ?? <span className="text-yellow-600">Not set</span>}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-400 mb-0.5">OG Type</dt>
                  <dd className="text-gray-700">{result.og.type ?? <span className="text-yellow-600">Not set</span>}</dd>
                </div>
              </dl>
            </Card>

            {/* Headings */}
            <Card title="Heading Structure">
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-1">H1 ({result.headings.h1.length})</p>
                  {result.headings.h1.length ? result.headings.h1.map((h, i) => <p key={i} className="font-medium text-gray-900">{h}</p>) : <p className="text-red-500">No H1 found</p>}
                </div>
                {result.headings.h2.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">H2 ({result.headings.h2.length})</p>
                    <div className="flex flex-wrap">
                      {result.headings.h2.slice(0, 5).map((h, i) => <Tag key={i}>{h.slice(0, 40)}{h.length > 40 ? '…' : ''}</Tag>)}
                      {result.headings.h2.length > 5 && <Tag>+{result.headings.h2.length - 5} more</Tag>}
                    </div>
                  </div>
                )}
                {result.headings.h3.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">H3 ({result.headings.h3.length})</p>
                    <div className="flex flex-wrap">
                      {result.headings.h3.slice(0, 4).map((h, i) => <Tag key={i}>{h.slice(0, 35)}{h.length > 35 ? '…' : ''}</Tag>)}
                      {result.headings.h3.length > 4 && <Tag>+{result.headings.h3.length - 4} more</Tag>}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Schema */}
            <Card title="Schema Markup">
              {result.schema.detected ? (
                <div>
                  <p className="text-sm text-green-700 font-medium mb-2 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" /> Schema markup detected
                  </p>
                  <div className="flex flex-wrap">
                    {result.schema.types.map(t => <Tag key={t} variant="green">{t}</Tag>)}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-red-600 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4" /> No JSON-LD schema found
                </p>
              )}

              {result.images.withoutAlt > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-2">Images missing alt text ({result.images.withoutAlt})</p>
                  {result.images.missingAlt.map((src, i) => (
                    <p key={i} className="text-xs text-red-600 truncate">{src}</p>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {!loading && !result && !error && (
        <div className="max-w-md text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
          <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium mb-1">Enter a URL to run an SEO audit</p>
          <p className="text-gray-400 text-xs max-w-xs mx-auto">Analyses meta tags, headings, images, schema, links and more — then gives AI-powered recommendations.</p>
        </div>
      )}
    </div>
  )
}
