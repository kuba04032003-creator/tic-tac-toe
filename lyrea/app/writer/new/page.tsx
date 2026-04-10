import { createClient } from '@/lib/supabase/server'
import NewArticleClient from '@/components/writer/NewArticleClient'

export default async function NewArticlePage({
  searchParams,
}: {
  searchParams: Promise<{ keyword?: string; project?: string; title?: string }>
}) {
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
    .order('name')

  const { keyword, project, title } = await searchParams

  return (
    <NewArticleClient
      projects={projects ?? []}
      defaultKeyword={keyword}
      defaultProjectId={project}
      defaultTitle={title}
    />
  )
}
