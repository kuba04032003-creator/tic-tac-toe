import { createClient } from '@/lib/supabase/server'
import NewArticleClient from '@/components/writer/NewArticleClient'

export default async function NewArticlePage() {
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .order('name')

  return <NewArticleClient projects={projects ?? []} />
}
