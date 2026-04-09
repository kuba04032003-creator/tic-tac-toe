import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { sentence, sentence_type, ai_potential, topic, industry } = await req.json()

  try {
    await supabase.from('sentence_uses').insert({
      user_id: user.id,
      sentence,
      sentence_type: sentence_type || null,
      ai_potential: ai_potential || null,
      topic: topic || null,
      industry: industry || null,
    })
  } catch (_) { /* table may not exist yet — run SQL in Supabase */ }

  return Response.json({ ok: true })
}
