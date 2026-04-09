'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Image from '@tiptap/extension-image'
import Link from 'next/link'
import {
  ArrowLeft, Save, Check, Loader2,
  Bold, Italic, Heading2, Heading3,
  List, ListOrdered, Quote, Minus,
  Copy, Globe, FileText, RefreshCw, Send, X, ImageIcon, Sparkles,
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

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<ul>(.*?)<\/ul>/gis, '$1\n')
    .replace(/<ol>(.*?)<\/ol>/gis, '$1\n')
    .replace(/<blockquote>(.*?)<\/blockquote>/gis, '> $1\n\n')
    .replace(/<hr\s*\/?>/gi, '---\n\n')
    .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const TONES = ['Professional', 'Casual', 'Authoritative', 'Friendly', 'Technical']
const LENGTHS = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
]

export default function ArticleEditor({ article }: { article: Article }) {
  const [title, setTitle] = useState(article.title || '')
  const [status, setStatus] = useState(article.status || 'draft')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [wordCount, setWordCount] = useState(0)

  // Regenerate state
  const [showRegenMenu, setShowRegenMenu] = useState(false)
  const [regenTone, setRegenTone] = useState('Professional')
  const [regenLength, setRegenLength] = useState('medium')
  const [regenerating, setRegenerating] = useState(false)
  const regenRef = useRef<HTMLDivElement>(null)

  // Image generation state
  const [showImagePanel, setShowImagePanel] = useState(false)
  const [imageStyle, setImageStyle] = useState('professional, clean, photorealistic, editorial photography')
  const [generatingImage, setGeneratingImage] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<{ url: string; prompt: string } | null>(null)
  const [imageError, setImageError] = useState('')

  // WordPress publish state
  const [showWpModal, setShowWpModal] = useState(false)
  const [wpForm, setWpForm] = useState({ siteUrl: '', username: '', appPassword: '', wpStatus: 'draft' })
  const [wpPublishing, setWpPublishing] = useState(false)
  const [wpResult, setWpResult] = useState<{ link: string } | null>(null)
  const [wpError, setWpError] = useState('')

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing or generate an article...' }),
      CharacterCount,
      Image.configure({ inline: false, allowBase64: false }),
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
      body: JSON.stringify({ title, content: editor.getHTML(), status }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [editor, title, status, article.id])

  async function toggleStatus() {
    const next = status === 'published' ? 'draft' : 'published'
    setStatus(next)
    await fetch(`/api/articles/${article.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next }),
    })
  }

  function copyAsMarkdown() {
    if (!editor) return
    const md = `# ${title}\n\n${htmlToMarkdown(editor.getHTML())}`
    navigator.clipboard.writeText(md)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRegenerate() {
    if (!editor || !article.keyword) return
    setRegenerating(true)
    setShowRegenMenu(false)

    try {
      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          keyword: article.keyword,
          tone: regenTone,
          length: regenLength,
        }),
      })

      if (!genRes.ok) throw new Error('Generation failed')

      const reader = genRes.body!.getReader()
      const decoder = new TextDecoder()
      let content = ''

      editor.commands.clearContent()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        content += decoder.decode(value, { stream: true })
        editor.commands.setContent(markdownToHtml(content))
      }

      await fetch(`/api/articles/${article.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
    } catch (_) { /* noop */ }

    setRegenerating(false)
  }

  async function handleWpPublish(e: React.FormEvent) {
    e.preventDefault()
    if (!editor) return
    setWpPublishing(true)
    setWpError('')
    setWpResult(null)

    try {
      const res = await fetch('/api/wordpress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteUrl: wpForm.siteUrl,
          username: wpForm.username,
          appPassword: wpForm.appPassword,
          title,
          content: editor.getHTML(),
          status: wpForm.wpStatus,
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(err)
      }

      const data = await res.json()
      setWpResult(data)
    } catch (err) {
      setWpError(err instanceof Error ? err.message : 'Publish failed')
    }

    setWpPublishing(false)
  }

  async function handleGenerateImage() {
    setGeneratingImage(true)
    setImageError('')
    setGeneratedImage(null)

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: article.keyword, title, style: imageStyle }),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(err)
      }

      const data = await res.json()
      setGeneratedImage(data)
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Image generation failed')
    }

    setGeneratingImage(false)
  }

  function insertImageIntoArticle() {
    if (!editor || !generatedImage) return
    editor.chain().focus().setImage({ src: generatedImage.url, alt: title || article.keyword || '' }).run()
    setShowImagePanel(false)
    setGeneratedImage(null)
  }

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

  // Close regen menu on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (regenRef.current && !regenRef.current.contains(e.target as Node)) {
        setShowRegenMenu(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

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

        <div className="flex items-center gap-2">
          {article.keyword && (
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full font-medium">
              {article.keyword}
            </span>
          )}

          {/* Regenerate */}
          {article.keyword && (
            <div className="relative" ref={regenRef}>
              <button
                onClick={() => setShowRegenMenu(v => !v)}
                disabled={regenerating}
                title="Regenerate article"
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {regenerating
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <RefreshCw className="w-3.5 h-3.5" />}
                {regenerating ? 'Generating...' : 'Regenerate'}
              </button>

              {showRegenMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-10">
                  <p className="text-xs font-semibold text-gray-700 mb-3">Regenerate with new settings</p>

                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1.5">Tone</p>
                    <div className="flex flex-wrap gap-1">
                      {TONES.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setRegenTone(t)}
                          className={cn(
                            'px-2 py-1 rounded text-xs font-medium border transition-colors',
                            regenTone === t
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1.5">Length</p>
                    <div className="flex gap-1">
                      {LENGTHS.map(l => (
                        <button
                          key={l.value}
                          type="button"
                          onClick={() => setRegenLength(l.value)}
                          className={cn(
                            'flex-1 px-2 py-1 rounded text-xs font-medium border transition-colors',
                            regenLength === l.value
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                          )}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleRegenerate}
                    className="w-full bg-indigo-600 text-white text-xs font-medium py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Regenerate now
                  </button>
                  <p className="text-xs text-gray-400 mt-2 text-center">This will replace the current content</p>
                </div>
              )}
            </div>
          )}

          {/* Generate image */}
          <button
            onClick={() => { setShowImagePanel(v => !v); setGeneratedImage(null); setImageError('') }}
            title="Generate AI image"
            className={cn(
              'flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors',
              showImagePanel
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            )}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            AI Image
          </button>

          {/* WordPress publish */}
          <button
            onClick={() => { setShowWpModal(true); setWpResult(null); setWpError('') }}
            title="Publish to WordPress"
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            To WordPress
          </button>

          <button
            onClick={copyAsMarkdown}
            title="Copy as Markdown"
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy MD'}
          </button>

          <button
            onClick={toggleStatus}
            className={cn(
              'flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-colors font-medium',
              status === 'published'
                ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            )}
          >
            {status === 'published'
              ? <><Globe className="w-3.5 h-3.5" /> Published</>
              : <><FileText className="w-3.5 h-3.5" /> Draft</>
            }
          </button>

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

      {/* AI Image panel */}
      {showImagePanel && (
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <p className="text-sm font-semibold text-gray-800">Generate AI image with Flux Schnell</p>
            </div>

            <div className="flex gap-3 mb-3">
              <input
                value={imageStyle}
                onChange={e => setImageStyle(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                placeholder="Style: photorealistic, illustration, flat design..."
              />
              <button
                onClick={handleGenerateImage}
                disabled={generatingImage}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {generatingImage
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                  : <><Sparkles className="w-4 h-4" /> Generate</>
                }
              </button>
            </div>

            {imageError && (
              <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3">{imageError}</p>
            )}

            {generatedImage && (
              <div className="flex gap-4 items-start">
                <img
                  src={generatedImage.url}
                  alt="Generated"
                  className="rounded-lg border border-gray-200 max-h-48 object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-3 italic">&ldquo;{generatedImage.prompt}&rdquo;</p>
                  <div className="flex gap-2">
                    <button
                      onClick={insertImageIntoArticle}
                      className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" /> Insert into article
                    </button>
                    <button
                      onClick={handleGenerateImage}
                      disabled={generatingImage}
                      className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                    </button>
                    <a
                      href={generatedImage.url}
                      download="generated-image.webp"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-100 transition-colors"
                    >
                      Download
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* WordPress Modal */}
      {showWpModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Publish to WordPress</h2>
              <button onClick={() => setShowWpModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {wpResult ? (
              <div className="text-center py-4">
                <Check className="w-10 h-10 text-green-500 mx-auto mb-3" />
                <p className="font-semibold text-gray-900 mb-1">Published!</p>
                <a
                  href={wpResult.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 hover:underline break-all"
                >
                  {wpResult.link}
                </a>
                <button
                  onClick={() => setShowWpModal(false)}
                  className="mt-4 w-full bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleWpPublish} className="space-y-4">
                <p className="text-xs text-gray-500">
                  Use a WordPress <strong>Application Password</strong> — create one in{' '}
                  <em>Users → Profile → Application Passwords</em>.
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">WordPress site URL</label>
                  <input
                    value={wpForm.siteUrl}
                    onChange={e => setWpForm(p => ({ ...p, siteUrl: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://myblog.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    value={wpForm.username}
                    onChange={e => setWpForm(p => ({ ...p, username: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="admin"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Application Password</label>
                  <input
                    type="password"
                    value={wpForm.appPassword}
                    onChange={e => setWpForm(p => ({ ...p, appPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Publish as</label>
                  <div className="flex gap-2">
                    {[{ v: 'draft', l: 'Draft' }, { v: 'publish', l: 'Published' }].map(opt => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => setWpForm(p => ({ ...p, wpStatus: opt.v }))}
                        className={cn(
                          'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                          wpForm.wpStatus === opt.v
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                        )}
                      >
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>

                {wpError && (
                  <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{wpError}</p>
                )}

                <button
                  type="submit"
                  disabled={wpPublishing}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {wpPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {wpPublishing ? 'Publishing...' : 'Publish to WordPress'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
