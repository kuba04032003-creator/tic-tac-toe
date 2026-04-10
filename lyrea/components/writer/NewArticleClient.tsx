'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Wand2, Sparkles, X, Copy, Check,
  ArrowRight, AlertCircle, RefreshCw, ExternalLink, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function isQuestion(text: string) {
  return /^(how|why|what|who|when|where|should|is|are|can|does|do|which|best|compare)\b/i.test(text.trim()) ||
    text.trim().endsWith('?')
}

interface Project { id: string; name: string }

const TONES = ['Professional', 'Casual', 'Authoritative', 'Friendly', 'Technical', 'Playful']
const LENGTHS = [
  { value: 'short', label: 'Short (~600 words)' },
  { value: 'medium', label: 'Medium (~1200 words)' },
  { value: 'long', label: 'Long (~2000 words)' },
]

type Phase = 'form' | 'streaming' | 'done' | 'error'

/* ─── Simple markdown → HTML (safe, no deps) ────────────────────────────── */
function mdToHtml(md: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const inline = (s: string) =>
    escape(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-gray-100 text-indigo-700 px-1 rounded text-[0.85em] font-mono">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-indigo-600 underline">$1</a>')

  const lines = md.split('\n')
  const out: string[] = []
  let inUl = false
  let inOl = false

  const closeList = () => {
    if (inUl) { out.push('</ul>'); inUl = false }
    if (inOl) { out.push('</ol>'); inOl = false }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line.startsWith('### ')) {
      closeList()
      out.push(`<h3 class="text-base font-bold text-gray-900 mt-5 mb-1">${inline(line.slice(4))}</h3>`)
    } else if (line.startsWith('## ')) {
      closeList()
      out.push(`<h2 class="text-lg font-bold text-gray-900 mt-6 mb-2">${inline(line.slice(3))}</h2>`)
    } else if (line.startsWith('# ')) {
      closeList()
      out.push(`<h1 class="text-2xl font-bold text-gray-900 mt-2 mb-4">${inline(line.slice(2))}</h1>`)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (inOl) { out.push('</ol>'); inOl = false }
      if (!inUl) { out.push('<ul class="list-disc ml-5 space-y-1 my-2">'); inUl = true }
      out.push(`<li class="text-sm text-gray-700 leading-relaxed">${inline(line.slice(2))}</li>`)
    } else if (/^\d+\.\s/.test(line)) {
      if (inUl) { out.push('</ul>'); inUl = false }
      if (!inOl) { out.push('<ol class="list-decimal ml-5 space-y-1 my-2">'); inOl = true }
      out.push(`<li class="text-sm text-gray-700 leading-relaxed">${inline(line.replace(/^\d+\.\s/, ''))}</li>`)
    } else if (line.startsWith('> ')) {
      closeList()
      out.push(`<blockquote class="border-l-2 border-indigo-300 pl-3 italic text-gray-600 text-sm my-3">${inline(line.slice(2))}</blockquote>`)
    } else if (line === '---' || line === '***') {
      closeList()
      out.push('<hr class="border-gray-200 my-4" />')
    } else if (!line.trim()) {
      closeList()
      out.push('<div class="h-2"></div>')
    } else {
      closeList()
      out.push(`<p class="text-sm text-gray-700 leading-relaxed">${inline(line)}</p>`)
    }
  }
  closeList()
  return out.join('\n')
}

