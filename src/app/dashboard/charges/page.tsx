import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatMXN, formatDate, CHARGE_STATUS_COLOR, CHARGE_STATUS_LABEL } from '@/lib/utils'
import { Plus, Layers, AlertTriangle, FileText } from 'lucide-react'

export default async function ChargesPage({ searchParams }: { searchParams: Promise<{ type?: string; unit?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const params = await searchParams
  const filterType = params.type ?? 'extra' // 'extra' = derramas+multas, 'all' = todos, 'maintenance' = mantenimiento

  // Catálogo de conceptos
  const { data: concepts } = await supabase.from('fee_concepts').select('*')
  const conceptMap = new Map((concepts ?? []).map(c => [c.id, c]))

  // Construir query de cargos
  let codesToFilter: string[] = []
  if (filterType === 'extra') codesToFilter = ['extraordinary', 'penalty']
  else if (filterType === 'maintenance') codesToFilter = ['maintenance']
  else if (filterType === 'cleaning') codesToFilter = ['cleaning']

  const conceptIds = codesToFilter.length > 0
    ? (concepts ?? []).filter(c => codesToFilter.includes(c.code)).map(c => c.id)
    : null

  let query = supabase
    .from('charges')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (conceptIds) query = query.in('concept_id', conceptIds)
  if (params.unit) query = query.eq('unit_id', params.unit)

  const { data: charges } = await query

  // Traer info de departamentos en bulk
  const unitIds = [...new Set((charges ?? []).map(c => c.unit_id))]
  const { data: units } = unitIds.length > 0
    ? await supabase.from('units').select('id, unit_number, floor').in('id', unitIds)
    : { data: [] }
  const unitsMap = new Map((units ?? []).map(u => [u.id, u]))

  // Totales
  const totalPending = (charges ?? []).filter(c => ['pending', 'partial'].includes(c.status))
    .reduce((s, c) => s + (Number(c.amount) - Number(c.paid_amount)), 0)
  const totalCharges = charges?.length ?? 0

  const TABS = [
    { id: 'extra',       label: 'Derramas y multas', icon: AlertTriangle },
    { id: 'maintenance', label: 'Mantenimiento',     icon: FileText },
    { id: 'cleaning',    label: 'Limpieza',          icon: Layers },
    { id: 'all',         label: 'Todos',             icon: Layers },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--navy)' }}>Cargos</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Derramas, multas y cargos del edificio
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/dashboard/charges/multa"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          >
            <AlertTriangle size={15} />
            Asignar multa
          </a>
          <a
            href="/dashboard/charges/derrama"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--blue-action)' }}
          >
            <Plus size={15} />
            Nueva derrama
          </a>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-xl border bg-white p-4" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Cargos mostrados</p>
          <p className="text-xl font-semibold mt-1" style={{ color: 'var(--navy)' }}>{totalCharges}</p>
        </div>
        <div className="rounded-xl border bg-white p-4" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Saldo pendiente</p>
          <p className="text-xl font-semibold mt-1 text-amber-600">{formatMXN(totalPending)}</p>
        </div>
      </div>

      {/* Tabs filtro */}
      <div className="flex gap-1 mb-4 border-b overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
        {TABS.map(tab => {
          const active = filterType === tab.id
          const Icon = tab.icon
          return (
            <a
              key={tab.id}
              href={`/dashboard/charges?type=${tab.id}`}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap"
              style={{
                color: active ? 'var(--blue-action)' : 'var(--text-secondary)',
                borderBottom: active ? '2px solid var(--blue-action)' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              <Icon size={13} />
              {tab.label}
            </a>
          )
        })}
      </div>

      {/* Lista de cargos */}
      <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        {charges && charges.length > 0 ? (
          <>
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-page)', borderBottom: `1px solid var(--border)` }}>
                    {['Tipo', 'Depto', 'Descripción', 'Monto', 'Vencimiento', 'Estado'].map(h => (
                      <th key={h} className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {charges.map((c, i) => {
                    const concept = conceptMap.get(c.concept_id)
                    const unit = unitsMap.get(c.unit_id)
                    return (
                      <tr key={c.id} style={{ borderTop: i > 0 ? `1px solid var(--border)` : undefined }}>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                            {concept?.name ?? '—'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-medium" style={{ color: 'var(--navy)' }}>
                          {unit?.unit_number ?? '—'}
                        </td>
                        <td className="px-5 py-3.5" style={{ color: 'var(--text-primary)' }}>
                          {c.description}
                        </td>
                        <td className="px-5 py-3.5 font-semibold" style={{ color: 'var(--navy)' }}>
                          {formatMXN(c.amount)}
                        </td>
                        <td className="px-5 py-3.5" style={{ color: 'var(--text-secondary)' }}>
                          {formatDate(c.due_date)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${CHARGE_STATUS_COLOR[c.status as keyof typeof CHARGE_STATUS_COLOR]}`}>
                            {CHARGE_STATUS_LABEL[c.status as keyof typeof CHARGE_STATUS_LABEL]}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Móvil */}
            <div className="sm:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
              {charges.map(c => {
                const concept = conceptMap.get(c.concept_id)
                const unit = unitsMap.get(c.unit_id)
                return (
                  <div key={c.id} className="px-4 py-3.5">
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{concept?.name}</p>
                        <p className="font-semibold text-sm" style={{ color: 'var(--navy)' }}>Depto {unit?.unit_number}</p>
                      </div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--navy)' }}>{formatMXN(c.amount)}</p>
                    </div>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-primary)' }}>{c.description}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Vence {formatDate(c.due_date)}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${CHARGE_STATUS_COLOR[c.status as keyof typeof CHARGE_STATUS_COLOR]}`}>
                        {CHARGE_STATUS_LABEL[c.status as keyof typeof CHARGE_STATUS_LABEL]}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText size={32} style={{ color: 'var(--text-secondary)', opacity: 0.3 }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              No hay cargos en esta categoría.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
