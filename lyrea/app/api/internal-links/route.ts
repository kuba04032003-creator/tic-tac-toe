import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic()

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { articleId, projectId, currentContent, currentKeyword } = await req.json()
  if (!projectId) return new Response('projectId required', { status: 400 })

  // Fetch all other articles in the project
  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, keyword, content')
    .eq('project_id', projectId)
    .neq('id', articleId)
    .limit(20)

  if (!articles || articles.length === 0) {
    return Response.json({ suggestions: [] })
  }

  const articleList = articles
    .map(a => `- ID: ${a.id} | Title: "${a.title}" | Keyword: "${a.keyword || 'none'}"`)
    .join('\n')

  const prompt = `You are an internal linking expert. Analyze the current article and suggest the best internal links to other articles in the same project.

Current article keyword: "${currentKeyword || 'unknown'}"
Current article content (first 500 chars): "${currentContent?.slice(0, 500) || ''}"

Other articles in this project:
${articleList}

Return ONLY valid JSON array of suggestions (max 5):
[
  {
    "targetId": "article uuid",
    "targetTitle": "the article title",
    "anchorText": "the exact anchor text to use in the current article",
    "context": "where in the article to place this link and why it's relevant",
    "relevanceScore": 85
  }
]

Rules:
- Only suggest articles that are genuinely topically relevant
- Anchor text must be natural and keyword-rich
- Sort by relevance score descending
- If fewer than 5 are relevant, return fewer — don't force irrelevant links`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const suggestions = JSON.parse(text.replace(/```json|```/g, '').trim())
    return Response.json({ suggestions })
  } catch {
    return Response.json({ suggestions: [] })
  }
}