/* ─── Skeleton loader ────────────────────────────────────────────────────── */
function SkeletonLines() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-6 bg-gray-200 rounded-md w-3/4" />
      <div className="h-4 bg-gray-100 rounded w-full" />
      <div className="h-4 bg-gray-100 rounded w-11/12" />
      <div className="h-4 bg-gray-100 rounded w-5/6" />
      <div className="h-4 bg-gray-100 rounded w-full" />
      <div className="h-5 bg-gray-200 rounded-md w-1/2 mt-5" />
      <div className="h-4 bg-gray-100 rounded w-full" />
      <div className="h-4 bg-gray-100 rounded w-4/5" />
      <div className="h-4 bg-gray-100 rounded w-full" />
      <div className="h-5 bg-gray-200 rounded-md w-2/5 mt-5" />
      <div className="h-4 bg-gray-100 rounded w-3/4" />
      <div className="h-4 bg-gray-100 rounded w-full" />
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function NewArticleClient({
  projects,
  defaultKeyword,
  defaultProjectId,
  defaultTitle,
}: {
  projects: Project[]
  defaultKeyword?: string
  defaultProjectId?: string
  defaultTitle?: string
}) {
  const router = useRouter()

  const [form, setForm] = useState({
    title: defaultTitle ?? '',
    keyword: defaultKeyword ?? '',
    tone: 'Professional',
    length: 'medium',
    projectId: defaultProjectId ?? '',
  })
  const [phase, setPhase] = useState<Phase>('form')
  const [streamedContent, setStreamedContent] = useState('')
  const [showStartingMsg, setShowStartingMsg] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [articleId, setArticleId] = useState<string | null>(null)

  // Refs so closures always see latest values
  const abortRef = useRef<AbortController | null>(null)
  const bufferRef = useRef('')
  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasStartedRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  function setField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  /* ── Keyboard shortcut: Cmd/Ctrl + Enter ── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && phase === 'form') {
        e.preventDefault()
        if (form.title || form.keyword) {
          document.getElementById('generate-btn')?.click()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, form.title, form.keyword])

  /* ── Auto-scroll as content grows ── */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [streamedContent])

  /* ── Cleanup on unmount ── */
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (flushIntervalRef.current) clearInterval(flushIntervalRef.current)
      if (startTimerRef.current) clearTimeout(startTimerRef.current)
    }
  }, [])

  function stopStreaming() {
    abortRef.current?.abort()
    if (flushIntervalRef.current) clearInterval(flushIntervalRef.current)
    if (startTimerRef.current) clearTimeout(startTimerRef.current)
    // Flush any remaining buffer
    if (bufferRef.current) {
      setStreamedContent(prev => prev + bufferRef.current)
      bufferRef.current = ''
    }
  }

  function cancel() {
    stopStreaming()
    setPhase('error')
    setError('Generation cancelled. Copy partial content or try again.')
  }

  function copyContent() {
    const text = streamedContent + bufferRef.current
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function openEditor() {
    if (articleId) router.push(`/writer/${articleId}`)
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title && !form.keyword) {
      setError('Enter a title or target keyword.')
      return
    }

    // Reset state
    setPhase('streaming')
    setStreamedContent('')
    setShowStartingMsg(false)
    setError('')
    bufferRef.current = ''
    hasStartedRef.current = false

    // 3 s "Starting generation..." message
    startTimerRef.current = setTimeout(() => {
      if (!hasStartedRef.current) setShowStartingMsg(true)
    }, 3000)

    // Batch-flush buffer every 40 ms → prevents excessive re-renders
    flushIntervalRef.current = setInterval(() => {
      if (bufferRef.current) {
        setStreamedContent(prev => prev + bufferRef.current)
        bufferRef.current = ''
      }
    }, 40)

    abortRef.current = new AbortController()
    let id: string | null = null

    try {
      /* 1 ─ Create article record */
      const createRes = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title || form.keyword,
          keyword: form.keyword,
          project_id: form.projectId || null,
        }),
        signal: abortRef.current.signal,
      })
      if (!createRes.ok) throw new Error('Failed to create article')
      const article = await createRes.json()
      id = article.id
      setArticleId(id)

      /* 2 ─ Stream from Claude */
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
        signal: abortRef.current.signal,
      })
      if (!genRes.ok) throw new Error('Generation failed')

      const reader = genRes.body!.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        bufferRef.current += chunk
        fullContent += chunk

        if (!hasStartedRef.current && chunk.trim()) {
          hasStartedRef.current = true
          setShowStartingMsg(false)
          if (startTimerRef.current) clearTimeout(startTimerRef.current)
        }
      }

      /* Stop flush interval, do a final atomic flush */
      if (flushIntervalRef.current) clearInterval(flushIntervalRef.current)
      if (startTimerRef.current) clearTimeout(startTimerRef.current)
      setStreamedContent(fullContent)
      bufferRef.current = ''

      if (!fullContent.trim()) {
        setPhase('error')
        setError('No content was generated. Please try again.')
        return
      }

      /* 3 ─ Persist to DB */
      await fetch(`/api/articles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: form.title || form.keyword, content: fullContent }),
      })

      setPhase('done')
    } catch (err: unknown) {
      if (flushIntervalRef.current) clearInterval(flushIntervalRef.current)
      if (startTimerRef.current) clearTimeout(startTimerRef.current)
      // Flush remaining buffer so partial content is visible
      if (bufferRef.current) {
        setStreamedContent(prev => prev + bufferRef.current)
        bufferRef.current = ''
      }
      if (err instanceof Error && err.name === 'AbortError') return
      setPhase('error')
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const wordCount = streamedContent.trim() ? streamedContent.trim().split(/\s+/).length : 0
  const htmlContent = streamedContent ? mdToHtml(streamedContent) : ''

  /* ════════════════════════════════════════════════════════════════════════
     FORM PHASE
  ════════════════════════════════════════════════════════════════════════ */
  if (phase === 'form') {
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
                onChange={e => setField('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. 10 Best SEO Tools for Small Businesses"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target keyword</label>
              <input
                value={form.keyword}
                onChange={e => setField('keyword', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. seo tools for small business"
              />
              {isQuestion(form.keyword) ? (
                <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1 font-medium">
                  <Sparkles className="w-3 h-3" />
                  Sentence detected — article will be structured with direct answers, Q&amp;A headings and FAQ
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-1">
                  Enter a keyword or a full question sentence for AI-optimised structure.
                </p>
              )}
            </div>

            {projects.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project <span className="text-gray-400">(optional)</span>
                </label>
                <select
                  value={form.projectId}
                  onChange={e => setField('projectId', e.target.value)}
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
                    onClick={() => setField('tone', t)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                      form.tone === t
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                    )}
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
                    onClick={() => setField('length', l.value)}
                    className={cn(
                      'flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors',
                      form.length === l.value
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </p>
            )}

            <button
              id="generate-btn"
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              <Wand2 className="w-4 h-4" />
              Generate article
              <span className="text-xs text-indigo-300 ml-1 hidden sm:inline">⌘↵</span>
            </button>
          </form>
        </div>
      </div>
    )
  }

  /* ════════════════════════════════════════════════════════════════════════
     STREAMING / DONE / ERROR PHASES
  ════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-screen bg-gray-50">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {phase === 'streaming' && (
            <div className="flex items-center gap-2">
              {/* Pulsing dot */}
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500" />
              </span>
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Writing article…</span>
            </div>
          )}
          {phase === 'done' && (
            <div className="flex items-center gap-2 text-green-600">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">Article complete</span>
            </div>
          )}
          {phase === 'error' && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">Generation stopped</span>
            </div>
          )}
          {wordCount > 0 && (
            <span className="text-xs text-gray-400 pl-2 border-l border-gray-200 hidden sm:block">
              {wordCount.toLocaleString()} words
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Copy */}
          <button
            onClick={copyContent}
            disabled={!streamedContent}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>

          {/* Cancel (streaming only) */}
          {phase === 'streaming' && (
            <button
              onClick={cancel}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          )}

          {/* Try again (error) */}
          {phase === 'error' && (
            <button
              onClick={() => { setPhase('form'); setStreamedContent('') }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try again
            </button>
          )}

          {/* Open editor */}
          {(phase === 'done' || (phase === 'error' && articleId)) && (
            <button
              onClick={openEditor}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium"
            >
              Open in editor <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── "Starting generation…" banner ── */}
      {showStartingMsg && (
        <div className="flex items-center justify-center gap-2 py-2 bg-indigo-50 border-b border-indigo-100 text-xs text-indigo-600 flex-shrink-0">
          <Loader2 className="w-3 h-3 animate-spin" />
          Starting generation… Claude is warming up
        </div>
      )}

      {/* ── Error message ── */}
      {phase === 'error' && error && (
        <div className="mx-6 mt-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex-shrink-0">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* ── Done banner ── */}
      {phase === 'done' && articleId && (
        <div className="mx-6 mt-4 flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>Article saved. Open the editor to format, add images, and publish.</span>
          </div>
          <button
            onClick={openEditor}
            className="flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium whitespace-nowrap ml-4"
          >
            Open editor <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Scrollable content area ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8">

          {/* Article title */}
          {(form.title || form.keyword) && (
            <p className="text-xs font-semibold text-indigo-500 uppercase tracking-widest mb-2">
              {form.keyword || form.title}
            </p>
          )}

          {/* Content — rendered markdown */}
          {streamedContent ? (
            <>
              <div
                className="text-sm leading-relaxed text-gray-800"
                /* Safe: mdToHtml escapes user content; input comes from Claude only */
                dangerouslySetInnerHTML={{
                  __html: htmlContent + (phase === 'streaming'
                    ? '<span class="streaming-cursor"></span>'
                    : ''),
                }}
              />
            </>
          ) : phase === 'streaming' ? (
            <SkeletonLines />
          ) : null}
        </div>
      </div>

      {/* ── Global styles for blinking cursor ── */}
      <style>{`
        .streaming-cursor {
          display: inline-block;
          width: 2px;
          height: 1.1em;
          background: #6366f1;
          margin-left: 2px;
          vertical-align: text-bottom;
          border-radius: 1px;
          animation: lyrea-blink 0.9s step-end infinite;
        }
        @keyframes lyrea-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
