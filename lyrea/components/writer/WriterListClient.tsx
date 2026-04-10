'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { PenSquare, Plus, Clock, Search, Trash2, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Article {
  id: string
  title: string
  keyword?: string
  status: string
  created_at: string
  updated_at: string
  project_id?: string
  // Supabase returns joined rows as array or object depending on cardinality
  projects?: { name: string } | { name: string }[] | null
}

function projectName(p: Article['projects']): string | undefined {
  if (!p) return undefined
  if (Array.isArray(p)) return p[0]?.name
  return p.name
}

type StatusFilter = 'all' | 'draft' | 'published'

export default function WriterListClient({ initialArticles }: { initialArticles: Article[] }) {
  const [articles, setArticles] = useState(initialArticles)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [projectFilter, setProjectFilter] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  // Unique project names for filter dropdown
  const projectNames = useMemo(() => {
    const names = new Set(articles.map(a => projectName(a.projects)).filter(Boolean) as string[])
    return [...names].sort()
  }, [articles])

  const filtered = useMemo(() => {
    return articles.filter(a => {
      if (statusFilter !== 'all' && (a.status || 'draft') !== statusFilter) return false
      if (projectFilter && projectName(a.projects) !== projectFilter) return false
      if (query) {
        const q = query.toLowerCase()
        const inTitle = (a.title || '').toLowerCase().includes(q)
        const inKeyword = (a.keyword || '').toLowerCase().includes(q)
        if (!inTitle && !inKeyword) return false
      }
      return true
    })
  }, [articles, query, statusFilter, projectFilter])

  const counts = useMemo(() => ({
    all: articles.length,
    draft: articles.filter(a => (a.status || 'draft') === 'draft').length,
    published: articles.filter(a => a.status === 'published').length,
  }), [articles])

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' })
      if (res.ok || res.status === 204) {
        setArticles(prev => prev.filter(a => a.id !== id))
      }
    } finally {
      setDeletingId(null)
      setConfirmId(null)
    }
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Articles</h1>
          <p className="text-gray-500 mt-1 text-sm">{articles.length} article{articles.length !== 1 ? 's' : ''} total</p>
        </div>
        <Link
          href="/writer/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New article
        </Link>
      </div>

      {/* Filters */}
      {articles.length > 0 && (
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by title or keyword..."
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status tabs */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-white">
            {(['all', 'draft', 'published'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-2 text-xs font-medium capitalize transition-colors',
                  statusFilter === s
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                {s} ({counts[s]})
              </button>
            ))}
          </div>

          {/* Project filter */}
          {projectNames.length > 0 && (
            <select
              value={projectFilter}
              onChange={e => setProjectFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-600"
            >
              <option value="">All projects</option>
              {projectNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* List */}
      {filtered.length > 0 ? (
        <div className="max-w-3xl space-y-2">
          {filtered.map(article => (
            <div key={article.id} className="relative group">
              {confirmId === article.id ? (
                /* Inline delete confirmation */
                <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-center justify-between">
                  <p className="text-sm font-medium text-red-700">Delete &ldquo;{article.title || 'Untitled'}&rdquo;? This cannot be undone.</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setConfirmId(null)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(article.id)}
                      disabled={deletingId === article.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {deletingId === article.id
                        ? <><Loader2 className="w-3 h-3 animate-spin" /> Deleting...</>
                        : 'Yes, delete'
                      }
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all flex items-center">
                  <Link
                    href={`/writer/${article.id}`}
                    className="flex-1 min-w-0 px-5 py-4 flex items-center justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{article.title || 'Untitled'}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {projectName(article.projects) && (
                          <span className="text-xs text-gray-400">{projectName(article.projects)}</span>
                        )}
                        {article.keyword && (
                          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{article.keyword}</span>
                        )}
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(article.updated_at || article.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span className={cn(
                      'ml-4 text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0',
                      article.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    )}>
                      {article.status || 'draft'}
                    </span>
                  </Link>
                  <button
                    onClick={() => setConfirmId(article.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity mr-4 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                    title="Delete article"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : articles.length === 0 ? (
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
      ) : (
        <div className="max-w-md text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
          <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No articles match your filters.</p>
          <button
            onClick={() => { setQuery(''); setStatusFilter('all'); setProjectFilter('') }}
            className="text-indigo-600 text-sm hover:underline mt-2 inline-block"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}
