'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Plus, Loader2, Trash2, BarChart2, Target, AlertCircle, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Project { id: string; name: string }

interface RankLog {
  position: number
  url?: string
  logged_at: string
}

interface RankTarget {
  id: string
  keyword: string
  target_position?: number
  project_id?: string
  projects?: { name: string }
  rank_logs?: RankLog[]
  created_at: string
}

const POSITION_COLOR = (pos: number) => {
  if (pos <= 3) return 'text-emerald-600 bg-emerald-50'
  if (pos <= 10) return 'text-yellow-600 bg-yellow-50'
  return 'text-red-600 bg-red-50'
}

/* ─── Sparkline ──────────────────────────────────────────────────────────── */
const SPARK_W = 140
const SPARK_H = 44
const SPARK_PAD = 6

function Sparkline({ logs }: { logs: RankLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center text-gray-300 text-xs" style={{ width: SPARK_W, height: SPARK_H }}>
        No data
      </div>
    )
  }

  const sorted = [...logs].sort(
    (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
  )

  const positions = sorted.map(l => l.position)
  const first = positions[0]
  const last = positions[positions.length - 1]

  // Lower position number = better rank → invert Y
  const trend: 'improving' | 'declining' | 'stable' =
    last < first ? 'improving' : last > first ? 'declining' : 'stable'
  const color = trend === 'improving' ? '#22c55e' : trend === 'declining' ? '#ef4444' : '#9ca3af'
  const fillColor = trend === 'improving' ? 'rgba(34,197,94,0.08)' : trend === 'declining' ? 'rgba(239,68,68,0.08)' : 'rgba(156,163,175,0.08)'

  const minPos = Math.min(...positions)
  const maxPos = Math.max(...positions)
  const range = maxPos - minPos || 1

  // Map rank value to SVG y coordinate (inverted — rank 1 = top)
  const svgY = (pos: number) =>
    SPARK_PAD + ((pos - minPos) / range) * (SPARK_H - SPARK_PAD * 2)

  const svgX = (i: number) =>
    sorted.length === 1
      ? SPARK_W / 2
      : SPARK_PAD + (i / (sorted.length - 1)) * (SPARK_W - SPARK_PAD * 2)

  if (sorted.length === 1) {
    return (
      <svg width={SPARK_W} height={SPARK_H} viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}>
        <circle cx={SPARK_W / 2} cy={SPARK_H / 2} r={4} fill={color}>
          <title>{`#${sorted[0].position} — ${new Date(sorted[0].logged_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}</title>
        </circle>
      </svg>
    )
  }

  const points = sorted.map((l, i) => `${svgX(i)},${svgY(l.position)}`).join(' ')
  // Area fill path: go along the polyline then drop to the bottom
  const areaPath = [
    `M ${svgX(0)} ${SPARK_H}`,
    ...sorted.map((l, i) => `L ${svgX(i)} ${svgY(l.position)}`),
    `L ${svgX(sorted.length - 1)} ${SPARK_H}`,
    'Z',
  ].join(' ')

  return (
    <svg width={SPARK_W} height={SPARK_H} viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} overflow="visible">
      {/* Area fill */}
      <path d={areaPath} fill={fillColor} />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Data points with tooltips */}
      {sorted.map((l, i) => (
        <circle key={i} cx={svgX(i)} cy={svgY(l.position)} r={3} fill={color} stroke="white" strokeWidth="1.5">
          <title>{`#${l.position} — ${new Date(l.logged_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}</title>
        </circle>
      ))}
    </svg>
  )
}

/* ─── Trend indicator ────────────────────────────────────────────────────── */
function TrendBadge({ current, previous }: { current: number; previous: number }) {
  const delta = previous - current // positive = improving (rank went down numerically)
  if (delta === 0) return (
    <span className="flex items-center gap-0.5 text-xs text-gray-400">
      <Minus className="w-3 h-3" /> No change
    </span>
  )
  if (delta > 0) return (
    <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
      <TrendingUp className="w-3 h-3" /> +{delta}
    </span>
  )
  return (
    <span className="flex items-center gap-0.5 text-xs font-semibold text-red-500">
      <TrendingDown className="w-3 h-3" /> {delta}
    </span>
  )
}

