import KeywordsClient from '@/components/keywords/KeywordsClient'
import { createClient } from '@/lib/supabase/server'

export default async function KeywordsPage() {
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, industry, language')
    .order('name')

  return <KeywordsClient projects={projects ?? []} />
}
