'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Save, Pencil, X } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const STATUS_OPTIONS = [
  { value: 'operational',     label: 'Operativo',                color: 'bg-emerald-500', text: 'text-emerald-700' },
  { value: 'scheduled',       label: 'Mantenimiento programado', color: 'bg-blue-500',    text: 'text-blue-700' },
  { value: 'in_service',      label: 'En servicio',              color: 'bg-amber-500',   text: 'text-amber-700' },
  { value: 'out_of_service',  label: 'Fuera de servicio',        color: 'bg-red-500',     text: 'text-red-700' },
]

interface System {
  id: string
  name: string
  category: string | null
  description: string | null
  status: string
  status_message: string | null
  next_service: string | null
  last_serviced: string | null
  display_order: number
  is_active: boolean
}

export default function SystemsManager({ initial }: { initial: System[] }) {
  const router = useRouter()
  const supabase = createClient()
  const [systems, setSystems] = useState<System[]>(initial)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Partial<System>>({})
  const [showNew, setShowNew] = useState(false)
  const [newDraft, setNewDraft] = useState<Partial<System>>({
    name: '', category: '', status: 'operational', display_order: systems.length + 1,
  })

  function startEdit(s: System) {
    setEditingId(s.id)
    setDraft(s)
  }

  async function saveEdit() {
    if (!editingId) return
    await supabase.from('maintenance_systems').update({
      name: draft.name,
      category: draft.category || null,
      description: draft.description || null,
      status: draft.status,
      status_message: draft.status_message || null,
      next_service: draft.next_service || null,
      last_serviced: draft.last_serviced || null,
    }).eq('id', editingId)
    setEditingId(null)
    router.refresh()
    const { data } = await supabase.from('maintenance_systems').select('*').order('display_order')
    if (data) setSystems(data as System[])
  }

  async function deleteSystem(id: string) {
    if (!confirm('¿Eliminar este sistema del tablero?')) return
    await supabase.from('maintenance_systems').delete().eq('id', id)
    setSystems(systems.filter(s => s.id !== id))
    router.refresh()
  }

  async function createSystem() {
    if (!newDraft.name?.trim()) return
    const { data, error } = await supabase.from('maintenance_systems').insert({
      name: newDraft.name!.trim(),
      category: newDraft.category?.trim() || null,
      description: newDraft.description?.trim() || null,
      status: newDraft.status ?? 'operational',
      status_message: newDraft.status_message?.trim() || null,
      next_service: newDraft.next_service || null,
      display_order: systems.length + 1,
      is_active: true,
    }).select('*').single()
    if (data && !error) {
      setSystems([...systems, data as System])
      setShowNew(false)
      setNewDraft({ name: '', category: '', status: 'operational' })
      router.refresh()
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {systems.map(s => {
        const isEditing = editingId === s.id
        const statusOpt = STATUS_OPTIONS.find(o => o.value === s.status)

        if (isEditing) {
          return (
            <div key={s.id} className="rounded-xl border-2 bg-white p-5" style={{ borderColor: 'var(--blue-action)' }}>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  placeholder="Nombre"
                  value={draft.name ?? ''}
                  onChange={e => setDraft({ ...draft, name: e.target.value })}
                  className="px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ borderColor: 'var(--border)' }}
                />
                <input
                  placeholder="Categoría (ej. Elevadores)"
                  value={draft.category ?? ''}
                  onChange={e => setDraft({ ...draft, category: e.target.value })}
                  className="px-3 py-2 rounded-lg border text-sm outline-none"
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>
              <select
                value={draft.status ?? 'operational'}
                onChange={e => setDraft({ ...draft, status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none mb-3"
                style={{ borderColor: 'var(--border)' }}
              >
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input
                placeholder="Mensaje (ej. Mantenimiento mensual el día 15)"
                value={draft.status_message ?? ''}
                onChange={e => setDraft({ ...draft, status_message: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none mb-3"
                style={{ borderColor: 'var(--border)' }}
              />
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Último servicio</label>
                  <input
                    type="date"
                    value={draft.last_serviced ?? ''}
                    onChange={e => setDraft({ ...draft, last_serviced: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ borderColor: 'var(--border)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Próximo servicio</label>
                  <input
                    type="date"
                    value={draft.next_service ?? ''}
                    onChange={e => setDraft({ ...draft, next_service: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ borderColor: 'var(--border)' }}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditingId(null)}
                  className="px-3 py-1.5 rounded-lg border text-sm font-medium"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={saveEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: 'var(--blue-action)' }}
                >
                  <Save size={13} />
                  Guardar
                </button>
              </div>
            </div>
          )
        }

        return (
          <div key={s.id} className="rounded-xl border bg-white p-4 flex items-center justify-between gap-3" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-2.5 h-2.5 rounded-full ${statusOpt?.color} flex-shrink-0`} />
              <div className="min-w-0">
                <p className="font-semibold text-sm" style={{ color: 'var(--navy)' }}>{s.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {s.category} · <span className={statusOpt?.text}>{statusOpt?.label}</span>
                  {s.next_service && ` · Próximo ${formatDate(s.next_service)}`}
                </p>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={() => startEdit(s)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-page)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => deleteSystem(s.id)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FEE2E2'; e.currentTarget.style.color = '#EF4444' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        )
      })}

      {showNew ? (
        <div className="rounded-xl border-2 bg-white p-5" style={{ borderColor: 'var(--blue-action)' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-sm" style={{ color: 'var(--navy)' }}>Nuevo sistema</p>
            <button onClick={() => setShowNew(false)} style={{ color: 'var(--text-secondary)' }}><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              placeholder="Nombre (ej. Caldera)"
              value={newDraft.name ?? ''}
              onChange={e => setNewDraft({ ...newDraft, name: e.target.value })}
              className="px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
            <input
              placeholder="Categoría"
              value={newDraft.category ?? ''}
              onChange={e => setNewDraft({ ...newDraft, category: e.target.value })}
              className="px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
          <select
            value={newDraft.status ?? 'operational'}
            onChange={e => setNewDraft({ ...newDraft, status: e.target.value })}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none mb-3"
            style={{ borderColor: 'var(--border)' }}
          >
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button
            onClick={createSystem}
            className="w-full py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--blue-action)' }}
          >
            Agregar al tablero
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed text-sm font-medium transition-colors"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          <Plus size={16} />
          Agregar otro sistema
        </button>
      )}
    </div>
  )
}
