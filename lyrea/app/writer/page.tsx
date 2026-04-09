import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PenSquare, Plus, Clock } from 'lucide-react'

export default async function WriterPage() {
  const supabase = await createClient()
  const { data: articles } = await supabase
    .from('articles')
    .select('*, projects(name)')
    .order('updated_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Articles</h1>
          <p className="text-gray-500 mt-1">All your AI-generated content.</p>
        </div>
        <Link
          href="/writer/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New article
        </Link>
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
                  {article.projects?.name && (
                    <span className="text-xs text-gray-400">{article.projects.name}</span>
                  )}
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
                article.status === 'published'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {article.status || 'draft'}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="max-w-md text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
          <PenSquare className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-4">No articles yet.</p>
          <Link
            href="/writer/new"
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
