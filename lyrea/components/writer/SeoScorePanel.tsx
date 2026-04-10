'use client'

import { useMemo, useState } from 'react'
import { Check, X, AlertCircle, Loader2, Link2, ChevronDown, ChevronUp, Sparkles, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Article {
  id: string
  title: string
  keyword?: string
  project_id?: string
}

interface LinkSuggestion {
  targetId: string
  targetTitle: string
  anchorText: string
  context: string
  relevanceScore: number
}

interface Props {
  content: string
  title: string
  keyword: string
  article: Article
}

function countWords(text: string) {
  return text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length
}

function countSentences(text: string) {
  return (text.replace(/<[^>]+>/g, ' ').match(/[.!?]+/g) || []).length || 1
}

function countOccurrences(text: string, keyword: string) {
  if (!keyword) return 0
  const plain = text.replace(/<[^>]+>/g, ' ').toLowerCase()
  const kw = keyword.toLowerCase()
  return (plain.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
}

function hasPattern(html: string, pattern: RegExp) {
  return pattern.test(html.replace(/<[^>]+>/g, ' '))
}

function getH2s(html: string): string[] {
  return [...html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi)].map(m => m[1].replace(/<[^>]+>/g, ''))
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 55) return 'text-yellow-500'
  return 'text-red-500'
}

function scoreBg(score: number) {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 55) return 'bg-yellow-400'
  return 'bg-red-400'
}

type CheckStatus = 'pass' | 'fail' | 'warn'

interface CheckItem {
  label: string
  status: CheckStatus
  detail: string
}

function CheckRow({ item }: { item: CheckItem }) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-gray-100 last:border-0">
      <div className="flex-shrink-0 mt-0.5">
        {item.status === 'pass' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
        {item.status === 'fail' && <X className="w-3.5 h-3.5 text-red-400" />}
        {item.status === 'warn' && <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-700">{item.label}</p>
        <p className="text-xs text-gray-400">{item.detail}</p>
      </div>
    </div>
  )
}

