'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Pin, Pencil, Trash2, X, Megaphone, FileText, Download, FolderOpen, Paperclip } from 'lucide-react'

// ============ TIPOS ============
interface Announcement {
  id: string; title: string; content: string; is_pinned: boolean; created_at: string
  attachment_url: string | null; attachment_name: string | null
}
interface Document {
  id: string; title: string; description: string | null; file_url: string
  file_name: string; file_size: number | null; category: string; created_at: string
}

const CAT_LABEL: Record<string, string> = {
  reglamento: 'Reglamento', convocatoria: 'Convocatoria',
  financiero: 'Financiero', formato: 'Formato', general: 'General',
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
}
function fmtSize(b: number | null) {
  if (!b) return ''
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1048576).toFixed(1) + ' MB'
}

export default function AvisosYDocumentosPage() {
  const supabase = createClient()
  const [isAdmin, setIsAdmin] = useState(false)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  // Aviso form
  const [showAvisoForm, setShowAvisoForm] = useState(false)
  const [editAvisoId, setEditAvisoId] = useState<string | null>(null)
  const [avisoTitle, setAvisoTitle] = useState('')
  const [avisoContent, setAvisoContent] = useState('')
  const [avisoPinned, setAvisoPinned] = useState(false)
  const [avisoFile, setAvisoFile] = useState<File | null>(null)
  const [avisoExistingAttachment, setAvisoExistingAttachment] = useState<{ url: string; name: string } | null>(null)
  const [savingAviso, setSavingAviso] = useState(false)
  const [uploadingAviso, setUploadingAviso] = useState(false)
  const [avisoError, setAvisoError] = useState('')
  const avisoFileRef = useRef<HTMLInputElement>(null)

  // Doc form
  const [showDocForm, setShowDocForm] = useState(false)
  const [docTitle, setDocTitle] = useState('')
  const [docDesc, setDocDesc] = useState('')
  const [docCat, setDocCat] = useState('general')
  const [docFile, setDocFile] = useState<File | null>(null)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [docError, setDocError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        setIsAdmin(profile?.role === 'admin')
      }
      await fetchAll()
    }
    load()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: a }, { data: d }] = await Promise.all([
      supabase.from('announcements').select('*').eq('published', true)
        .order('is_pinned', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('documents').select('*').eq('published', true)
        .order('category').order('created_at', { ascending: false }),
    ])
    setAnnouncements(a || [])
    setDocuments(d || [])
    setLoading(false)
  }

  // ============ AVISOS HANDLERS ============
  function openNewAviso() {
    setAvisoTitle(''); setAvisoContent(''); setAvisoPinned(false); setEditAvisoId(null)
    setAvisoFile(null); setAvisoExistingAttachment(null); setAvisoError(''); setShowAvisoForm(true)
  }
  function openEditAviso(a: Announcement) {
    setAvisoTitle(a.title); setAvisoContent(a.content); setAvisoPinned(a.is_pinned); setEditAvisoId(a.id)
    setAvisoFile(null)
    setAvisoExistingAttachment(a.attachment_url ? { url: a.attachment_url, name: a.attachment_name || 'Archivo' } : null)
    setAvisoError(''); setShowAvisoForm(true)
  }
  async function saveAviso() {
    if (!avisoTitle.trim() || !avisoContent.trim()) return
    setSavingAviso(true)
    setAvisoError('')

    let attachment_url = avisoExistingAttachment?.url ?? null
    let attachment_name = avisoExistingAttachment?.name ?? null

    if (avisoFile) {
      setUploadingAviso(true)
      const path = `avisos/${Date.now()}_${avisoFile.name.replace(/\s+/g, '_')}`
      const { error: upErr } = await supabase.storage.from('documents').upload(path, avisoFile)
      if (upErr) {
        setAvisoError('Error al subir el archivo: ' + upErr.message)
        setSavingAviso(false); setUploadingAviso(false)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
      attachment_url = publicUrl
      attachment_name = avisoFile.name
      setUploadingAviso(false)
    }

    const payload = {
      title: avisoTitle.trim(),
      content: avisoContent.trim(),
      is_pinned: avisoPinned,
      published: true,
      attachment_url,
      attachment_name,
    }
    if (editAvisoId) await supabase.from('announcements').update(payload).eq('id', editAvisoId)
    else await supabase.from('announcements').insert(payload)
    setShowAvisoForm(false); setSavingAviso(false); await fetchAll()
  }
  async function deleteAviso(id: string) {
    if (!confirm('¿Eliminar este aviso?')) return
    await supabase.from('announcements').delete().eq('id', id); await fetchAll()
  }
  async function togglePin(a: Announcement) {
    await supabase.from('announcements').update({ is_pinned: !a.is_pinned }).eq('id', a.id); await fetchAll()
  }

  // ============ DOCUMENTOS HANDLERS ============
  async function uploadDoc() {
    if (!docTitle.trim() || !docFile) { setDocError('Captura título y selecciona archivo.'); return }
    setUploadingDoc(true); setDocError('')
    const path = `${Date.now()}_${docFile.name.replace(/\s+/g, '_')}`
    const { error: upErr } = await supabase.storage.from('documents').upload(path, docFile)
    if (upErr) { setDocError('Error al subir: ' + upErr.message); setUploadingDoc(false); return }
    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
    await supabase.from('documents').insert({
      title: docTitle.trim(), description: docDesc.trim() || null, file_url: publicUrl,
      file_name: docFile.name, file_size: docFile.size, category: docCat, published: true,
    })
    setShowDocForm(false); setDocTitle(''); setDocDesc(''); setDocCat('general'); setDocFile(null)
    setUploadingDoc(false); await fetchAll()
  }
  async function deleteDoc(doc: Document) {
    if (!confirm(`¿Eliminar "${doc.title}"?`)) return
    await supabase.from('documents').delete().eq('id', doc.id); await fetchAll()
  }

  const grouped = documents.reduce((acc, d) => {
    if (!acc[d.category]) acc[d.category] = []
    acc[d.category].push(d)
    return acc
  }, {} as Record<string, Document[]>)

  if (loading) return <div className="text-center py-16 text-sm" style={{ color: 'var(--text-secondary)' }}>Cargando...</div>

  return (
    <div className="max-w-3xl">

      {/* =============== AVISOS =============== */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--navy)' }}>Avisos</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {isAdmin ? 'Comunicados para los residentes' : 'Comunicados de la administración'}
          </p>
        </div>
        {isAdmin && (
          <button onClick={openNewAviso}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: 'var(--blue-action)' }}>
            <Plus size={15} /> Nuevo aviso
          </button>
        )}
      </div>

      {/* Form aviso */}
      {showAvisoForm && isAdmin && (
        <div className="rounded-xl border-2 bg-white p-6 mb-6" style={{ borderColor: 'var(--blue-action)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: 'var(--navy)' }}>{editAvisoId ? 'Editar aviso' : 'Nuevo aviso'}</h2>
            <button onClick={() => setShowAvisoForm(false)} style={{ color: 'var(--text-secondary)' }}><X size={18} /></button>
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Título *</label>
              <input placeholder="ej. Mantenimiento en áreas comunes" value={avisoTitle} onChange={e => setAvisoTitle(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={{ borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Contenido *</label>
              <textarea placeholder="Escribe el comunicado..." value={avisoContent} onChange={e => setAvisoContent(e.target.value)}
                rows={4} className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none resize-none" style={{ borderColor: 'var(--border)' }} />
            </div>

            {/* Adjunto */}
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Adjuntar PDF o imagen (opcional)
              </label>
              <div onClick={() => avisoFileRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer"
                style={{
                  borderColor: avisoFile ? 'var(--blue-action)' : 'var(--border)',
                  backgroundColor: avisoFile ? 'rgba(37,99,235,0.04)' : 'var(--bg-page)',
                }}>
                {avisoFile ? (
                  <p className="text-sm font-medium" style={{ color: 'var(--blue-action)' }}>
                    {avisoFile.name} ({fmtSize(avisoFile.size)})
                  </p>
                ) : avisoExistingAttachment ? (
                  <p className="text-sm font-medium" style={{ color: 'var(--blue-action)' }}>
                    Ya tiene adjunto: {avisoExistingAttachment.name} — clic para reemplazar
                  </p>
                ) : (
                  <>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Haz clic para adjuntar un archivo</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>PDF, JPG o PNG</p>
                  </>
                )}
              </div>
              <input ref={avisoFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                onChange={e => setAvisoFile(e.target.files?.[0] || null)} />
              {avisoExistingAttachment && !avisoFile && (
                <button
                  type="button"
                  onClick={() => setAvisoExistingAttachment(null)}
                  className="text-xs mt-1.5"
                  style={{ color: '#EF4444' }}
                >
                  Quitar adjunto
                </button>
              )}
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={avisoPinned} onChange={e => setAvisoPinned(e.target.checked)} className="rounded" />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Fijar en la parte superior</span>
            </label>

            {avisoError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{avisoError}</p>}

            <div className="flex gap-3">
              <button onClick={() => setShowAvisoForm(false)} className="flex-1 py-2.5 rounded-lg border text-sm font-medium"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>Cancelar</button>
              <button onClick={saveAviso} disabled={savingAviso || uploadingAviso || !avisoTitle.trim() || !avisoContent.trim()}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--blue-action)' }}>
                {uploadingAviso ? 'Subiendo archivo...' : savingAviso ? 'Guardando...' : editAvisoId ? 'Guardar' : 'Publicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista avisos */}
      {announcements.length === 0 ? (
        <div className="rounded-xl border bg-white flex flex-col items-center justify-center py-12 gap-2 mb-10" style={{ borderColor: 'var(--border)' }}>
          <Megaphone size={28} style={{ color: 'var(--text-secondary)', opacity: 0.3 }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No hay avisos publicados.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 mb-10">
          {announcements.map(a => (
            <div key={a.id} className="rounded-xl border bg-white p-5"
              style={{ borderColor: a.is_pinned ? 'var(--blue-action)' : 'var(--border)', borderWidth: a.is_pinned ? 2 : 1 }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {a.is_pinned && (
                      <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: 'rgba(37,99,235,0.08)', color: 'var(--blue-action)' }}>
                        <Pin size={10} /> Fijado
                      </span>
                    )}
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{fmtDate(a.created_at)}</span>
                  </div>
                  <h3 className="font-semibold mb-2" style={{ color: 'var(--navy)' }}>{a.title}</h3>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{a.content}</p>
                  {a.attachment_url && (
                    <a
                      href={a.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-lg text-xs font-medium border"
                      style={{ borderColor: 'var(--blue-action)', color: 'var(--blue-action)' }}
                    >
                      <Paperclip size={12} />
                      {a.attachment_name || 'Ver archivo adjunto'}
                    </a>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => togglePin(a)} className="p-2 rounded-lg" style={{ color: a.is_pinned ? 'var(--blue-action)' : 'var(--text-secondary)' }}><Pin size={14} /></button>
                    <button onClick={() => openEditAviso(a)} className="p-2 rounded-lg" style={{ color: 'var(--text-secondary)' }}><Pencil size={14} /></button>
                    <button onClick={() => deleteAviso(a.id)} className="p-2 rounded-lg" style={{ color: 'var(--text-secondary)' }}><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =============== DOCUMENTOS =============== */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--navy)' }}>Documentos</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {isAdmin ? 'Sube documentos para la comunidad' : 'Documentos importantes de la comunidad'}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => { setShowDocForm(true); setDocError('') }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90"
            style={{ backgroundColor: 'var(--blue-action)' }}>
            <Plus size={15} /> Subir documento
          </button>
        )}
      </div>

      {/* Form documento */}
      {showDocForm && isAdmin && (
        <div className="rounded-xl border-2 bg-white p-6 mb-6" style={{ borderColor: 'var(--blue-action)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold" style={{ color: 'var(--navy)' }}>Subir documento</h2>
            <button onClick={() => setShowDocForm(false)} style={{ color: 'var(--text-secondary)' }}><X size={18} /></button>
          </div>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Título *</label>
                <input placeholder="ej. Reglamento interno" value={docTitle} onChange={e => setDocTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={{ borderColor: 'var(--border)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Categoría</label>
                <select value={docCat} onChange={e => setDocCat(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={{ borderColor: 'var(--border)' }}>
                  {Object.entries(CAT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Descripción</label>
              <input placeholder="Breve descripción..." value={docDesc} onChange={e => setDocDesc(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={{ borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Archivo *</label>
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-5 text-center cursor-pointer"
                style={{ borderColor: docFile ? 'var(--blue-action)' : 'var(--border)', backgroundColor: docFile ? 'rgba(37,99,235,0.04)' : 'var(--bg-page)' }}>
                {docFile
                  ? <p className="text-sm font-medium" style={{ color: 'var(--blue-action)' }}>{docFile.name} ({fmtSize(docFile.size)})</p>
                  : <>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Haz clic para seleccionar archivo</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>PDF, Word, Excel, imagen</p>
                    </>
                }
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" className="hidden"
                onChange={e => setDocFile(e.target.files?.[0] || null)} />
            </div>
            {docError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{docError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowDocForm(false)} className="flex-1 py-2.5 rounded-lg border text-sm font-medium"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>Cancelar</button>
              <button onClick={uploadDoc} disabled={uploadingDoc || !docTitle.trim() || !docFile}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--blue-action)' }}>{uploadingDoc ? 'Subiendo...' : 'Subir documento'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Lista documentos */}
      {documents.length === 0 ? (
        <div className="rounded-xl border bg-white flex flex-col items-center justify-center py-12 gap-2" style={{ borderColor: 'var(--border)' }}>
          <FolderOpen size={28} style={{ color: 'var(--text-secondary)', opacity: 0.3 }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No hay documentos publicados.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(grouped).map(([cat, docs]) => (
            <div key={cat}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--navy)' }}>{CAT_LABEL[cat] || cat}</h3>
              <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {docs.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between px-5 py-4 gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: 'rgba(37,99,235,0.08)' }}>
                          <FileText size={18} style={{ color: 'var(--blue-action)' }} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate" style={{ color: 'var(--navy)' }}>{doc.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                            {doc.description ? doc.description + ' · ' : ''}{fmtSize(doc.file_size)} · {fmtDate(doc.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border"
                          style={{ borderColor: 'var(--blue-action)', color: 'var(--blue-action)' }}>
                          <Download size={13} /> Descargar
                        </a>
                        {isAdmin && (
                          <button onClick={() => deleteDoc(doc)} className="p-2 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
