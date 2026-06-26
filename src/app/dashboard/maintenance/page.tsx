import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import {
  Plus, Wrench, AlertTriangle, CheckCircle, Clock,
  Droplets, Zap, ArrowUpDown, Building2, Shield, Sparkles, Volume2, HelpCircle, Settings,
} from 'lucide-react'

const CATEGORY_ICONS: Record<string, any> = {
  Droplets, Zap, ArrowUpDown, Building2, Shield, Sparkles, Volume2, HelpCircle,
}

const STATUS_INCIDENT: Record<string, { label: string; color: string; icon: any }> = {
  open:         { label: 'Abierto',     color: 'text-amber-700 bg-amber-50 border-amber-200',   icon: AlertTriangle },
  in_progress:  { label: 'En proceso',  color: 'text-blue-700 bg-blue-50 border-blue-200',      icon: Clock },
  resolved:     { label: 'Resuelto',    color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle },
  closed:       { label: 'Cerrado',     color: 'text-gray-500 bg-gray-100 border-gray-200',     icon: CheckCircle },
}

const STATUS_SYSTEM: Record<string, { label: string; color: string; dot: string }> = {
  operational:    { label: 'Operativo',          color: 'text-emerald-700', dot: 'bg-emerald-500' },
  scheduled:      { label: 'Mantenimiento programado', color: 'text-blue-700', dot: 'bg-blue-500' },
  in_service:     { label: 'En servicio',        color: 'text-amber-700',  dot: 'bg-amber-500' },
  out_of_service: { label: 'Fuera de servicio',  color: 'text-red-700',    dot: 'bg-red-500' },
}

export default async function MaintenancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  const { data: systems } = await supabase
    .from('maintenance_systems')
    .select('*')
    .eq('is_active', true)
    .order('display_order')

  let incidentsQuery = supabase
    .from('incidents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)
  if (!isAdmin) incidentsQuery = incidentsQuery.eq('reporter_id', user.id)
  const { data: incidents } = await incidentsQuery

  const { data: categories } = await supabase.from('incident_categories').select('*')
  const categoryMap = new Map((categories ?? []).map(c => [c.id, c]))

  const openCount = incidents?.filter(i => i.status === 'open').length ?? 0
  const inProgressCount = incidents?.filter(i => i.status === 'in_progress').length ?? 0

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--navy)' }}>
            Reportes
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {isAdmin
              ? `${openCount} abiertos · ${inProgressCount} en proceso`
              : 'Reporta incidencias y revisa el estado del edificio'}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <a
              href="/dashboard/maintenance/sistemas"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border hover:bg-gray-50 transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              <Settings size={15} />
              Editar tablero
            </a>
          )}
          <a
            href="/dashboard/maintenance/nuevo"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--blue-action)' }}
          >
            <Plus size={15} />
            Crear reporte
          </a>
        </div>
      </div>

      {/* TABLERO DEL EDIFICIO */}
      <div className="mb-8">
        <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--navy)' }}>
          Estado del edificio
        </h2>
        {systems && systems.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {systems.map(s => {
              const st = STATUS_SYSTEM[s.status] ?? STATUS_SYSTEM.operational
              return (
                <div key={s.id} className="rounded-xl border bg-white p-4" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${st.dot}`} />
                    <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {s.category}
                    </p>
                  </div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--navy)' }}>{s.name}</p>
                  <p className={`text-xs mt-1 font-medium ${st.color}`}>{st.label}</p>
                  {s.status_message && (
                    <p className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                      {s.status_message}
                    </p>
                  )}
                  {s.next_service && (
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                      Próximo: {formatDate(s.next_service)}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border bg-white p-8 text-center" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              No hay sistemas configurados aún.
            </p>
          </div>
        )}
      </div>

      {/* REPORTES */}
      <div>
        <h2 className="font-semibold text-sm mb-3" style={{ color: 'var(--navy)' }}>
          {isAdmin ? 'Reportes del edificio' : 'Mis reportes'}
        </h2>
        <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          {incidents && incidents.length > 0 ? (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {incidents.map(inc => {
                const cat = categoryMap.get(inc.category_id)
                const Icon = CATEGORY_ICONS[cat?.icon ?? ''] ?? Wrench
                const st = STATUS_INCIDENT[inc.status] ?? STATUS_INCIDENT.open
                const StatusIcon = st.icon
                return (
                  <a
                    key={inc.id}
                    href={`/dashboard/maintenance/${inc.id}`}
                    className="flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgba(37,99,235,0.08)' }}
                    >
                      <Icon size={16} style={{ color: 'var(--blue-action)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm" style={{ color: 'var(--navy)' }}>
                          {inc.title}
                        </p>
                        {inc.priority === 'high' && (
                          <span className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                            Prioridad alta
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {cat?.name} · {inc.location_detail ?? 'Sin ubicación específica'} · {formatDate(inc.created_at.slice(0, 10))}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border flex-shrink-0 ${st.color}`}>
                      <StatusIcon size={11} />
                      {st.label}
                    </span>
                  </a>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Wrench size={32} style={{ color: 'var(--text-secondary)', opacity: 0.3 }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {isAdmin ? 'No hay reportes activos.' : 'No has reportado incidencias aún.'}
              </p>
              <a href="/dashboard/maintenance/nuevo" className="text-sm font-medium" style={{ color: 'var(--blue-action)' }}>
                Crear el primer reporte →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
