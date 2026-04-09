import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic()

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { topic, industry, language } = await req.json()
  if (!topic) return new Response('topic required', { status: 400 })

  const prompt = `You are an expert in search behaviour, AI citation patterns, and conversational search optimisation.

Given the topic: "${topic}"
Industry: ${industry || 'General'}
Language: ${language || 'English'}

Generate exactly 20 search sentences — full questions and phrases real people type or speak when searching about this topic.

Rules:
- These must be FULL SENTENCES or QUESTIONS, not single keywords
- Cover all question types: How, Why, What, Who, When, Where, Best, Compare, Should I, Is it
- Include questions an AI assistant (ChatGPT, Perplexity) would answer
- Include questions that trigger Google featured snippets
- Include voice search phrasing (natural spoken language)

For each sentence return a JSON object with:
- sentence: the full search sentence
- type: one of "how", "why", "what", "who", "when", "where", "best", "compare", "should", "definition"
- format: the best content format to answer it — one of "paragraph", "numbered-steps", "bullet-list", "table", "definition", "faq"
- ai_potential: likelihood this gets cited by AI engines — "high", "medium", "low"
- notes: one short sentence on the searcher intent

Return ONLY a valid JSON array of 20 objects, no other text.`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const sentences = JSON.parse(text.replace(/```json|```/g, '').trim())
    return Response.json({ sentences })
  } catch {
    return new Response('Failed to parse response', { status: 500 })
  }
}
