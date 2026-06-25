import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatMXN } from '@/lib/utils'
import { Building2, Plus } from 'lucide-react'
import UnitActions from './UnitActions'

export default async function UnitsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: units } = await supabase
    .from('units')
    .select(`
      *,
      unit_residents(
        profile_id,
        role,
        is_primary,
        end_date,
        profiles(full_name, phone)
      )
    `)
    .order('unit_number')

  const activeResidents = (unit: any) =>
    unit.unit_residents?.filter((r: any) => !r.end_date) ?? []

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--navy)' }}>
            Departamentos
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {units?.filter(u => u.status === 'active').length ?? 0} activos · {units?.length ?? 0} total
          </p>
        </div>
        <a
          href="/dashboard/units/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--blue-action)' }}
        >
          <Plus size={16} />
          Agregar depto
        </a>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        {/* Tabla desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-page)', borderBottom: `1px solid var(--border)` }}>
                <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Depto</th>
                <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Piso</th>
                <th className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Residente(s)</th>
                <th className="text-right px-5 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Cuota mensual</th>
                <th className="text-center px-5 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Estado</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {units?.map((unit, i) => {
                const residents = activeResidents(unit)
                const primary = residents.find((r: any) => r.is_primary) ?? residents[0]
                return (
                  <tr
                    key={unit.id}
                    className="transition-colors"
                    style={{ borderTop: i > 0 ? `1px solid var(--border)` : undefined }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-page)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold" style={{ backgroundColor: 'rgba(37,99,235,0.08)', color: 'var(--blue-action)' }}>
                          {unit.unit_number}
                        </div>
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{unit.unit_number}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5" style={{ color: 'var(--text-secondary)' }}>{unit.floor ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      {primary ? (
                        <div>
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{primary.profiles.full_name}</p>
                          <p className="text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>{primary.role === 'owner' ? 'Propietario' : 'Inquilino'}</p>
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Sin residente</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold" style={{ color: 'var(--navy)' }}>
                      {formatMXN(unit.monthly_fee)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${unit.status === 'active' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-gray-500 bg-gray-100 border-gray-200'}`}>
                        {unit.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <UnitActions unitId={unit.id} unitNumber={unit.unit_number} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Lista móvil */}
        <div className="sm:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
          {units?.map(unit => {
            const residents = activeResidents(unit)
            const primary = residents.find((r: any) => r.is_primary) ?? residents[0]
            return (
              <div key={unit.id} className="px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: 'rgba(37,99,235,0.08)', color: 'var(--blue-action)' }}>
                      {unit.unit_number}
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--navy)' }}>Depto {unit.unit_number}</p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Piso {unit.floor ?? '—'}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--navy)' }}>{formatMXN(unit.monthly_fee)}</p>
                </div>
                {primary && (
                  <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                    {primary.profiles.full_name} · {primary.role === 'owner' ? 'Propietario' : 'Inquilino'}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {(!units || units.length === 0) && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Building2 size={32} style={{ color: 'var(--text-secondary)', opacity: 0.3 }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              No hay departamentos registrados aún.
            </p>
            <a
              href="/dashboard/units/new"
              className="text-sm font-medium"
              style={{ color: 'var(--blue-action)' }}
            >
              Agregar el primero →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