export default function RankClient({ projects }: { projects: Project[] }) {
  const [targets, setTargets] = useState<RankTarget[]>([])
  const [loading, setLoading] = useState(true)
  const [setupRequired, setSetupRequired] = useState(false)

  // Add keyword form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ keyword: '', project_id: '', target_position: '' })
  const [adding, setAdding] = useState(false)

  // Log position
  const [logTarget, setLogTarget] = useState<string | null>(null)
  const [logPos, setLogPos] = useState('')
  const [logUrl, setLogUrl] = useState('')
  const [logging, setLogging] = useState(false)

  useEffect(() => { fetchTargets() }, [])

  async function fetchTargets() {
    setLoading(true)
    const res = await fetch('/api/rank')
    const data = await res.json()
    setTargets(data.targets)
    setSetupRequired(!!data.setup_required)
    setLoading(false)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    const res = await fetch('/api/rank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keyword: form.keyword,
        project_id: form.project_id || null,
        target_position: form.target_position ? Number(form.target_position) : null,
      }),
    })
    if (res.ok) {
      setForm({ keyword: '', project_id: '', target_position: '' })
      setShowForm(false)
      await fetchTargets()
    }
    setAdding(false)
  }

  async function handleDelete(id: string) {
    await fetch('/api/rank', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setTargets(prev => prev.filter(t => t.id !== id))
  }

  async function handleLog(e: React.FormEvent) {
    e.preventDefault()
    if (!logTarget || !logPos) return
    setLogging(true)
    await fetch('/api/rank/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_id: logTarget, position: Number(logPos), url: logUrl || null }),
    })
    setLogTarget(null)
    setLogPos('')
    setLogUrl('')
    await fetchTargets()
    setLogging(false)
  }

  const latestPosition = (t: RankTarget) => {
    if (!t.rank_logs || t.rank_logs.length === 0) return null
    const sorted = [...t.rank_logs].sort((a, b) =>
      new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
    )
    return sorted[0].position
  }

  const trend = (t: RankTarget) => {
    if (!t.rank_logs || t.rank_logs.length < 2) return null
    const sorted = [...t.rank_logs].sort((a, b) =>
      new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
    )
    return sorted[1].position - sorted[0].position // positive = improving (position went down)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            <h1 className="text-2xl font-bold text-gray-900">Rank Tracking</h1>
          </div>
          <p className="text-gray-500">Track your keyword positions in Google over time.</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add keyword
        </button>
      </div>

      {setupRequired && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 max-w-2xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 text-sm mb-1">Database setup required</p>
              <p className="text-xs text-amber-700 mb-3">Run this SQL in your Supabase SQL Editor to enable rank tracking:</p>
              <pre className="bg-amber-100 text-amber-900 text-xs rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{`create table public.rank_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  keyword text not null,
  target_position int,
  created_at timestamptz default now()
);
create table public.rank_logs (
  id uuid primary key default gen_random_uuid(),
  target_id uuid references public.rank_targets(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  position int not null,
  url text,
  logged_at date default current_date
);
alter table public.rank_targets enable row level security;
alter table public.rank_logs enable row level security;
create policy "Users own rank_targets" on public.rank_targets for all using (auth.uid() = user_id);
create policy "Users own rank_logs" on public.rank_logs for all using (auth.uid() = user_id);`}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Add keyword form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 max-w-lg">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm">Track a keyword</h3>
          <form onSubmit={handleAdd} className="space-y-3">
            <input
              value={form.keyword}
              onChange={e => setForm(p => ({ ...p, keyword: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Keyword or phrase to track..."
              required
            />
            <div className="flex gap-2">
              {projects.length > 0 && (
                <select
                  value={form.project_id}
                  onChange={e => setForm(p => ({ ...p, project_id: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">No project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              <input
                type="number"
                min={1}
                max={100}
                value={form.target_position}
                onChange={e => setForm(p => ({ ...p, target_position: e.target.value }))}
                className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Target pos."
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add keyword
            </button>
          </form>
        </div>
      )}

      {/* Log position modal */}
      {logTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="font-bold text-gray-900 mb-4">Log position</h3>
            <form onSubmit={handleLog} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position in Google</label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={logPos}
                  onChange={e => setLogPos(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. 7"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL ranking (optional)</label>
                <input
                  value={logUrl}
                  onChange={e => setLogUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="https://..."
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setLogTarget(null)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={logging}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {logging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Keyword list */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-400 py-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading...
        </div>
      ) : targets.length === 0 && !setupRequired ? (
        <div className="max-w-md text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
          <BarChart2 className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm font-medium mb-1">No keywords tracked yet</p>
          <p className="text-gray-400 text-xs max-w-xs mx-auto">Add a keyword above and log your position each time you check Google.</p>
        </div>
      ) : targets.length > 0 ? (
        <div className="max-w-3xl space-y-3">
          {targets.map(t => {
            const pos = latestPosition(t)
            const delta = trend(t)
            const logs = t.rank_logs ?? []

            return (
              <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start gap-4">
                  {/* Left: keyword info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-semibold text-gray-900">{t.keyword}</p>
                      {t.projects?.name && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{t.projects.name}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      {pos !== null ? (
                        <span className={cn('text-sm font-bold px-2.5 py-0.5 rounded-full', POSITION_COLOR(pos))}>
                          #{pos}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No data yet</span>
                      )}

                      {/* Trend using TrendBadge */}
                      {logs.length >= 2 && (() => {
                        const s = [...logs].sort((a, b) =>
                          new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime()
                        )
                        return <TrendBadge current={s[0].position} previous={s[1].position} />
                      })()}

                      {t.target_position && pos !== null && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Target className="w-3 h-3" />
                          Target: #{t.target_position}
                          {pos <= t.target_position && <span className="text-emerald-500 ml-1">✓ Hit!</span>}
                        </span>
                      )}

                      <span className="text-xs text-gray-400">{logs.length} log{logs.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  {/* Center: sparkline */}
                  <div className="flex-shrink-0 hidden sm:flex items-center self-center">
                    <Sparkline logs={logs} />
                  </div>

                  {/* Right: actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 self-start">
                    <button
                      onClick={() => setLogTarget(t.id)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors whitespace-nowrap"
                    >
                      Log position
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
