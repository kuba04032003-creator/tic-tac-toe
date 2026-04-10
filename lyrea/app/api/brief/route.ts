import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic()

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { keyword, industry, language, audience } = await req.json()
  if (!keyword) return new Response('keyword required', { status: 400 })

  const prompt = `You are an expert SEO content strategist. Create a detailed content brief for the following:

Keyword: "${keyword}"
Industry: ${industry || 'General'}
Language: ${language || 'English'}
Target Audience: ${audience || 'General audience'}

Return ONLY valid JSON matching this exact structure:
{
  "titles": ["title option 1", "title option 2", "title option 3"],
  "metaDescription": "compelling 150-160 char meta description with keyword",
  "contentType": "one of: how-to | listicle | comparison | guide | case-study | review | pillar",
  "targetWordCount": 1500,
  "readingLevel": "one of: beginner | intermediate | advanced",
  "outline": [
    {
      "heading": "H2 section title",
      "type": "h2",
      "notes": "What to cover in this section, key points, data to include",
      "subheadings": [
        { "heading": "H3 subsection", "type": "h3", "notes": "Specific angle or sub-topic to cover" }
      ]
    }
  ],
  "questionsToAnswer": ["question 1", "question 2", "question 3", "question 4", "question 5"],
  "semanticKeywords": ["related kw 1", "related kw 2", "related kw 3", "related kw 4", "related kw 5", "related kw 6", "related kw 7", "related kw 8"],
  "competitorAngles": ["unique angle vs competitors 1", "unique angle 2", "unique angle 3"],
  "featuredSnippetOpportunity": "specific advice on how to win a featured snippet for this keyword",
  "callToAction": "recommended CTA at end of article",
  "internalLinkTopics": ["related topic 1", "related topic 2", "related topic 3"],
  "estimatedReadTime": 8,
  "aiCitationTip": "specific advice on how to structure this article to be cited by ChatGPT/Perplexity"
}

Make the outline have at least 5 H2 sections with 1-2 H3s each. Be very specific in notes.`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  try {
    const brief = JSON.parse(text.replace(/```json|```/g, '').trim())
    return Response.json({ brief })
  } catch {
    return new Response('Failed to parse response', { status: 500 })
  }
}
