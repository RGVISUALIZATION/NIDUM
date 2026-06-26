import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDate, formatMXN } from '@/lib/utils'
import { CalendarDays, Plus, Clock, Users } from 'lucide-react'
import CancelReservation from './CancelReservation'

const STATUS_RESERVA: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pendiente de confirmar', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  confirmed: { label: 'Confirmada',              color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
}

export default async function ReservationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  const { data: areas } = await supabase
    .from('common_areas')
    .select('*')
    .eq('is_active', true)
    .order('name')

  // Reservas activas (pendientes y confirmadas) del día de hoy en adelante
  const today = new Date().toISOString().split('T')[0]
  const reservationsQuery = supabase
    .from('reservations')
    .select(`
      *,
      common_areas(name, slug),
      units(unit_number),
      profiles(full_name)
    `)
    .in('status', ['pending', 'confirmed'])
    .gte('reservation_date', today)
    .order('reservation_date')

  if (!isAdmin) {
    reservationsQuery.eq('profile_id', user.id)
  }

  const { data: reservations } = await reservationsQuery.limit(50)

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--navy)' }}>
            Áreas comunes
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {isAdmin ? 'Reservas activas del edificio' : 'Reserva el skybar o el salón de fiestas'}
          </p>
        </div>
        {!isAdmin && (
          <a
            href="/dashboard/reservations/nueva"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--blue-action)' }}
          >
            <Plus size={16} />
            Nueva reserva
          </a>
        )}
      </div>

      {/* Tarjetas de áreas */}
      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {areas?.map(area => (
          <div
            key={area.id}
            className="rounded-xl border bg-white p-5"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold" style={{ color: 'var(--navy)' }}>{area.name}</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Capacidad: {area.capacity} personas
                </p>
              </div>
              <span
                className="text-xs font-medium px-2 py-1 rounded-full"
                style={{ backgroundColor: 'rgba(37,99,235,0.08)', color: 'var(--blue-action)' }}
              >
                {area.open_time.slice(0,5)} – {area.close_time.slice(0,5)}
              </span>
            </div>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              {area.description}
            </p>
            <div
              className="text-xs rounded-lg p-3 mb-4"
              style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-secondary)' }}
            >
              {area.cleaning_fee_min_guests
                ? `Cuota de limpieza ${formatMXN(area.cleaning_fee)} para eventos de ${area.cleaning_fee_min_guests}+ personas`
                : `Cuota de limpieza ${formatMXN(area.cleaning_fee)} en todas las reservas`
              }
            </div>
            {!isAdmin && (
              <a
                href={`/dashboard/reservations/nueva?area=${area.id}`}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-sm font-medium border transition-colors hover:bg-gray-50"
                style={{ borderColor: 'var(--blue-action)', color: 'var(--blue-action)' }}
              >
                <CalendarDays size={15} />
                Reservar {area.name}
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Lista de reservas */}
      <div>
        <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--navy)' }}>
          {isAdmin ? 'Todas las reservas próximas' : 'Mis reservas'}
        </h2>

        <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          {reservations && reservations.length > 0 ? (
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {reservations.map(r => {
                const estado = STATUS_RESERVA[r.status] ?? STATUS_RESERVA.pending
                return (
                  <div key={r.id} className="px-5 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Fecha */}
                      <div
                        className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'rgba(37,99,235,0.08)' }}
                      >
                        <span className="text-xs font-medium" style={{ color: 'var(--blue-action)' }}>
                          {new Date(r.reservation_date + 'T00:00:00').toLocaleDateString('es-MX', { month: 'short' }).toUpperCase()}
                        </span>
                        <span className="text-lg font-bold leading-none" style={{ color: 'var(--navy)' }}>
                          {new Date(r.reservation_date + 'T00:00:00').getDate()}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm" style={{ color: 'var(--navy)' }}>
                            {r.common_areas?.name}
                          </p>
                          {isAdmin && (
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              · Depto {r.units?.unit_number}
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${estado.color}`}>
                            {estado.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <Clock size={11} />
                            {r.start_time.slice(0,5)} – {r.end_time.slice(0,5)}
                          </span>
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <Users size={11} />
                            {r.guest_count} personas
                          </span>
                          {r.event_type && (
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              · {r.event_type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {r.cleaning_fee_applied > 0 && (
                        <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                          {formatMXN(r.cleaning_fee_applied)} limpieza
                        </span>
                      )}
                      <CancelReservation
                        reservationId={r.id}
                        isAdmin={isAdmin}
                        isOwner={r.profile_id === user.id}
                        reservationDate={r.reservation_date}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <CalendarDays size={32} style={{ color: 'var(--text-secondary)', opacity: 0.3 }} />
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {isAdmin ? 'No hay reservas próximas.' : 'No tienes reservas próximas.'}
              </p>
              {!isAdmin && (
                <a href="/dashboard/reservations/nueva" className="text-sm font-medium" style={{ color: 'var(--blue-action)' }}>
                  Hacer una reserva →
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
