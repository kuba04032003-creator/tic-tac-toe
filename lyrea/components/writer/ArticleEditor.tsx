'use client'

import { useEffect, useState, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Link from 'next/link'
import { ArrowLeft, Save, Check, Loader2 } from 'lucide-react'

interface Article {
  id: string
  title: string
  content: string
  keyword?: string
  status: string
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n+/g, '</p><p>')
    .replace(/^(?!<[hul])/gm, '')
    .replace(/^(.+)$/gm, (line) => {
      if (line.startsWith('<')) return line
      return `<p>${line}</p>`
    })
}

export default function ArticleEditor({ article }: { article: Article }) {
  const [title, setTitle] = useState(article.title || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [wordCount, setWordCount] = useState(0)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing or generate an article...' }),
      CharacterCount,
    ],
    content: article.content ? markdownToHtml(article.content) : '',
    editorProps: {
      attributes: {
        class: 'prose prose-gray max-w-none focus:outline-none min-h-[500px] px-8 py-6',
      },
    },
    onUpdate: ({ editor }) => {
      setWordCount(editor.storage.characterCount.words())
    },
  })

  useEffect(() => {
    if (editor && article.content) {
      setWordCount(editor.storage.characterCount.words())
    }
  }, [editor, article.content])

  const save = useCallback(async () => {
    if (!editor) return
    setSaving(true)

    const html = editor.getHTML()

    await fetch(`/api/articles/${article.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content: html }),
    })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [editor, title, article.id])

  // Autosave every 30s
  useEffect(() => {
    const interval = setInterval(save, 30000)
    return () => clearInterval(interval)
  }, [save])

  // Cmd/Ctrl+S
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [save])

  const readingTime = Math.max(1, Math.round(wordCount / 200))

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4">
          <Link href="/writer" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{wordCount} words</span>
            <span>·</span>
            <span>{readingTime} min read</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {article.keyword && (
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-medium">
              {article.keyword}
            </span>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : saved ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="px-8 pt-10 pb-4">
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full text-3xl font-bold text-gray-900 focus:outline-none placeholder-gray-300 border-none bg-transparent"
              placeholder="Article title..."
            />
          </div>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}
