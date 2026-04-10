import { createClient } from '@/lib/supabase/server'
import BriefClient from '@/components/brief/BriefClient'

export default async function BriefPage() {
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, industry, language')
    .order('name')
  return <BriefClient projects={projects ?? []} />
}
