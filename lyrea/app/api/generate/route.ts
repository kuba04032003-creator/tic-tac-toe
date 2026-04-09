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

  const { title, keyword, tone, length, projectId, mode } = await req.json()

  if (!title && !keyword) {
    return new Response('title or keyword required', { status: 400 })
  }

  // Detect if the input is a question/sentence (question mode)
  const targetQuestion = keyword || title
  const isQuestionMode = mode === 'question' ||
    /^(how|why|what|who|when|where|should|is|are|can|does|do|which|best|compare)\b/i.test(targetQuestion) ||
    targetQuestion.trim().endsWith('?')

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

  const questionStructureRules = isQuestionMode ? `
SENTENCE-OPTIMISED MODE — this article targets a full search sentence/question.
Structure the article to be cited by AI engines and win featured snippets:

1. DIRECT ANSWER BLOCK (right after the H1): Start with a "## Quick Answer" section giving a clear 2-3 sentence direct answer to the question. This is what AI engines and featured snippets will pull.
2. QUESTION-BASED HEADINGS: Phrase every H2 as a related sub-question (e.g. "## Why does X happen?" not "## Causes of X")
3. ANSWER-FIRST PARAGRAPHS: Begin each section with the direct answer to that sub-question, then expand with detail.
4. FAQ SECTION: End with a "## Frequently Asked Questions" section with 4-6 related questions people ask, each with a concise answer.
5. TL;DR: End with a "## TL;DR" bullet-point summary of the key takeaways.
` : ''

  const systemPrompt = `You are an expert content writer specialising in search-sentence optimisation — writing content that ranks for full questions and conversational phrases, not just keywords.

Guidelines:
- Write in ${tone || 'professional'} tone
- Target approximately ${wordTarget} words
- Use proper heading hierarchy (H1 → H2 → H3)
- Make the content genuinely useful and informative
- Format the output in Markdown
${questionStructureRules}
${brandContext}`

  const userPrompt = isQuestionMode
    ? `Write a complete article optimised to directly answer the search question: "${keyword || title}"${title && keyword ? `\nArticle title: "${title}"` : ''}`
    : title
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
