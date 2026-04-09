import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  try {
    const { data: targets } = await supabase
      .from('rank_targets')
      .select('*, projects(name), rank_logs(position, url, logged_at)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    return Response.json({ targets: targets ?? [] })
  } catch (_) {
    return Response.json({ targets: [], setup_required: true })
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { keyword, project_id, target_position } = await req.json()
  if (!keyword) return new Response('keyword required', { status: 400 })

  try {
    const { data, error } = await supabase.from('rank_targets').insert({
      user_id: user.id,
      keyword,
      project_id: project_id || null,
      target_position: target_position || null,
    }).select().single()

    if (error) throw error
    return Response.json(data)
  } catch (_) {
    return new Response('Table not set up yet. Run the rank tracking SQL in Supabase.', { status: 503 })
  }
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { id } = await req.json()
  await supabase.from('rank_targets').delete().eq('id', id).eq('user_id', user.id)
  return Response.json({ ok: true })
}
