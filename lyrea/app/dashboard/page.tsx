import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileText, FolderOpen, PenSquare, Settings } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: articles } = await supabase
    .from('articles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  const stats = [
    { label: 'Projects', value: projects?.length ?? 0, icon: FolderOpen, href: '/projects' },
    { label: 'Articles', value: articles?.length ?? 0, icon: FileText, href: '/writer' },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}
        </h1>
        <p className="text-gray-500 mt-1">Here&apos;s what&apos;s happening with your content.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8 max-w-lg">
        {stats.map(stat => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all"
          >
            <stat.icon className="w-5 h-5 text-indigo-500 mb-3" />
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick actions</h2>
        <div className="flex gap-3">
          <Link
            href="/writer/new"
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <PenSquare className="w-4 h-4" />
            Write new article
          </Link>
          <Link
            href="/projects/new"
            className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <FolderOpen className="w-4 h-4" />
            New project
          </Link>
        </div>
      </div>

      {/* Recent articles */}
      {articles && articles.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent articles</h2>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {articles.map(article => (
              <Link
                key={article.id}
                href={`/writer/${article.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{article.title || 'Untitled'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(article.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  article.status === 'published'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {article.status || 'draft'}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {articles?.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
          <PenSquare className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No articles yet</p>
          <Link href="/writer/new" className="text-indigo-600 text-sm font-medium hover:underline mt-1 inline-block">
            Write your first article
          </Link>
        </div>
      )}
    </div>
  )
}
