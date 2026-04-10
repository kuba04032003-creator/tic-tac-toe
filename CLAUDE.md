# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Active project: LYREA Content Engine

AI-powered SEO content platform. Core USP: transforms basic keywords into long-tail, conversational, AI-search-optimised queries (ChatGPT/Perplexity/Google AI style). All code lives in `lyrea/`.

## Running the project

```
export PATH="$PATH:/c/Program Files/nodejs" && cd lyrea && npm run dev
```

Open http://localhost:3000

## Stack

- **Framework**: Next.js 16.2 (App Router, Turbopack) — uses `proxy.ts` not `middleware.ts`
- **Auth + DB**: Supabase (`@supabase/ssr`) — project: `qspymmbbrmyqzsuumwnn`
- **AI**: Anthropic Claude API (`claude-sonnet-4-6`), streaming via `/api/generate`
- **Editor**: Tiptap v3 (StarterKit + Placeholder + CharacterCount + Image)
- **Styling**: Tailwind CSS v4 + `@tailwindcss/typography` (loaded via `@plugin` in globals.css)
- **Images**: Replicate (`black-forest-labs/flux-pro`) — requires `REPLICATE_API_KEY` in `.env.local`

## Database tables (Supabase)

- `projects` — websites (name, url, language, industry, description)
- `articles` — generated content (title, content, keyword, status, project_id)
- `brand_voices` — tone config per user/project

All tables have RLS enabled — users only access their own rows.

## Key files

- `lyrea/proxy.ts` — auth guard (redirects unauthenticated users to /login)
- `lyrea/app/api/generate/route.ts` — streaming Claude API endpoint
- `lyrea/app/api/articles/route.ts` — create article
- `lyrea/app/api/articles/[id]/route.ts` — update/delete article
- `lyrea/app/api/brief/route.ts` — AI content brief generator
- `lyrea/app/api/topical-map/route.ts` — pillar + cluster content map
- `lyrea/app/api/internal-links/route.ts` — AI internal link suggestions
- `lyrea/app/api/keywords/route.ts` — long-tail keyword cluster generator
- `lyrea/app/api/generate-image/route.ts` — Flux Pro image generation via Replicate
- `lyrea/app/api/wordpress/route.ts` — WordPress REST API publisher
- `lyrea/components/writer/ArticleEditor.tsx` — Tiptap editor with autosave, SEO panel, image gen, WP publish
- `lyrea/components/writer/SeoScorePanel.tsx` — real-time SEO + AI Citation scores + internal links
- `lyrea/components/writer/NewArticleClient.tsx` — article generation form
- `lyrea/components/brief/BriefClient.tsx` — content brief UI
- `lyrea/components/topical-map/TopicalMapClient.tsx` — topical map UI
- `lyrea/components/keywords/KeywordsClient.tsx` — keyword research UI
- `lyrea/lib/supabase/client.ts` — browser Supabase client
- `lyrea/lib/supabase/server.ts` — server Supabase client

## Features (fully built)

- [x] Auth (login / signup)
- [x] Dashboard (stats, recent articles, quick actions)
- [x] Projects (create / list / detail with stats + quick actions)
- [x] Project brand voice (per-project override)
- [x] AI article writer (streaming, tone, length)
- [x] Rich editor (Tiptap, autosave every 30s, Ctrl+S, formatting toolbar)
- [x] Regenerate article (tone + length picker, streams into editor)
- [x] SEO Score Panel (8 checks, real-time, 500ms debounce)
- [x] AI Citation Score (7 checks for ChatGPT/Perplexity/Google AI)
- [x] Internal link suggestions (lazy-loaded per project)
- [x] Content Brief generator (titles, outline, semantic keywords, AI citation tips)
- [x] Topical Map generator (pillar + 12 clusters, intent/priority/AI badges)
- [x] Keyword Research (5 intent clusters, long-tail conversational queries, volume/difficulty/relevance)
- [x] AI image generation (Flux Pro via Replicate, insert into article)
- [x] WordPress publishing (REST API with Application Password)
- [x] Copy as Markdown
- [x] Article status toggle (draft / published)
- [x] Brand voice settings (global)
- [x] Prose styling in editor (@tailwindcss/typography)
- [x] Route protection

## Known issues / env requirements

- `REPLICATE_API_KEY` must be set in `lyrea/.env.local` for image generation
- Content is stored as HTML in DB after first save; `markdownToHtml()` detects HTML vs markdown on load

## Next to build

- [x] Writer list — search by title/keyword, filter by status and project
- [x] Projects list — show article count per project
- [x] Delete article — from list (hover trash icon) and from editor (top bar)
- [x] Article generation streaming preview (tokens stream live before redirect)
- [x] Rank tracking UI (/rank — manual logging with sparklines)
- [x] SEO Audit UI (/audit — full page analysis)
- [x] Sentence flywheel UI (/sentences — question research with AI citation scoring)
- [x] WordPress per-project credentials (wp_url, wp_username, wp_app_password on projects table; auto-fills editor modal; editable on project detail page)
- [ ] Sentence flywheel trending dashboard (most searched topics + most-used sentences)
- [ ] Rank tracking — auto-fetch via Google Search Console API

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
