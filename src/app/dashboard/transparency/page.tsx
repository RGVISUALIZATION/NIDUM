import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatMXN, formatDate } from '@/lib/utils'
import { TrendingUp, TrendingDown, ScrollText, Info } from 'lucide-react'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default async function TransparencyPage({ searchParams }: { searchParams: Promise<{ year?: string; month?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const now = new Date()
  const selectedYear = parseInt(params.year ?? String(now.getFullYear()))
  const selectedMonth = parseInt(params.month ?? String(now.getMonth() + 1))

  // Catálogo de categorías
  const { data: categories } = await supabase
    .from('expense_categories')
    .select('id, name')
  const categoryMap = new Map((categories ?? []).map(c => [c.id, c.name]))

  // Egresos pagados del mes seleccionado
  const { data: expenses } = await supabase
    .from('expenses')
    .select('id, expense_date, category_id, amount')
    .eq('period_year', selectedYear)
    .eq('period_month', selectedMonth)
    .eq('status', 'pagado')
    .order('expense_date', { ascending: false })

  // Ingresos del mes (pagos verificados)
  const firstDay = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
  const lastDay = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0]
  const { data: payments } = await supabase
    .from('payments')
    .select('amount')
    .eq('status', 'verified')
    .gte('payment_date', firstDay)
    .lte('payment_date', lastDay)

  const monthlyIncome = (payments ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const monthlyExpenses = (expenses ?? []).reduce((s, e) => s + Number(e.amount), 0)
  const balance = monthlyIncome - monthlyExpenses

  // Agrupar egresos por categoría para el desglose
  const byCategory = new Map<string, { name: string; total: number; count: number }>()
  ;(expenses ?? []).forEach(e => {
    const name = categoryMap.get(e.category_id) ?? 'Sin categoría'
    const cur = byCategory.get(e.category_id) ?? { name, total: 0, count: 0 }
    cur.total += Number(e.amount)
    cur.count += 1
    byCategory.set(e.category_id, cur)
  })
  const categoryBreakdown = Array.from(byCategory.values()).sort((a, b) => b.total - a.total)
  const maxCategoryTotal = Math.max(...categoryBreakdown.map(c => c.total), 0)

  // Navegación de meses
  function buildUrl(y: number, m: number) {
    return `/dashboard/transparency?year=${y}&month=${m}`
  }
  const prevMonth = selectedMonth === 1 ? buildUrl(selectedYear - 1, 12) : buildUrl(selectedYear, selectedMonth - 1)
  const nextMonth = selectedMonth === 12 ? buildUrl(selectedYear + 1, 1) : buildUrl(selectedYear, selectedMonth + 1)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--navy)' }}>Transparencia</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Ingresos y egresos del edificio
        </p>
      </div>

      {/* Selector de mes */}
      <div className="flex items-center justify-between mb-6 rounded-xl border bg-white p-3" style={{ borderColor: 'var(--border)' }}>
        <a href={prevMonth} className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50" style={{ color: 'var(--text-secondary)' }}>
          ← Anterior
        </a>
        <p className="font-semibold" style={{ color: 'var(--navy)' }}>
          {MESES[selectedMonth - 1]} {selectedYear}
        </p>
        <a href={nextMonth} className="px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50" style={{ color: 'var(--text-secondary)' }}>
          Siguiente →
        </a>
      </div>

      {/* KPIs del mes */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl border bg-white p-4 sm:p-5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Ingresos</p>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <p className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--navy)' }}>
            {formatMXN(monthlyIncome)}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4 sm:p-5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Egresos</p>
            <TrendingDown size={16} className="text-amber-500" />
          </div>
          <p className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--navy)' }}>
            {formatMXN(monthlyExpenses)}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4 sm:p-5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Balance</p>
          </div>
          <p className="text-lg sm:text-xl font-semibold" style={{ color: balance >= 0 ? '#10B981' : '#EF4444' }}>
            {balance >= 0 ? '+' : ''}{formatMXN(balance)}
          </p>
        </div>
      </div>

      {/* Desglose por categoría con barras */}
      {categoryBreakdown.length > 0 && (
        <div className="rounded-xl border bg-white p-5 mb-6" style={{ borderColor: 'var(--border)' }}>
          <p className="font-semibold text-sm mb-4" style={{ color: 'var(--navy)' }}>
            Egresos por categoría
          </p>
          <div className="flex flex-col gap-3">
            {categoryBreakdown.map(c => {
              const pct = monthlyExpenses > 0 ? (c.total / monthlyExpenses) * 100 : 0
              const widthPct = maxCategoryTotal > 0 ? (c.total / maxCategoryTotal) * 100 : 0
              return (
                <div key={c.name}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {c.name}
                    </p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>
                        {formatMXN(c.total)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {pct.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-page)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${widthPct}%`, backgroundColor: 'var(--blue-action)' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabla de egresos individuales */}
      <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-page)' }}>
          <p className="font-semibold text-sm" style={{ color: 'var(--navy)' }}>
            Detalle de egresos
          </p>
        </div>

        {expenses && expenses.length > 0 ? (
          <>
            {/* Desktop */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-page)', borderBottom: `1px solid var(--border)` }}>
                    {['Fecha', 'Categoría', 'Monto'].map(h => (
                      <th key={h} className="text-left px-5 py-2.5 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e, i) => (
                    <tr key={e.id} style={{ borderTop: i > 0 ? `1px solid var(--border)` : undefined }}>
                      <td className="px-5 py-3" style={{ color: 'var(--text-secondary)' }}>
                        {formatDate(e.expense_date)}
                      </td>
                      <td className="px-5 py-3" style={{ color: 'var(--text-primary)' }}>
                        {categoryMap.get(e.category_id) ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold" style={{ color: 'var(--navy)' }}>
                        {formatMXN(e.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: 'var(--bg-page)', borderTop: `2px solid var(--border)` }}>
                    <td colSpan={2} className="px-5 py-3 text-sm font-semibold text-right" style={{ color: 'var(--navy)' }}>
                      Total
                    </td>
                    <td className="px-5 py-3 text-right font-bold" style={{ color: 'var(--navy)' }}>
                      {formatMXN(monthlyExpenses)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Móvil */}
            <div className="sm:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
              {expenses.map(e => (
                <div key={e.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {categoryMap.get(e.category_id) ?? '—'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(e.expense_date)}
                    </p>
                  </div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--navy)' }}>
                    {formatMXN(e.amount)}
                  </p>
                </div>
              ))}
              <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-page)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>Total</p>
                <p className="font-bold text-sm" style={{ color: 'var(--navy)' }}>{formatMXN(monthlyExpenses)}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <ScrollText size={28} style={{ color: 'var(--text-secondary)', opacity: 0.3 }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              No hay egresos pagados registrados en este mes.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-lg p-3 flex items-start gap-2" style={{ backgroundColor: 'rgba(37,99,235,0.05)' }}>
        <Info size={15} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--blue-action)' }} />
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Esta información se actualiza conforme la administración registra los movimientos del mes.
        </p>
      </div>
    </div>
  )
}
