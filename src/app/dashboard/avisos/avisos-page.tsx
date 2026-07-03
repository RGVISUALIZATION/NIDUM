'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pin, Pencil, Trash2, X, Megaphone } from 'lucide-react'

interface Announcement {
  id: string
  title: string
  content: string
  is_pinned: boolean
  published: boolean
  created_at: string
}

export default function AvisosPage() {
  const supabase = createClient()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isPinned, setIsPinned] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        setIsAdmin(profile?.role === 'admin')
      }
      await fetchAnnouncements()
    }
    load()
  }, [])

  async function fetchAnnouncements() {
    setLoading(true)
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .eq('published', true)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
    setAnnouncements(data || [])
    setLoading(false)
  }

  function openNew() {
    setTitle('')
    setContent('')
    setIsPinned(false)
    setEditId(null)
    setShowForm(true)
  }

  function openEdit(a: Announcement) {
    setTitle(a.title)
    setContent(a.content)
    setIsPinned(a.is_pinned)
    setEditId(a.id)
    setShowForm(true)
  }

  async function handleSave() {
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    const payload = { title: title.trim(), content: content.trim(), is_pinned: isPinned, published: true }

    if (editId) {
      await supabase.from('announcements').update(payload).eq('id', editId)
    } else {
      await supabase.from('announcements').insert(payload)
    }

    setShowForm(false)
    setSaving(false)
    await fetchAnnouncements()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este aviso?')) return
    await supabase.from('announcements').delete().eq('id', id)
    await fetchAnnouncements()
  }

  async function togglePin(a: Announcement) {
    await supabase.from('announcements').update({ is_pinned: !a.is_pinned }).eq('id', a.id)
    await fetchAnnouncements()
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--navy)' }}>Avisos</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {isAdmin ? 'Comunicados para los residentes del edificio' : 'Comunicados de la administración'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--blue-action)' }}
          >
            <Plus size={16} />
            Nuevo aviso
          </button>
        )}
      </div>

      {/* Formulario inline */}
      {showForm && isAdmin && (
        <div className="rounded-xl border-2 bg-white p-6 mb-6" style={{ borderColor: 'var(--blue-action)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: 'var(--navy)' }}>
              {editId ? 'Editar aviso' : 'Nuevo aviso'}
            </h2>
            <button onClick={() => setShowForm(false)} style={{ color: 'var(--text-secondary)' }}>
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Título *</label>
              <input
                placeholder="ej. Mantenimiento en áreas comunes"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                style={{ borderColor: 'var(--border)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Contenido *</label>
              <textarea
                placeholder="Escribe el comunicado completo..."
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={5}
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none resize-none"
                style={{ borderColor: 'var(--border)' }}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={e => setIsPinned(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Fijar aviso en la parte superior</span>
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-lg border text-sm font-medium"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !title.trim() || !content.trim()}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                style={{ backgroundColor: 'var(--blue-action)' }}
              >
                {saving ? 'Guardando...' : editId ? 'Guardar cambios' : 'Publicar aviso'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de avisos */}
      {loading ? (
        <div className="text-center py-16 text-sm" style={{ color: 'var(--text-secondary)' }}>Cargando avisos...</div>
      ) : announcements.length === 0 ? (
        <div className="rounded-xl border bg-white flex flex-col items-center justify-center py-16 gap-3" style={{ borderColor: 'var(--border)' }}>
          <Megaphone size={32} style={{ color: 'var(--text-secondary)', opacity: 0.3 }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No hay avisos publicados.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {announcements.map(a => (
            <div
              key={a.id}
              className="rounded-xl border bg-white p-5"
              style={{ borderColor: a.is_pinned ? 'var(--blue-action)' : 'var(--border)', borderWidth: a.is_pinned ? 2 : 1 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {a.is_pinned && (
                      <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(37,99,235,0.08)', color: 'var(--blue-action)' }}>
                        <Pin size={10} />
                        Fijado
                      </span>
                    )}
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(a.created_at)}
                    </span>
                  </div>
                  <h3 className="font-semibold mb-2" style={{ color: 'var(--navy)' }}>{a.title}</h3>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{a.content}</p>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => togglePin(a)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: a.is_pinned ? 'var(--blue-action)' : 'var(--text-secondary)' }}
                      title={a.is_pinned ? 'Desfijar' : 'Fijar'}
                    >
                      <Pin size={14} />
                    </button>
                    <button
                      onClick={() => openEdit(a)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="p-2 rounded-lg transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
