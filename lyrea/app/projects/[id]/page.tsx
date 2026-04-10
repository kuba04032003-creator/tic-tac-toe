import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, PenSquare, Plus, Globe, Clock, Mic, FileText, Map, BarChart2, CheckCircle2, FileEdit } from 'lucide-react'
import BrandVoiceForm from '@/components/settings/BrandVoiceForm'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

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

  const { data: brandVoice } = await supabase
    .from('brand_voices')
    .select('*')
    .eq('user_id', user!.id)
    .eq('project_id', id)
    .single()

  const total = articles?.length ?? 0
  const published = articles?.filter(a => a.status === 'published').length ?? 0
  const drafts = total - published

  return (
    <div className="p-8">
      <Link href="/projects" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to projects
      </Link>

      {/* Project header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <Globe className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {project.url && (
                <a href={project.url} target="_blank" rel="noopener noreferrer" className="text-sm text-indigo-500 hover:underline">
                  {project.url}
                </a>
              )}
              {project.industry && <span className="text-sm text-gray-400">{project.industry}</span>}
              {project.language && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{project.language}</span>}
            </div>
          </div>
        </div>
        <Link
          href={`/writer/new?project=${id}`}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          New article
        </Link>
      </div>

      {project.description && (
        <p className="text-gray-500 text-sm mb-6 max-w-2xl">{project.description}</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 max-w-lg mb-8">
        {[
          { label: 'Total articles', value: total, icon: FileText, color: 'text-indigo-500' },
          { label: 'Published', value: published, icon: CheckCircle2, color: 'text-emerald-500' },
          { label: 'Drafts', value: drafts, icon: FileEdit, color: 'text-gray-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <stat.icon className={`w-4 h-4 mb-2 ${stat.color}`} />
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Quick actions</p>
        <div className="flex gap-3 flex-wrap">
          <Link
            href={`/writer/new?project=${id}`}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <PenSquare className="w-4 h-4" />
            Write article
          </Link>
          <Link
            href="/brief"
            className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-4 h-4 text-indigo-400" />
            Content brief
          </Link>
          <Link
            href="/topical-map"
            className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Map className="w-4 h-4 text-indigo-400" />
            Topical map
          </Link>
          <Link
            href="/keywords"
            className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <BarChart2 className="w-4 h-4 text-indigo-400" />
            Keyword research
          </Link>
        </div>
      </div>

      {/* Articles list */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Articles ({total})
          </p>
        </div>

        {articles && articles.length > 0 ? (
          <div className="max-w-3xl space-y-2">
            {articles.map(article => (
              <Link
                key={article.id}
                href={`/writer/${article.id}`}
                className="bg-white rounded-xl border border-gray-200 px-5 py-4 hover:border-indigo-300 hover:shadow-sm transition-all flex items-center justify-between group"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{article.title || 'Untitled'}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {article.keyword && (
                      <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">{article.keyword}</span>
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

      {/* Brand Voice */}
      <div className="max-w-2xl">
        <div className="flex items-center gap-2 mb-1">
          <Mic className="w-4 h-4 text-indigo-500" />
          <h2 className="text-lg font-semibold text-gray-900">Project Brand Voice</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Override global brand voice for articles in this project. Leaves global settings untouched.
        </p>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <BrandVoiceForm existing={brandVoice ?? null} userId={user!.id} projectId={id} />
        </div>
      </div>
    </div>
  )
}
