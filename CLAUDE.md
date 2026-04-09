# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Active project: LYREA Content Engine

AI-powered SEO content platform. All code lives in `lyrea/`.

## Running the project

```
export PATH="$PATH:/c/Program Files/nodejs" && cd lyrea && npm run dev
```

Open http://localhost:3000

## Stack

- **Framework**: Next.js 16.2 (App Router, Turbopack) — uses `proxy.ts` not `middleware.ts`
- **Auth + DB**: Supabase (`@supabase/ssr`) — project: `qspymmbbrmyqzsuumwnn`
- **AI**: Anthropic Claude API (`claude-sonnet-4-6`), streaming via `/api/generate`
- **Editor**: Tiptap (StarterKit + Placeholder + CharacterCount)
- **Styling**: Tailwind CSS v4

## Database tables (Supabase)

- `projects` — websites (name, url, language, industry)
- `articles` — generated content (title, content, keyword, status)
- `brand_voices` — tone config per user/project

All tables have RLS enabled — users only access their own rows.

## Key files

- `lyrea/proxy.ts` — auth guard (redirects unauthenticated users to /login)
- `lyrea/app/api/generate/route.ts` — streaming Claude API endpoint
- `lyrea/app/api/articles/route.ts` — create article
- `lyrea/app/api/articles/[id]/route.ts` — update article
- `lyrea/components/writer/ArticleEditor.tsx` — Tiptap editor with autosave
- `lyrea/components/writer/NewArticleClient.tsx` — article generation form
- `lyrea/lib/supabase/client.ts` — browser Supabase client
- `lyrea/lib/supabase/server.ts` — server Supabase client

## MVP status (built)

- [x] Auth (login / signup)
- [x] Dashboard
- [x] Projects (create / list)
- [x] AI article writer (streaming)
- [x] Rich editor (Tiptap, autosave, Ctrl+S)
- [x] Brand voice settings
- [x] Route protection

## Next to build

- [ ] Project detail page (`/projects/[id]`)
- [ ] Article status (publish / unpublish)
- [ ] Prose styling for editor (typography plugin)
- [ ] Editor toolbar (bold, italic, headings)
- [ ] Keyword research (basic)
- [ ] Topical map generator

## Git workflow

After every change, commit and push immediately.

```
git add <files>
git commit -m "Short imperative description"
git push
```

Commit message rules:
- Imperative mood: "Add", "Fix", "Update"
- Under 72 chars
- Include `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` in body

Remote: https://github.com/kuba04032003-creator/tic-tac-toe
