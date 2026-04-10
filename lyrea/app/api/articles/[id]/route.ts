import { createClient } from '@/lib/supabase/server'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { id } = await params

  const { error } = await supabase
    .from('articles')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return new Response(error.message, { status: 500 })
  return new Response(null, { status: 204 })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { id } = await params
  const body = await req.json()

  const update: Record<string, string> = { updated_at: new Date().toISOString() }
  if (body.title !== undefined) update.title = body.title
  if (body.content !== undefined) update.content = body.content
  if (body.status !== undefined) update.status = body.status

  const { data, error } = await supabase
    .from('articles')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return new Response(error.message, { status: 500 })
  return Response.json(data)
}
