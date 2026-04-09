import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic()

const STOP_WORDS = new Set([
  'the','and','for','are','but','not','you','all','any','can','had','her','was',
  'one','our','out','day','get','has','him','his','how','its','now','old','see',
  'two','way','who','did','man','new','use','she','may','sit','let','too','say',
  'set','put','end','why','ask','men','too','also','than','then','them','these',
  'they','this','that','with','have','from','been','were','will','into','some',
  'what','when','your','more','about','would','there','their','which','other',
  'after','could','those','first','well','just','each','back','much','only',
  'most','over','such','even','does','made','like','very','time','long','make',
  'here','said','both','very','come','know','need','want','used','good','high',
  'page','site','web',
])

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
  og: {
    title: string | null
    description: string | null
    image: string | null
    type: string | null
  }
  headings: {
    h1: string[]
    h2: string[]
    h3: string[]
  }
  content: {
    wordCount: number
    textLength: number
  }
  images: {
    total: number
    withAlt: number
    withoutAlt: number
    missingAlt: string[]
  }
  links: {
    internal: number
    external: number
    total: number
  }
  schema: {
    detected: boolean
    types: string[]
  }
  keywords: { word: string; count: number }[]
  scores: {
    title: { score: number; status: 'good' | 'warn' | 'fail'; message: string }
    description: { score: number; status: 'good' | 'warn' | 'fail'; message: string }
    h1: { score: number; status: 'good' | 'warn' | 'fail'; message: string }
    images: { score: number; status: 'good' | 'warn' | 'fail'; message: string }
    schema: { score: number; status: 'good' | 'warn' | 'fail'; message: string }
    overall: number
  }
  aiAnalysis: {
    summary: string
    wins: string[]
    fixes: { issue: string; action: string; priority: 'high' | 'medium' | 'low' }[]
  }
}

function getText(html: string, tag: string, attr?: string): string | null {
  if (attr) {
    const re = new RegExp(`<${tag}[^>]+${attr}=["']([^"']+)["'][^>]*>`, 'i')
    return html.match(re)?.[1] ?? null
  }
  const re = new RegExp(`<${tag}[^>]*>([^<]+)<\/${tag}>`, 'i')
  return html.match(re)?.[1]?.trim() ?? null
}

function getMetaContent(html: string, name: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i'),
  ]
  for (const p of patterns) {
    const m = html.match(p)
    if (m) return m[1].trim()
  }
  return null
}

function getOGContent(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${property}["']`, 'i'),
  ]
  for (const p of patterns) {
    const m = html.match(p)
    if (m) return m[1].trim()
  }
  return null
}

function getAllMatches(html: string, re: RegExp): string[] {
  const results: string[] = []
  let m: RegExpExecArray | null
  const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')
  while ((m = g.exec(html)) !== null) results.push(m[1]?.trim() ?? '')
  return results.filter(Boolean)
}

function scoreTitle(len: number) {
  if (len === 0) return { score: 0, status: 'fail' as const, message: 'No title tag found' }
  if (len < 30) return { score: 40, status: 'warn' as const, message: `Title too short (${len} chars, aim for 50–60)` }
  if (len > 60) return { score: 60, status: 'warn' as const, message: `Title too long (${len} chars, keep under 60)` }
  return { score: 100, status: 'good' as const, message: `Good title length (${len} chars)` }
}

function scoreDescription(len: number) {
  if (len === 0) return { score: 0, status: 'fail' as const, message: 'No meta description found' }
  if (len < 70) return { score: 40, status: 'warn' as const, message: `Description too short (${len} chars, aim for 120–155)` }
  if (len > 155) return { score: 60, status: 'warn' as const, message: `Description too long (${len} chars, keep under 155)` }
  return { score: 100, status: 'good' as const, message: `Good description length (${len} chars)` }
}

function scoreH1(h1s: string[]) {
  if (h1s.length === 0) return { score: 0, status: 'fail' as const, message: 'No H1 tag found' }
  if (h1s.length > 1) return { score: 60, status: 'warn' as const, message: `Multiple H1s found (${h1s.length}) — use only one` }
  return { score: 100, status: 'good' as const, message: 'One H1 found — correct' }
}

function scoreImages(withAlt: number, total: number) {
  if (total === 0) return { score: 100, status: 'good' as const, message: 'No images found' }
  const pct = Math.round((withAlt / total) * 100)
  if (pct === 100) return { score: 100, status: 'good' as const, message: 'All images have alt text' }
  if (pct >= 70) return { score: 70, status: 'warn' as const, message: `${100 - pct}% of images missing alt text` }
  return { score: 30, status: 'fail' as const, message: `${100 - pct}% of images missing alt text` }
}

function scoreSchema(detected: boolean) {
  if (detected) return { score: 100, status: 'good' as const, message: 'Schema markup detected' }
  return { score: 0, status: 'fail' as const, message: 'No schema markup found — add JSON-LD' }
}

