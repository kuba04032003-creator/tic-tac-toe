# WordPress Credentials Per Project — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Save WordPress site URL, username, and Application Password per project so users don't have to re-enter them every time they publish.

**Architecture:** Add three nullable columns to the `projects` table. The article editor page fetches these fields and passes them to `ArticleEditor` as props. The WP modal pre-fills from those props and offers a "Save to project" checkbox that persists credentials via a new `PATCH /api/projects/[id]` endpoint. The project detail page gets a `ProjectWpForm` client component for managing credentials outside the editor.

**Tech Stack:** Next.js 16.2 App Router, Supabase (`@supabase/ssr`), TypeScript, Tailwind CSS v4

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| Supabase SQL Editor | Manual | Add 3 columns to `projects` |
| `lyrea/app/api/projects/[id]/route.ts` | Create | PATCH endpoint — update any project fields |
| `lyrea/app/writer/[id]/page.tsx` | Modify | Join project wp fields, pass to editor |
| `lyrea/components/writer/ArticleEditor.tsx` | Modify | Accept wpCreds + projectId props, pre-fill modal, save checkbox |
| `lyrea/components/projects/ProjectWpForm.tsx` | Create | Client form for editing WP credentials on project detail page |
| `lyrea/app/projects/[id]/page.tsx` | Modify | Render `ProjectWpForm` below brand voice section |

---

## Task 1: Add columns to `projects` table

**Files:**
- Manual SQL step in Supabase

- [ ] **Step 1: Run migration in Supabase SQL Editor**

Go to your Supabase project → SQL Editor → New query. Paste and run:

```sql
alter table public.projects add column if not exists wp_url text;
alter table public.projects add column if not exists wp_username text;
alter table public.projects add column if not exists wp_app_password text;
```

- [ ] **Step 2: Verify columns exist**

In Supabase → Table Editor → `projects`. Confirm `wp_url`, `wp_username`, `wp_app_password` appear as nullable text columns.

---

## Task 2: Create `PATCH /api/projects/[id]` endpoint

**Files:**
- Create: `lyrea/app/api/projects/[id]/route.ts`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p "lyrea/app/api/projects/[id]"
```

Create `lyrea/app/api/projects/[id]/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('projects')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return new Response(error.message, { status: 400 })
  return Response.json(data)
}
```

- [ ] **Step 2: Verify the endpoint responds**

With the dev server running (`export PATH="$PATH:/c/Program Files/nodejs" && cd lyrea && npm run dev`), open a terminal and run (replace `<project-id>` with a real project UUID from your DB):

```bash
curl -X PATCH http://localhost:3000/api/projects/<project-id> \
  -H "Content-Type: application/json" \
  -d '{"wp_url":"https://test.com"}' \
  -w "\nHTTP %{http_code}\n"
```

Expected: HTTP 200 and a JSON project object with `wp_url: "https://test.com"`.
(If HTTP 401, you're not logged in — test via the browser instead after login.)

- [ ] **Step 3: Commit**

```bash
git add "lyrea/app/api/projects/[id]/route.ts"
git commit -m "Add PATCH /api/projects/[id] endpoint

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Pass WP credentials from article page to editor

**Files:**
- Modify: `lyrea/app/writer/[id]/page.tsx`
- Modify: `lyrea/components/writer/ArticleEditor.tsx` (props interface only)

- [ ] **Step 1: Update `ArticleEditor` props interface**

In `lyrea/components/writer/ArticleEditor.tsx`, find the `Article` interface and the component signature (around line 212):

```typescript
interface Article {
  id: string
  title: string
  content: string
  keyword?: string
  status: string
  project_id?: string
}
```

Change the component signature from:

```typescript
export default function ArticleEditor({ article }: { article: Article }) {
```

to:

```typescript
interface WpCreds {
  url: string
  username: string
  appPassword: string
}

export default function ArticleEditor({
  article,
  wpCreds,
  projectId,
}: {
  article: Article
  wpCreds?: WpCreds | null
  projectId?: string | null
}) {
```

- [ ] **Step 2: Pre-fill wpForm state from props**

Still in `ArticleEditor.tsx`, find (around line 246):

```typescript
  const [wpForm, setWpForm] = useState({ siteUrl: '', username: '', appPassword: '', wpStatus: 'draft' })
```

Replace with:

```typescript
  const [wpForm, setWpForm] = useState({
    siteUrl: wpCreds?.url ?? '',
    username: wpCreds?.username ?? '',
    appPassword: wpCreds?.appPassword ?? '',
    wpStatus: 'draft',
  })
```

- [ ] **Step 3: Update article page to fetch and pass wp credentials**

Replace the entire contents of `lyrea/app/writer/[id]/page.tsx` with:

```typescript
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
```

- [ ] **Step 4: Verify the editor still loads**

Open http://localhost:3000/writer and click any article. The editor should load normally. Open the WP modal — if the article belongs to a project with saved credentials, fields should be pre-filled. If not, fields are empty (same as before).

- [ ] **Step 5: Commit**

```bash
git add lyrea/app/writer/[id]/page.tsx lyrea/components/writer/ArticleEditor.tsx
git commit -m "Pass WP credentials from project to article editor

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Add "Save to project" checkbox in WP modal

**Files:**
- Modify: `lyrea/components/writer/ArticleEditor.tsx`

- [ ] **Step 1: Add saveToProject state**

In `ArticleEditor.tsx`, directly below the wpForm state (around line 246), add:

```typescript
  const [saveToProject, setSaveToProject] = useState(true)
