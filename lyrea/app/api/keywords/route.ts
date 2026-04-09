import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic()

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { seed, industry, language } = await req.json()
  if (!seed) return new Response('seed required', { status: 400 })

  const prompt = `You are an SEO keyword research expert.

Given the seed topic: "${seed}"
Industry: ${industry || 'General'}
Language: ${language || 'English'}

Generate exactly 12 keyword ideas. For each keyword return a JSON object with:
- keyword: the keyword phrase
- intent: one of "informational", "commercial", "transactional", "navigational"
- difficulty: one of "low", "medium", "high"
- notes: one short sentence on why this keyword is valuable

Return ONLY a valid JSON array of 12 objects, no other text.`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const keywords = JSON.parse(text.replace(/```json|```/g, '').trim())
    return Response.json({ keywords })
  } catch {
    return new Response('Failed to parse keywords', { status: 500 })
  }
}
