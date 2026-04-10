import { createClient } from '@/lib/supabase/server'
import AuditClient from '@/components/audit/AuditClient'

export default async function AuditPage() {
  const supabase = await createClient()

  const [{ data: projects }] = await Promise.all([
    supabase.from('projects').select('id, name').order('name'),
  ])

  return <AuditClient projects={projects ?? []} />
}
