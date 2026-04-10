import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('projects')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return new Response(error.message, { status: 400 })
  return Response.json(data)
}
