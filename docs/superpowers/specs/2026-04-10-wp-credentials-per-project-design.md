# WordPress Credentials Per Project

**Date:** 2026-04-10  
**Status:** Approved

## Problem

Every time a user publishes an article to WordPress they must re-enter the site URL, username, and Application Password. There is no persistence. This is friction for users who publish regularly to the same site.

## Solution

Store WP credentials on the `projects` table. When the article belongs to a project, pre-fill the WP modal with saved credentials. A checkbox in the modal lets the user save updated credentials back to the project.

## Architecture

### 1. Database

Add three nullable columns to `public.projects`:

```sql
alter table public.projects add column wp_url text;
alter table public.projects add column wp_username text;
alter table public.projects add column wp_app_password text;
```

No new tables. RLS on `projects` already scopes rows to the owner.

### 2. Article page — `app/writer/[id]/page.tsx`

Extend the Supabase query to join the article's project and select the three WP fields:

```
articles.*, projects(id, wp_url, wp_username, wp_app_password)
```

Pass the result to `ArticleEditor` as a new `wpCreds` prop plus `projectId`.

### 3. New API endpoint — `app/api/projects/[id]/route.ts`

PATCH handler. Accepts a JSON body with any subset of project fields (including wp_url, wp_username, wp_app_password). Updates the row in Supabase and returns the updated project. Auth-guarded — only the project owner can update.

### 4. ArticleEditor — WP modal changes

- Initialize `wpForm` state from `wpCreds` props (pre-filled fields).
- Add a "Save credentials to this project" checkbox, visible only when the article belongs to a project. Checked by default.
- On successful publish, if the checkbox is checked, call `PATCH /api/projects/[id]` with the current form values.
- No change to the modal layout beyond the checkbox.

### 5. Project detail page — WP credentials section

Add a collapsible "WordPress" card on the project detail page (`app/projects/[id]/page.tsx`). Shows current saved credentials (password masked) with an inline edit form. Submits to `PATCH /api/projects/[id]`. This lets users manage credentials without opening an article.

## Data flow

```
ArticlePage (server)
  └─ fetch article + project.wp_*
       └─ ArticleEditor (client)
            ├─ wpForm state initialized with project creds
            ├─ User edits / publishes
            └─ if saveToProject && projectId
                 └─ PATCH /api/projects/[id]  ← persists creds
```

## Error handling

- If PATCH to save credentials fails, the publish still succeeds — log a console warning, do not block the user.
- If project has no credentials, form starts empty (existing behaviour).

## Out of scope

- Encrypting credentials at rest (Supabase handles transport encryption; app-level encryption is a future concern).
- Multiple WP sites per project.
