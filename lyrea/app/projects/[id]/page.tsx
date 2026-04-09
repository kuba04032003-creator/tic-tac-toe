import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, PenSquare, Plus, Globe, Clock } from 'lucide-react'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const { data: articles } = await supabase
    .from('articles')
    .select('*')
    .eq('project_id', id)
    .order('updated_at', { ascending: false })

  return (
    <div className="p-8">
      <Link href="/projects" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to projects
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Globe className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {project.url && <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-500 hover:underline">{project.url}</a>}
              {project.industry && <span className="text-sm text-gray-400">{project.industry}</span>}
              {project.language && <span className="text-sm text-gray-400">{project.language}</span>}
            </div>
          </div>
        </div>
        <Link
          href={`/writer/new?project=${id}`}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New article
        </Link>
      </div>

      {project.description && (
        <p className="text-gray-500 text-sm mb-8 max-w-2xl">{project.description}</p>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Articles ({articles?.length ?? 0})
        </h2>
      </div>

      {articles && articles.length > 0 ? (
        <div className="max-w-3xl space-y-3">
          {articles.map(article => (
            <Link
              key={article.id}
              href={`/writer/${article.id}`}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all flex items-center justify-between group block"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{article.title || 'Untitled'}</p>
                <div className="flex items-center gap-3 mt-1">
                  {article.keyword && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{article.keyword}</span>
                  )}
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(article.updated_at || article.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <span className={`ml-4 text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${
                article.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {article.status || 'draft'}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="max-w-md text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
          <PenSquare className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-3">No articles for this project yet.</p>
          <Link
            href={`/writer/new?project=${id}`}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Write first article
          </Link>
        </div>
      )}
    </div>
  )
}
