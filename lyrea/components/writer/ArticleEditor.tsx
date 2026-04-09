'use client'

import { useEffect, useState, useCallback } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Link from 'next/link'
import {
  ArrowLeft, Save, Check, Loader2,
  Bold, Italic, Heading2, Heading3,
  List, ListOrdered, Quote, Minus,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Article {
  id: string
  title: string
  content: string
  keyword?: string
  status: string
}

function markdownToHtml(md: string): string {
  const lines = md.split('\n')
  const result: string[] = []
  let inList = false

  for (const line of lines) {
    if (line.startsWith('### ')) {
      if (inList) { result.push('</ul>'); inList = false }
      result.push(`<h3>${line.slice(4)}</h3>`)
    } else if (line.startsWith('## ')) {
      if (inList) { result.push('</ul>'); inList = false }
      result.push(`<h2>${line.slice(3)}</h2>`)
    } else if (line.startsWith('# ')) {
      if (inList) { result.push('</ul>'); inList = false }
      result.push(`<h1>${line.slice(2)}</h1>`)
    } else if (line.startsWith('- ')) {
      if (!inList) { result.push('<ul>'); inList = true }
      result.push(`<li>${line.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')}</li>`)
    } else if (line.trim() === '') {
      if (inList) { result.push('</ul>'); inList = false }
    } else {
      if (inList) { result.push('</ul>'); inList = false }
      const formatted = line
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
      result.push(`<p>${formatted}</p>`)
    }
  }
  if (inList) result.push('</ul>')
  return result.join('')
}

function ToolbarButton({
  onClick, active, title, children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={title}
      className={cn(
        'p-1.5 rounded transition-colors',
        active
          ? 'bg-indigo-100 text-indigo-700'
          : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
      )}
    >
      {children}
    </button>
  )
}

function EditorToolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex items-center gap-0.5 px-4 py-1.5 border-b border-gray-100 bg-gray-50">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="Bold (Ctrl+B)"
      >
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="Italic (Ctrl+I)"
      >
        <Italic className="w-4 h-4" />
      </ToolbarButton>

      <div className="w-px h-4 bg-gray-200 mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        title="Heading 3"
      >
        <Heading3 className="w-4 h-4" />
      </ToolbarButton>

      <div className="w-px h-4 bg-gray-200 mx-1" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="Bullet list"
      >
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="Numbered list"
      >
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')}
        title="Blockquote"
      >
        <Quote className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Divider"
        active={false}
      >
        <Minus className="w-4 h-4" />
      </ToolbarButton>
    </div>
  )
}

export default function ArticleEditor({ article }: { article: Article }) {
  const [title, setTitle] = useState(article.title || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [wordCount, setWordCount] = useState(0)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing or generate an article...' }),
      CharacterCount,
    ],
    content: article.content ? markdownToHtml(article.content) : '',
    editorProps: {
      attributes: {
        class: 'prose prose-gray prose-headings:font-bold prose-h2:text-2xl prose-h3:text-xl max-w-none focus:outline-none min-h-[500px] px-8 py-6',
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
    await fetch(`/api/articles/${article.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content: editor.getHTML() }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [editor, title, article.id])

  useEffect(() => {
    const interval = setInterval(save, 30000)
    return () => clearInterval(interval)
  }, [save])

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
      {/* Top bar */}
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
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Save className="w-3.5 h-3.5" />}
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* Formatting toolbar */}
      {editor && <EditorToolbar editor={editor} />}

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
