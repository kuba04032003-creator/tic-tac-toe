import { createClient } from '@/lib/supabase/server'
import WriterListClient from '@/components/writer/WriterListClient'

export default async function WriterPage() {
  const supabase = await createClient()
  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, keyword, status, created_at, updated_at, project_id, projects(name)')
    .order('updated_at', { ascending: false })

  return <WriterListClient initialArticles={articles ?? []} />
}
