import { createClient } from '@/lib/supabase/server'
import RankClient from '@/components/rank/RankClient'

export default async function RankPage() {
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .order('name')

  return <RankClient projects={projects ?? []} />
}
