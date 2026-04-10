import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ArticleEditor from '@/components/writer/ArticleEditor'

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: row } = await supabase
    .from('articles')
    .select('*, projects(id, wp_url, wp_username, wp_app_password)')
    .eq('id', id)
    .single()

  if (!row) notFound()

  const { projects, ...article } = row as typeof row & {
    projects?: { id: string; wp_url?: string; wp_username?: string; wp_app_password?: string } | null
  }

  const wpCreds = projects
    ? {
        url: projects.wp_url ?? '',
        username: projects.wp_username ?? '',
        appPassword: projects.wp_app_password ?? '',
      }
    : null

  return (
    <ArticleEditor
      article={article}
      wpCreds={wpCreds}
      projectId={article.project_id ?? null}
    />
  )
}