export default function SeoScorePanel({ content, title, keyword, article }: Props) {
  const [showGeo, setShowGeo] = useState(false)
  const [showLinks, setShowLinks] = useState(false)
  const [linkSuggestions, setLinkSuggestions] = useState<LinkSuggestion[]>([])
  const [loadingLinks, setLoadingLinks] = useState(false)
  const [linksLoaded, setLinksLoaded] = useState(false)

  const html = content || ''
  const plain = html.replace(/<[^>]+>/g, ' ').toLowerCase()

  const seo = useMemo(() => {
    const words = countWords(html)
    const sentences = countSentences(html)
    const avgSentenceLen = words / sentences
    const kwCount = countOccurrences(html, keyword)
    const density = words > 0 ? (kwCount / words) * 100 : 0
    const h2s = getH2s(html)
    const h3count = (html.match(/<h3/gi) || []).length
    const hasImages = /<img/i.test(html)
    const kwInTitle = keyword ? title.toLowerCase().includes(keyword.toLowerCase()) : false
    const firstPara = (html.match(/<p[^>]*>(.*?)<\/p>/i) || ['', ''])[1].toLowerCase()
    const kwInFirstPara = keyword ? firstPara.includes(keyword.toLowerCase()) : false

    const checks: CheckItem[] = [
      {
        label: 'Keyword in title',
        status: kwInTitle ? 'pass' : keyword ? 'fail' : 'warn',
        detail: kwInTitle ? 'Title contains target keyword' : 'Add keyword to article title',
      },
      {
        label: 'Keyword in intro',
        status: kwInFirstPara ? 'pass' : keyword ? 'warn' : 'warn',
        detail: kwInFirstPara ? 'Keyword appears in first paragraph' : 'Mention keyword in first paragraph',
      },
      {
        label: `Keyword density (${density.toFixed(1)}%)`,
        status: density >= 0.5 && density <= 2.5 ? 'pass' : density > 2.5 ? 'warn' : 'fail',
        detail: density >= 0.5 && density <= 2.5 ? 'Good density (0.5-2.5%)' : density > 2.5 ? 'Too high — risk of keyword stuffing' : 'Too low — use keyword more naturally',
      },
      {
        label: `Word count (${words})`,
        status: words >= 800 ? 'pass' : words >= 400 ? 'warn' : 'fail',
        detail: words >= 800 ? 'Great length for SEO' : words >= 400 ? 'Aim for 800+ words' : 'Too short — expand content significantly',
      },
      {
        label: `H2 headings (${h2s.length})`,
        status: h2s.length >= 3 ? 'pass' : h2s.length >= 1 ? 'warn' : 'fail',
        detail: h2s.length >= 3 ? 'Good heading structure' : 'Add more H2 section headings',
      },
      {
        label: `H3 subheadings (${h3count})`,
        status: h3count >= 2 ? 'pass' : h3count >= 1 ? 'warn' : 'fail',
        detail: h3count >= 2 ? 'Good depth of structure' : 'Add H3 subheadings for detail',
      },
      {
        label: 'Images',
        status: hasImages ? 'pass' : 'warn',
        detail: hasImages ? 'Article includes images' : 'Add images to improve engagement',
      },
      {
        label: `Readability (avg ${Math.round(avgSentenceLen)} words/sentence)`,
        status: avgSentenceLen <= 20 ? 'pass' : avgSentenceLen <= 28 ? 'warn' : 'fail',
        detail: avgSentenceLen <= 20 ? 'Easy to read' : 'Shorten sentences for better readability',
      },
    ]

    const passCount = checks.filter(c => c.status === 'pass').length
    const score = Math.round((passCount / checks.length) * 100)

    return { checks, score, words, density, h2s, kwCount }
  }, [html, title, keyword])

  const geo = useMemo(() => {
    const h2s = getH2s(html)
    const questionH2s = h2s.filter(h => /^(how|why|what|who|when|where|should|is|are|can|does|do|which)/i.test(h))
    const hasQuickAnswer = /quick answer|tl;dr|tldr|in short|summary/i.test(plain)
    const hasFaq = /frequently asked|faq/i.test(plain)
    const hasStats = /\d+%|\d+ percent|\d+ million|\d+ billion|\d+ study|\d+ report/i.test(plain)
    const hasList = /<[uo]l/i.test(html)
    const hasNumberedList = /<ol/i.test(html)
    const paragraphs = (html.match(/<p[^>]*>(.*?)<\/p>/gi) || [])
    const avgParaWords = paragraphs.length > 0
      ? paragraphs.reduce((a, p) => a + countWords(p), 0) / paragraphs.length
      : 0
    const conciseParagraphs = avgParaWords > 0 && avgParaWords <= 80

    const checks: CheckItem[] = [
      {
        label: 'Direct answer block (TL;DR)',
        status: hasQuickAnswer ? 'pass' : 'fail',
        detail: hasQuickAnswer ? 'Has a direct answer/TL;DR — AI engines love this' : 'Add a "Quick Answer" or "TL;DR" block at the top',
      },
      {
        label: 'FAQ section',
        status: hasFaq ? 'pass' : 'warn',
        detail: hasFaq ? 'Has FAQ — cited by Perplexity and Google AI' : 'Add an FAQ section with 4-6 related questions',
      },
      {
        label: `Question-based H2s (${questionH2s.length}/${h2s.length})`,
        status: questionH2s.length >= 2 ? 'pass' : questionH2s.length >= 1 ? 'warn' : 'fail',
        detail: questionH2s.length >= 2 ? 'Good — question headings are citation-friendly' : 'Rephrase H2s as questions (How, Why, What)',
      },
      {
        label: 'Statistics & data',
        status: hasStats ? 'pass' : 'warn',
        detail: hasStats ? 'Article includes statistics — increases credibility' : 'Add specific numbers, stats, or research findings',
      },
      {
        label: 'Structured lists',
        status: hasList ? 'pass' : 'warn',
        detail: hasList ? 'Has bullet/numbered lists — great for featured snippets' : 'Add bullet or numbered lists',
      },
      {
        label: 'Numbered steps',
        status: hasNumberedList ? 'pass' : 'warn',
        detail: hasNumberedList ? 'Numbered lists trigger "how-to" featured snippets' : 'Add numbered steps where appropriate',
      },
      {
        label: 'Concise paragraphs',
        status: conciseParagraphs ? 'pass' : avgParaWords > 0 ? 'warn' : 'warn',
        detail: conciseParagraphs ? `Avg ${Math.round(avgParaWords)} words/para — good for AI scanning` : `Avg ${Math.round(avgParaWords)} words/para — keep paragraphs under 80 words`,
      },
    ]

    const passCount = checks.filter(c => c.status === 'pass').length
    const score = Math.round((passCount / checks.length) * 100)

    return { checks, score }
  }, [html, plain])

  async function loadLinkSuggestions() {
    if (linksLoaded || !article.project_id) return
    setLoadingLinks(true)
    try {
      const res = await fetch('/api/internal-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: article.id,
          projectId: article.project_id,
          currentContent: html,
          currentKeyword: keyword,
        }),
      })
      const data = await res.json()
      setLinkSuggestions(data.suggestions ?? [])
      setLinksLoaded(true)
    } catch (_) { setLinksLoaded(true) }
    setLoadingLinks(false)
  }

  return (
    <div className="w-72 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto flex flex-col">
      {/* SEO Score */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">SEO Score</p>
          <span className={cn('text-2xl font-bold', scoreColor(seo.score))}>{seo.score}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
          <div
            className={cn('h-full rounded-full transition-all duration-500', scoreBg(seo.score))}
            style={{ width: `${seo.score}%` }}
          />
        </div>
        <div className="space-y-0">
          {seo.checks.map((c, i) => <CheckRow key={i} item={c} />)}
        </div>
      </div>

      {/* GEO Score */}
      <div className="border-b border-gray-100">
        <button
          onClick={() => setShowGeo(v => !v)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">AI Citation Score</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn('text-lg font-bold', scoreColor(geo.score))}>{geo.score}</span>
            {showGeo ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
          </div>
        </button>
        {showGeo && (
          <div className="px-4 pb-4">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div
                className={cn('h-full rounded-full transition-all duration-500', scoreBg(geo.score))}
                style={{ width: `${geo.score}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mb-3">Likelihood of being cited by ChatGPT, Perplexity, Google AI</p>
            {geo.checks.map((c, i) => <CheckRow key={i} item={c} />)}
          </div>
        )}
      </div>

      {/* Internal Links */}
      <div className="border-b border-gray-100">
        <button
          onClick={() => {
            setShowLinks(v => !v)
            if (!linksLoaded) loadLinkSuggestions()
          }}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Link2 className="w-3.5 h-3.5 text-indigo-500" />
            <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Internal Links</p>
          </div>
          {showLinks ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
        </button>

        {showLinks && (
          <div className="px-4 pb-4">
            {!article.project_id && (
              <p className="text-xs text-gray-400">Assign this article to a project to get internal link suggestions.</p>
            )}
            {loadingLinks && (
              <div className="flex items-center gap-2 text-gray-400 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="text-xs">Analysing project articles...</span>
              </div>
            )}
            {linksLoaded && linkSuggestions.length === 0 && (
              <p className="text-xs text-gray-400">No relevant internal link opportunities found.</p>
            )}
            {linkSuggestions.map((s, i) => (
              <div key={i} className="mb-3 last:mb-0 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-semibold text-gray-800">{s.targetTitle}</p>
                  <a href={`/writer/${s.targetId}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3 h-3 text-gray-400 hover:text-indigo-500 flex-shrink-0" />
                  </a>
                </div>
                <p className="text-xs text-indigo-600 font-medium mt-1">&quot;{s.anchorText}&quot;</p>
                <p className="text-xs text-gray-400 mt-1">{s.context}</p>
                <div className="mt-1.5">
                  <span className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">{s.relevanceScore}% relevant</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="p-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Quick Stats</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Words', value: seo.words },
            { label: 'Keyword uses', value: seo.kwCount },
            { label: 'H2 sections', value: seo.h2s.length },
            { label: 'Density', value: `${seo.density.toFixed(1)}%` },
          ].map(stat => (
            <div key={stat.label} className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="text-sm font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
