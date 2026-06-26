'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Clock, AlertTriangle, X } from 'lucide-react'

const STATUS_OPTIONS = [
  { value: 'open',         label: 'Abierto',     icon: AlertTriangle, color: '#F59E0B' },
  { value: 'in_progress',  label: 'En proceso',  icon: Clock,         color: '#2563EB' },
  { value: 'resolved',     label: 'Resuelto',    icon: CheckCircle,   color: '#10B981' },
  { value: 'closed',       label: 'Cerrado',     icon: X,             color: '#6B7280' },
]

const PRIORITY_OPTIONS = [
  { value: 'low',    label: 'Baja',  color: '#10B981' },
  { value: 'medium', label: 'Media', color: '#F59E0B' },
  { value: 'high',   label: 'Alta',  color: '#EF4444' },
]

export default function IncidentStatusUpdate({ incident }: { incident: any }) {
  const router = useRouter()
  const supabase = createClient()
  const [status, setStatus] = useState(incident.status)
  const [priority, setPriority] = useState(incident.priority)
  const [adminNotes, setAdminNotes] = useState(incident.admin_notes ?? '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setLoading(true)
    setSaved(false)
    const { data: { user } } = await supabase.auth.getUser()

    const updates: any = {
      status,
      priority,
      admin_notes: adminNotes.trim() || null,
    }
    if (['resolved', 'closed'].includes(status)) {
      updates.resolved_by = user?.id
    }

    const { error } = await supabase.from('incidents').update(updates).eq('id', incident.id)
    if (!error) {
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 2500)
    }
    setLoading(false)
  }

  const changed =
    status !== incident.status ||
    priority !== incident.priority ||
    (adminNotes.trim() || null) !== (incident.admin_notes ?? null)

  return (
    <div className="rounded-xl border bg-white p-5" style={{ borderColor: 'var(--border)' }}>
      <p className="font-semibold text-sm mb-4" style={{ color: 'var(--navy)' }}>
        Gestionar reporte
      </p>

      {/* Estado */}
      <div className="mb-4">
        <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
          Estado
        </label>
        <div className="grid grid-cols-4 gap-2">
          {STATUS_OPTIONS.map(opt => {
            const Icon = opt.icon
            const active = status === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setStatus(opt.value)}
                className="flex flex-col items-center gap-1 py-2 rounded-lg border-2 text-xs font-medium transition-all"
                style={{
                  borderColor: active ? opt.color : 'var(--border)',
                  backgroundColor: active ? `${opt.color}15` : 'transparent',
                  color: active ? opt.color : 'var(--text-secondary)',
                }}
              >
                <Icon size={14} />
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Prioridad */}
      <div className="mb-4">
        <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
          Prioridad
        </label>
        <div className="flex gap-2">
          {PRIORITY_OPTIONS.map(opt => {
            const active = priority === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setPriority(opt.value)}
                className="flex-1 py-1.5 rounded-lg border-2 text-sm font-medium transition-all"
                style={{
                  borderColor: active ? opt.color : 'var(--border)',
                  backgroundColor: active ? `${opt.color}15` : 'transparent',
                  color: active ? opt.color : 'var(--text-secondary)',
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Nota interna / al residente */}
      <div className="mb-4">
        <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
          Nota para el reportante (visible para el vecino)
        </label>
        <textarea
          placeholder="ej. Ya se contactó al plomero, vendrá mañana entre 10 y 12."
          value={adminNotes}
          onChange={e => setAdminNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none resize-none"
          style={{ borderColor: 'var(--border)' }}
        />
      </div>

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle size={13} />
            Guardado
          </span>
        )}
        <button
          onClick={handleSave}
          disabled={loading || !changed}
          className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: 'var(--blue-action)' }}
        >
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