```

- [ ] **Step 2: Persist credentials after successful publish**

In `handleWpPublish`, find the success block (around line 387). The current code after a successful publish looks like:

```typescript
      const data = await res.json()
      setWpResult(data)
```

Add credential saving right after `setWpResult(data)`:

```typescript
      const data = await res.json()
      setWpResult(data)

      // Persist credentials to project if checkbox is checked
      if (saveToProject && projectId) {
        try {
          await fetch(`/api/projects/${projectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              wp_url: wpForm.siteUrl,
              wp_username: wpForm.username,
              wp_app_password: wpForm.appPassword,
            }),
          })
        } catch (_) { /* noop — publish succeeded, don't block */ }
      }
```

- [ ] **Step 3: Add checkbox to the modal form**

In the WP modal form, find the Application Password field block (around line 820). After the closing `</div>` of that field block, add the checkbox:

```tsx
                {projectId && (
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={saveToProject}
                      onChange={e => setSaveToProject(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Save credentials to project
                  </label>
                )}
```

- [ ] **Step 4: Verify end-to-end**

1. Open an article that belongs to a project.
2. Click "To WordPress".
3. The modal should show the pre-filled credentials (or empty if none saved yet).
4. Fill in credentials, leave "Save credentials to project" checked.
5. Publish (or cancel — you just need to check the checkbox renders).
6. After a successful publish, open Supabase → Table Editor → `projects`, find the project — `wp_url`, `wp_username`, `wp_app_password` should be populated.
7. Refresh the article editor — opening the WP modal again should show the saved credentials pre-filled.

- [ ] **Step 5: Commit**

```bash
git add lyrea/components/writer/ArticleEditor.tsx
git commit -m "Add Save-to-project checkbox in WP publish modal

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: WP credentials section on project detail page

**Files:**
- Create: `lyrea/components/projects/ProjectWpForm.tsx`
- Modify: `lyrea/app/projects/[id]/page.tsx`

- [ ] **Step 1: Create `ProjectWpForm` client component**

Create `lyrea/components/projects/ProjectWpForm.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Check, Loader2, Globe } from 'lucide-react'

interface Props {
  projectId: string
  initial: { wp_url?: string | null; wp_username?: string | null; wp_app_password?: string | null }
}

export default function ProjectWpForm({ projectId, initial }: Props) {
  const [form, setForm] = useState({
    wp_url: initial.wp_url ?? '',
    wp_username: initial.wp_username ?? '',
    wp_app_password: initial.wp_app_password ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)

    const res = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } else {
      setError('Failed to save. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <p className="text-xs text-gray-500">
        Save your WordPress credentials here so they auto-fill when publishing articles from this project.
        Use a <strong>WordPress Application Password</strong> — create one in{' '}
        <em>Users → Profile → Application Passwords</em>.
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">WordPress site URL</label>
        <input
          value={form.wp_url}
          onChange={e => setForm(p => ({ ...p, wp_url: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="https://myblog.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
        <input
          value={form.wp_username}
          onChange={e => setForm(p => ({ ...p, wp_username: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="admin"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Application Password</label>
        <input
          type="password"
          value={form.wp_app_password}
          onChange={e => setForm(p => ({ ...p, wp_app_password: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
        />
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
        {saved ? 'Saved!' : 'Save credentials'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Add WP section to project detail page**

In `lyrea/app/projects/[id]/page.tsx`, add the `Globe` import if not already present (it is — check line ~4) and import `ProjectWpForm`:

At the top of the file, add after the existing imports:

```typescript
import ProjectWpForm from '@/components/projects/ProjectWpForm'
```

Then at the bottom of the returned JSX, after the closing `</div>` of the Brand Voice section (after line 190), add:

```tsx
      {/* WordPress Credentials */}
      <div className="max-w-2xl mt-10">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4 text-indigo-500" />
          <h2 className="text-lg font-semibold text-gray-900">WordPress</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Credentials saved here will auto-fill when publishing articles from this project.
        </p>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <ProjectWpForm
            projectId={id}
            initial={{
              wp_url: project.wp_url,
              wp_username: project.wp_username,
              wp_app_password: project.wp_app_password,
            }}
          />
        </div>
      </div>
```

- [ ] **Step 3: Verify project detail page**

Open http://localhost:3000/projects, click any project. At the bottom of the page, below Brand Voice, a "WordPress" section should appear with the credentials form. Enter credentials and click Save — check Supabase to confirm they saved.

- [ ] **Step 4: Commit**

```bash
git add lyrea/components/projects/ProjectWpForm.tsx lyrea/app/projects/[id]/page.tsx
git commit -m "Add WP credentials section to project detail page

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Push and update CLAUDE.md

- [ ] **Step 1: Push all commits**

```bash
git push
```

- [ ] **Step 2: Update CLAUDE.md next steps**

In `CLAUDE.md`, under `## Next to build`, mark the WP credentials item as done and add the remaining items:

```markdown
- [x] WordPress per-project credentials (wp_url, wp_username, wp_app_password on projects table)
- [ ] Sentence flywheel trending dashboard (most searched topics + most-used sentences)
- [ ] Rank tracking — auto-fetch via Google Search Console API
```

- [ ] **Step 3: Commit CLAUDE.md**

```bash
git add CLAUDE.md
git commit -m "Update CLAUDE.md: mark WP credentials complete

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push
```
