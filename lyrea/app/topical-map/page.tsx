import { createClient } from '@/lib/supabase/server'
import TopicalMapClient from '@/components/topical-map/TopicalMapClient'

export default async function TopicalMapPage() {
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, industry, language')
    .order('name')
  return <TopicalMapClient projects={projects ?? []} />
}
