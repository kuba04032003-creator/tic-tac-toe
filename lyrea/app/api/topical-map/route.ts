import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic()

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { topic, industry, language } = await req.json()
  if (!topic) return new Response('topic required', { status: 400 })

  const prompt = `You are an expert SEO content strategist specialising in topical authority and content clusters.

Create a complete topical map for: "${topic}"
Industry: ${industry || 'General'}
Language: ${language || 'English'}

Return ONLY valid JSON:
{
  "pillar": {
    "title": "Main pillar article title (comprehensive guide)",
    "keyword": "primary keyword phrase",
    "description": "What this pillar page covers and why it's the hub",
    "wordCount": 3000
  },
  "clusters": [
    {
      "title": "Supporting article title",
      "keyword": "supporting keyword",
      "intent": "informational | commercial | transactional | navigational",
      "priority": "high | medium | low",
      "description": "What this article covers and how it links to the pillar",
      "questionAngle": "The main question this article answers",
      "wordCount": 1200,
      "aiCitationPotential": "high | medium | low"
    }
  ]
}

Rules:
- Pillar article must be comprehensive and evergreen
- Generate exactly 12 cluster articles
- Cover all intent types (informational, commercial, transactional)
- Include 4+ high AI citation potential articles
- Each cluster must link naturally back to the pillar
- Mix of question-based and keyword-based titles
- Priority: high = write first (highest traffic/intent), medium = second wave, low = long-tail`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const map = JSON.parse(text.replace(/```json|```/g, '').trim())
    return Response.json({ map })
  } catch {
    return new Response('Failed to parse response', { status: 500 })
  }
}
