import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatMXN, formatDate, PERIOD_STATUS_LABEL } from '@/lib/utils'
import { Plus, Zap, FileText } from 'lucide-react'
import PeriodActions from './PeriodActions'

const PERIOD_STATUS_COLOR: Record<string, string> = {
  draft:  'text-gray-600 bg-gray-100 border-gray-200',
  open:   'text-emerald-700 bg-emerald-50 border-emerald-200',
  closed: 'text-blue-700 bg-blue-50 border-blue-200',
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default async function PeriodsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: periods } = await supabase
    .from('billing_periods')
    .select('*')
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })

  const openPeriod = periods?.find(p => p.status === 'open')
  let summary = null

  if (openPeriod) {
    const { data: charges } = await supabase
      .from('charges')
      .select('status, amount, paid_amount')
      .eq('billing_period_id', openPeriod.id)
      .neq('status', 'cancelled')

    if (charges) {
      const total = charges.reduce((s, c) => s + Number(c.amount), 0)
      const collected = charges.filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.paid_amount), 0)
      const pending = charges.filter(c => ['pending', 'partial'].includes(c.status)).length
      const paid = charges.filter(c => c.status === 'paid').length
      summary = { total, collected, pending, paid, count: charges.length }
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--navy)' }}>Periodos de facturación</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Abre el mes, genera los cargos automáticamente y da seguimiento a la cobranza
          </p>
        </div>
        <a
          href="/dashboard/periods/nueva"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: 'var(--blue-action)' }}
        >
          <Plus size={16} />
          Nuevo periodo
        </a>
      </div>

      {openPeriod && summary && (
        <div className="rounded-xl border-2 bg-white p-6 mb-6" style={{ borderColor: 'var(--blue-action)' }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                Periodo activo
              </span>
              <h2 className="text-xl font-semibold mt-1" style={{ color: 'var(--navy)' }}>
                {MESES[openPeriod.period_month - 1]} {openPeriod.period_year}
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Vence {formatDate(openPeriod.due_date)} · {summary.count} departamentos
              </p>
            </div>
            <PeriodActions period={openPeriod} compact={false} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total a cobrar', value: formatMXN(summary.total), color: 'var(--navy)' },
              { label: 'Cobrado', value: formatMXN(summary.collected), color: '#10B981' },
              { label: 'Pagados', value: `${summary.paid} deptos`, color: 'var(--navy)' },
              { label: 'Pendientes', value: `${summary.pending} deptos`, color: '#F59E0B' },
            ].map(item => (
              <div key={item.label} className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-page)' }}>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.label}</p>
                <p className="text-lg font-semibold mt-0.5" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              <span>Avance de cobranza</span>
              <span>{summary.count > 0 ? Math.round((summary.paid / summary.count) * 100) : 0}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${summary.count > 0 ? (summary.paid / summary.count) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        {periods && periods.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-page)', borderBottom: `1px solid var(--border)` }}>
                {['Periodo', 'Vencimiento', 'Cargos', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((p, i) => (
                <tr
                  key={p.id}
                  className="hover:bg-gray-50 transition-colors"
                  style={{ borderTop: i > 0 ? `1px solid var(--border)` : undefined }}
                >
                  <td className="px-5 py-3.5 font-semibold" style={{ color: 'var(--navy)' }}>
                    {MESES[p.period_month - 1]} {p.period_year}
                  </td>
                  <td className="px-5 py-3.5" style={{ color: 'var(--text-secondary)' }}>
                    {formatDate(p.due_date)}
                  </td>
                  <td className="px-5 py-3.5">
                    {p.generated_at ? (
                      <span className="flex items-center gap-1.5 text-sm text-emerald-700">
                        <Zap size={13} />Generados
                      </span>
                    ) : (
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Pendiente</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${PERIOD_STATUS_COLOR[p.status]}`}>
                      {PERIOD_STATUS_LABEL[p.status as keyof typeof PERIOD_STATUS_LABEL]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <PeriodActions period={p} compact={true} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <FileText size={32} style={{ color: 'var(--text-secondary)', opacity: 0.3 }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No hay periodos creados aún.</p>
            <a href="/dashboard/periods/nueva" className="text-sm font-medium" style={{ color: 'var(--blue-action)' }}>
              Crear el primer periodo →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
