import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const body = await req.json()
  const { data, error } = await supabase
    .from('articles')
    .insert({
      user_id: user.id,
      project_id: body.project_id ?? null,
      title: body.title,
      content: body.content ?? '',
      keyword: body.keyword ?? null,
      status: 'draft',
    })
    .select()
    .single()

  if (error) return new Response(error.message, { status: 500 })
  return Response.json(data)
}
