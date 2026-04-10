import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic()

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { seed, industry, language } = await req.json()
  if (!seed) return new Response('seed required', { status: 400 })

  const prompt = `You are an AI-search SEO expert. Users today search using ChatGPT, Perplexity, and Google AI — meaning queries are long, conversational, and intent-driven.

Seed topic: "${seed}"
Industry: ${industry || 'General'}
Language: ${language || 'English'}

Generate exactly 5 keyword clusters. Each cluster must contain 4-6 LONG-TAIL, NATURAL LANGUAGE keywords (minimum 4 words each — no short generic terms).

Return ONLY valid JSON matching this structure exactly:
{
  "clusters": [
    {
      "intent": "conversational",
      "label": "AI Search Queries",
      "description": "How people ask ChatGPT and Perplexity",
      "keywords": [
        {
          "keyword": "full long-tail natural language query here",
          "type": "conversational",
          "volume": "1.2K",
          "difficulty": 24,
          "relevance": 97
        }
      ]
    }
  ]
}

Required cluster intents (use exactly these labels):
1. intent: "conversational", label: "AI Search Queries" — how people phrase queries to ChatGPT/Perplexity (natural sentences, 6-12 words)
2. intent: "informational", label: "How-to & Guides" — question-based long-tail queries (what, how, why, when)
3. intent: "comparison", label: "Comparison & Best-of" — vs, best, top, alternatives queries
4. intent: "commercial", label: "Commercial Research" — reviews, pricing, buying intent queries
5. intent: "transactional", label: "Ready to Act" — hire, buy, get, start, download queries

Rules:
- ALL keywords must be 4+ words minimum, natural language, specific
- volume: estimated monthly searches as string (e.g. "8.1K", "450", "2.4K")
- difficulty: 0-100 (lower = easier to rank)
- relevance: 0-100 (how relevant to the seed topic)
- Sort keywords within each cluster by relevance descending
- Be realistic about volumes — long-tail gets less traffic but higher conversion`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const data = JSON.parse(text.replace(/```json|```/g, '').trim())
    return Response.json(data)
  } catch {
    return new Response('Failed to parse response', { status: 500 })
  }
}