function extractKeywords(text: string, topN = 20): { word: string; count: number }[] {
  const freq: Record<string, number> = {}
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
  for (const w of words) {
    if (w.length >= 4 && !STOP_WORDS.has(w)) {
      freq[w] = (freq[w] ?? 0) + 1
    }
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }))
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { url } = await req.json()
  if (!url) return new Response('url required', { status: 400 })

  // Fetch the page
  let html: string
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LYREABot/1.0; +https://lyrea.app)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return new Response(`Failed to fetch URL: ${res.status} ${res.statusText}`, { status: 422 })
    html = await res.text()
  } catch (e) {
    return new Response(`Could not reach URL: ${e instanceof Error ? e.message : 'network error'}`, { status: 422 })
  }

  // Parse
  const title = getText(html, 'title')
  const description = getMetaContent(html, 'description')
  const canonical = (() => {
    const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
      ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)
    return m?.[1] ?? null
  })()

  const h1s = getAllMatches(html, /<h1[^>]*>([^<]+)<\/h1>/i)
  const h2s = getAllMatches(html, /<h2[^>]*>([^<]+)<\/h2>/i)
  const h3s = getAllMatches(html, /<h3[^>]*>([^<]+)<\/h3>/i)

  // Images
  const allImgTags = getAllMatches(html, /(<img[^>]+>)/i)
  const imgWithAlt = allImgTags.filter(img => /alt=["'][^"']+["']/i.test(img))
  const imgMissingAlt = allImgTags
    .filter(img => !/alt=["'][^"']+["']/i.test(img))
    .map(img => img.match(/src=["']([^"']+)["']/i)?.[1] ?? 'unknown')
    .slice(0, 5)

  // Links
  const origin = new URL(url).origin
  const allHrefs = getAllMatches(html, /href=["']([^"'#]+)["']/i)
  const internalLinks = allHrefs.filter(h => h.startsWith('/') || h.startsWith(origin)).length
  const externalLinks = allHrefs.filter(h => h.startsWith('http') && !h.startsWith(origin)).length

  // Schema
  const schemaTypes = getAllMatches(html, /"@type"\s*:\s*"([^"]+)"/i)
  const schemaDetected = schemaTypes.length > 0

  // Word count from stripped HTML
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const wordCount = stripped.split(' ').filter(w => w.length > 2).length

  // Keyword density
  const keywords = extractKeywords(stripped)

  // Scores
  const titleLen = title?.length ?? 0
  const descLen = description?.length ?? 0
  const scores = {
    title: scoreTitle(titleLen),
    description: scoreDescription(descLen),
    h1: scoreH1(h1s),
    images: scoreImages(imgWithAlt.length, allImgTags.length),
    schema: scoreSchema(schemaDetected),
    overall: 0,
  }
  scores.overall = Math.round(
    (scores.title.score + scores.description.score + scores.h1.score +
     scores.images.score + scores.schema.score) / 5
  )

  // AI structured analysis
  const pageSummary = `
URL: ${url}
Title: ${title ?? 'MISSING'} (${titleLen} chars)
Meta description: ${description ?? 'MISSING'} (${descLen} chars)
H1s: ${h1s.join(' | ') || 'NONE'}
H2s (first 5): ${h2s.slice(0, 5).join(' | ') || 'NONE'}
Word count: ${wordCount}
Images: ${allImgTags.length} total, ${imgWithAlt.length} with alt text
Internal links: ${internalLinks}, External: ${externalLinks}
Schema types: ${schemaTypes.join(', ') || 'none'}
Canonical: ${canonical ?? 'not set'}
Overall score: ${scores.overall}/100
Top keywords: ${keywords.slice(0, 10).map(k => k.word).join(', ')}
`.trim()

  const aiMsg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 900,
    messages: [{
      role: 'user',
      content: `You are an expert SEO analyst. Analyse this page data and return a JSON object with this exact structure — no markdown, no extra text, just valid JSON:

{
  "summary": "one concise sentence describing the overall SEO health",
  "wins": ["specific thing that is already working well", "..."],
  "fixes": [
    { "issue": "short name of the problem", "action": "specific fix to apply", "priority": "high" },
    { "issue": "...", "action": "...", "priority": "medium" },
    { "issue": "...", "action": "...", "priority": "low" }
  ]
}

Rules:
- wins: 2-4 items, each under 80 chars
- fixes: 3-5 items sorted high→low priority, each action under 100 chars
- priority must be exactly "high", "medium", or "low"

Page data:
${pageSummary}`,
    }],
  })

  let aiAnalysis: AuditResult['aiAnalysis'] = { summary: '', wins: [], fixes: [] }
  if (aiMsg.content[0].type === 'text') {
    try {
      const raw = aiMsg.content[0].text.replace(/```json\n?|\n?```/g, '').trim()
      aiAnalysis = JSON.parse(raw)
    } catch {
      // fallback: treat whole text as summary
      aiAnalysis = { summary: aiMsg.content[0].text, wins: [], fixes: [] }
    }
  }

  const result: AuditResult = {
    url,
    fetchedAt: new Date().toISOString(),
    meta: {
      title,
      titleLength: titleLen,
      description,
      descriptionLength: descLen,
      canonical,
      robots: getMetaContent(html, 'robots'),
      viewport: getMetaContent(html, 'viewport'),
      charset: html.match(/charset=["']?([^"'\s;>]+)/i)?.[1] ?? null,
    },
    og: {
      title: getOGContent(html, 'title'),
      description: getOGContent(html, 'description'),
      image: getOGContent(html, 'image'),
      type: getOGContent(html, 'type'),
    },
    headings: { h1: h1s, h2: h2s.slice(0, 10), h3: h3s.slice(0, 10) },
    content: { wordCount, textLength: stripped.length },
    images: {
      total: allImgTags.length,
      withAlt: imgWithAlt.length,
      withoutAlt: allImgTags.length - imgWithAlt.length,
      missingAlt: imgMissingAlt,
    },
    links: { internal: internalLinks, external: externalLinks, total: internalLinks + externalLinks },
    schema: { detected: schemaDetected, types: [...new Set(schemaTypes)] },
    keywords,
    scores,
    aiAnalysis,
  }

  return Response.json(result)
}
