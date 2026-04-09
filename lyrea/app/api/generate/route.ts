import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

const client = new Anthropic()

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { title, keyword, tone, length, projectId } = await req.json()

  if (!title && !keyword) {
    return new Response('title or keyword required', { status: 400 })
  }

  // Fetch project + brand voice if provided
  let brandContext = ''
  if (projectId) {
    const { data: project } = await supabase
      .from('projects')
      .select('*, brand_voices(*)')
      .eq('id', projectId)
      .single()

    if (project) {
      brandContext = `
Project: ${project.name}
Industry: ${project.industry || 'General'}
Language: ${project.language || 'English'}
${project.brand_voices?.[0] ? `
Brand voice: ${project.brand_voices[0].description || ''}
Tone: ${project.brand_voices[0].tone_attributes?.join(', ') || ''}
Words to always use: ${project.brand_voices[0].words_to_use?.join(', ') || ''}
Words to avoid: ${project.brand_voices[0].words_to_avoid?.join(', ') || ''}
Target audience: ${project.brand_voices[0].target_audience || ''}
` : ''}
`
    }
  }

  const wordTarget = length === 'short' ? 600 : length === 'long' ? 2000 : 1200

  const systemPrompt = `You are an expert SEO content writer. Write high-quality, engaging articles that rank well in search engines.

Guidelines:
- Write in ${tone || 'professional'} tone
- Target approximately ${wordTarget} words
- Use proper heading hierarchy (H1 → H2 → H3)
- Include an engaging introduction, well-structured body, and clear conclusion
- Make the content genuinely useful and informative
- Naturally incorporate the target keyword without keyword stuffing
- Format the output in Markdown

${brandContext}`

  const userPrompt = title
    ? `Write a complete SEO article with the title: "${title}"${keyword ? ` targeting the keyword: "${keyword}"` : ''}`
    : `Write a complete SEO article targeting the keyword: "${keyword}"`

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const encoder = new TextEncoder()

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text))
        }
      }
      controller.close()
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
