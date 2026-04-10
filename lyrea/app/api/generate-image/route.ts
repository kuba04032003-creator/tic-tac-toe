import Anthropic from '@anthropic-ai/sdk'
import Replicate from 'replicate'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic()
const replicate = new Replicate({ auth: process.env.REPLICATE_API_KEY })

export const maxDuration = 60

// Safely extract a URL from any Replicate output shape
function extractImageUrl(output: unknown): string {
  if (typeof output === 'string') return output
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0]
    if (typeof first === 'string') return first
    // FileOutput object from newer Replicate SDK
    if (first && typeof (first as Record<string, unknown>).url === 'function') {
      return (first as { url: () => string }).url()
    }
    return String(first)
  }
  if (output && typeof (output as Record<string, unknown>).url === 'function') {
    return (output as { url: () => string }).url()
  }
  return String(output ?? '')
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const key = process.env.REPLICATE_API_KEY
  if (!key || key === 'your_replicate_api_key_here') {
    return Response.json(
      { error: 'REPLICATE_API_KEY not configured. Add it to .env.local to enable image generation.' },
      { status: 503 }
    )
  }

  const { keyword, title, style } = await req.json()
  if (!keyword && !title) return new Response('keyword or title required', { status: 400 })

  // Use Claude Haiku to craft a high-quality image prompt
  const promptMsg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Create a short, vivid image generation prompt (max 60 words) for a blog article about: "${keyword || title}".
Style: ${style || 'professional, clean, photorealistic, 16:9 hero image, high quality, editorial photography'}.
Return ONLY the image prompt, nothing else. No quotes.`,
    }],
  })

  const imagePrompt = promptMsg.content[0].type === 'text'
    ? promptMsg.content[0].text.trim()
    : `Professional editorial photo for article about ${keyword || title}`

  try {
    const output = await replicate.run('black-forest-labs/flux-pro', {
      input: {
        prompt: imagePrompt,
        aspect_ratio: '16:9',
        output_format: 'webp',
        output_quality: 90,
        safety_tolerance: 2,
      },
    })

    const imageUrl = extractImageUrl(output)
    if (!imageUrl || imageUrl === 'undefined' || imageUrl === 'null') {
      return Response.json({ error: 'Image generation returned an empty result. Try again.' }, { status: 500 })
    }

    return Response.json({ url: imageUrl, prompt: imagePrompt })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Image generation failed'
    return Response.json({ error: message }, { status: 500 })
  }
}
