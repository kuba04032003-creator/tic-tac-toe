import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { target_id, position, url } = await req.json()
  if (!target_id || !position) return new Response('target_id and position required', { status: 400 })

  try {
    const { data, error } = await supabase.from('rank_logs').insert({
      target_id,
      user_id: user.id,
      position: Number(position),
      url: url || null,
    }).select().single()

    if (error) throw error
    return Response.json(data)
  } catch (_) {
    return new Response('Failed to log rank', { status: 503 })
  }
}
