import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ArticleEditor from '@/components/writer/ArticleEditor'

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: article } = await supabase
    .from('articles')
    .select('*')
    .eq('id', id)
    .single()

  if (!article) notFound()

  return <ArticleEditor article={article} />
}
