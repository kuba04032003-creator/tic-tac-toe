import Anthropic from '@anthropic-ai/sdk'
import Replicate from 'replicate'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic()
const replicate = new Replicate({ auth: process.env.REPLICATE_API_KEY })

export const maxDuration = 60

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  if (!process.env.REPLICATE_API_KEY || process.env.REPLICATE_API_KEY === 'your_replicate_api_key_here') {
    return new Response('REPLICATE_API_KEY not set in .env.local', { status: 503 })
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

  // Call Flux Pro on Replicate (best quality)
  const output = await replicate.run('black-forest-labs/flux-pro', {
    input: {
      prompt: imagePrompt,
      aspect_ratio: '16:9',
      output_format: 'webp',
      output_quality: 90,
      safety_tolerance: 2,
    },
  })

  const urls = output as string[]
  const imageUrl = Array.isArray(urls) ? urls[0] : String(output)

  return Response.json({ url: imageUrl, prompt: imagePrompt })
}
