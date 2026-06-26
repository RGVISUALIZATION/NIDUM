import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { ChevronLeft, AlertTriangle, CheckCircle, Clock, MapPin, Calendar, User } from 'lucide-react'
import IncidentStatusUpdate from './IncidentStatusUpdate'

const STATUS: Record<string, { label: string; color: string; icon: any }> = {
  open:         { label: 'Abierto',     color: 'text-amber-700 bg-amber-50 border-amber-200',   icon: AlertTriangle },
  in_progress:  { label: 'En proceso',  color: 'text-blue-700 bg-blue-50 border-blue-200',      icon: Clock },
  resolved:     { label: 'Resuelto',    color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle },
  closed:       { label: 'Cerrado',     color: 'text-gray-500 bg-gray-100 border-gray-200',     icon: CheckCircle },
}

const LOCATION_LABELS: Record<string, string> = {
  unit: 'Departamento',
  common_area: 'Área común',
  hallway: 'Pasillo',
  parking: 'Estacionamiento',
  outside: 'Fachada / exterior',
  other: 'Otro',
}

const PRIORITY: Record<string, { label: string; color: string }> = {
  low:    { label: 'Baja',  color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  medium: { label: 'Media', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  high:   { label: 'Alta',  color: 'text-red-700 bg-red-50 border-red-200' },
}

export default async function IncidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  const { data: incident } = await supabase.from('incidents').select('*').eq('id', id).single()
  if (!incident) notFound()

  // Info adicional: categoría, reportante, unidad
  const [{ data: category }, { data: reporter }, { data: unit }] = await Promise.all([
    supabase.from('incident_categories').select('name, icon').eq('id', incident.category_id).single(),
    supabase.from('profiles').select('full_name').eq('id', incident.reporter_id).single(),
    incident.unit_id
      ? supabase.from('units').select('unit_number, floor').eq('id', incident.unit_id).single()
      : Promise.resolve({ data: null }),
  ])

  const st = STATUS[incident.status] ?? STATUS.open
  const StatusIcon = st.icon
  const pr = PRIORITY[incident.priority] ?? PRIORITY.medium

  return (
    <div className="max-w-2xl">
      <a
        href="/dashboard/maintenance"
        className="inline-flex items-center gap-1 text-sm font-medium mb-6"
        style={{ color: 'var(--text-secondary)' }}
      >
        <ChevronLeft size={16} />
        Volver a mantenimiento
      </a>

      {/* Encabezado */}
      <div className="rounded-xl border bg-white p-6 mb-4" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              {category?.name}
            </p>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--navy)' }}>
              {incident.title}
            </h1>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${st.color}`}>
              <StatusIcon size={11} />
              {st.label}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${pr.color}`}>
              Prioridad {pr.label}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm border-t pt-4" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <MapPin size={14} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ color: 'var(--text-primary)' }}>
              {LOCATION_LABELS[incident.location_type]}
              {incident.location_detail && ` · ${incident.location_detail}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={14} style={{ color: 'var(--text-secondary)' }} />
            <span style={{ color: 'var(--text-primary)' }}>
              {formatDate(incident.created_at.slice(0, 10))}
            </span>
          </div>
          {isAdmin && reporter && (
            <div className="flex items-center gap-2">
              <User size={14} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ color: 'var(--text-primary)' }}>
                {reporter.full_name}
                {unit && ` · Depto ${unit.unit_number}`}
              </span>
            </div>
          )}
        </div>

        {incident.description && (
          <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
              {incident.description}
            </p>
          </div>
        )}

        {incident.photo_url && (
          <div className="mt-4">
            <a href={incident.photo_url} target="_blank" rel="noopener noreferrer">
              <img
                src={incident.photo_url}
                alt="Foto del reporte"
                className="rounded-lg border w-full max-h-80 object-cover cursor-zoom-in"
                style={{ borderColor: 'var(--border)' }}
              />
            </a>
          </div>
        )}
      </div>

      {/* Notas de la administración (visible al reportante) */}
      {incident.admin_notes && (
        <div
          className="rounded-xl border-2 p-5 mb-4"
          style={{ borderColor: 'var(--blue-action)', backgroundColor: 'rgba(37,99,235,0.04)' }}
        >
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--blue-action)' }}>
            Nota de la administración
          </p>
          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
            {incident.admin_notes}
          </p>
          {incident.resolved_at && (
            <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
              Atendido el {formatDate(incident.resolved_at.slice(0, 10))}
            </p>
          )}
        </div>
      )}

      {/* Panel admin: cambiar estado y agregar notas */}
      {isAdmin && (
        <IncidentStatusUpdate incident={incident} />
      )}
    </div>
  )
}
