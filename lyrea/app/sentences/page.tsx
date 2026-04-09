import { createClient } from '@/lib/supabase/server'
import SentencesClient from '@/components/sentences/SentencesClient'

export default async function SentencesPage() {
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, industry, language')
    .order('name')

  return <SentencesClient projects={projects ?? []} />
}
