import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Globe, ArrowRight } from 'lucide-react'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">Each project represents one website.</p>
        </div>
        <Link
          href="/projects/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New project
        </Link>
      </div>

      {projects && projects.length > 0 ? (
        <div className="grid gap-4 max-w-2xl">
          {projects.map(project => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{project.name}</p>
                  <p className="text-sm text-gray-400">{project.url || 'No URL set'}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="max-w-md text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
          <Globe className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm mb-4">No projects yet. Create one to get started.</p>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create first project
          </Link>
        </div>
      )}
    </div>
  )
}
