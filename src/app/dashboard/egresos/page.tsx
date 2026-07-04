'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface CategorySummary {
  id: string
  code: string
  name: string
  nature: 'operativo' | 'preventivo' | 'correctivo'
  billing_frequency: string
  planned_amount: number
  actual_amount: number
  variance: number
  variance_pct: number
}

interface ExpenseRow {
  id: string
  expense_date: string
  amount: number
  status: string
  payment_method: string
  reference: string | null
  notes: string | null
  category_name: string
  vendor_name: string | null
}

const NATURE_LABEL: Record<string, string> = {
  operativo: 'Operativo',
  preventivo: 'Preventivo',
  correctivo: 'Correctivo',
}

const NATURE_COLOR: Record<string, string> = {
  operativo: 'bg-blue-100 text-blue-700',
  preventivo: 'bg-amber-100 text-amber-700',
  correctivo: 'bg-red-100 text-red-700',
}

const FREQ_LABEL: Record<string, string> = {
  mensual: 'Mensual',
  bimestral: 'Bimestral',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
}

const STATUS_LABEL: Record<string, string> = {
  pagado: 'Pagado',
  pendiente: 'Pendiente',
  cancelado: 'Cancelado',
}

const STATUS_COLOR: Record<string, string> = {
  pagado: 'bg-emerald-100 text-emerald-700',
  pendiente: 'bg-amber-100 text-amber-700',
  cancelado: 'bg-gray-100 text-gray-500',
}

const now = new Date()
const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]

function fmt(n: number) {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function EgresosPage() {
  const supabase = createClient()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [rows, setRows] = useState<CategorySummary[]>([])
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [ingresos, setIngresos] = useState(0)

  useEffect(() => {
    fetchData()
  }, [year, month])

  async function fetchData() {
    setLoading(true)

    // Ingresos estimados (suma de todas las cuotas de mantenimiento)
    const { data: incomeData } = await supabase.rpc('get_estimated_monthly_income')
    setIngresos(Number(incomeData ?? 0))

    // Traer categorías activas
    const { data: cats } = await supabase
      .from('expense_categories')
      .select('id, code, name, nature, billing_frequency')
      .eq('is_active', true)
      .order('name')

    if (!cats) { setLoading(false); return }

    // Presupuesto del mes
    const { data: budget } = await supabase
      .from('budget_lines')
      .select('category_id, planned_amount')
      .eq('period_year', year)
      .eq('period_month', month)

    // Gastos reales del mes
    const { data: allExpenses } = await supabase
      .from('expenses')
      .select('id, category_id, vendor_id, expense_date, amount, status, payment_method, reference, notes')
      .eq('period_year', year)
      .eq('period_month', month)
      .order('expense_date', { ascending: false })

    // Traer vendors para mapear nombres
    const vendorIds = [...new Set((allExpenses || []).filter(e => e.vendor_id).map(e => e.vendor_id))]
    const { data: vendors } = vendorIds.length > 0
      ? await supabase.from('vendors').select('id, name').in('id', vendorIds)
      : { data: [] }
    const vendorMap = new Map((vendors || []).map(v => [v.id, v.name]))
    const catMap = new Map(cats.map(c => [c.id, c.name]))

    // Construir lista de gastos individuales
    const expenseRows: ExpenseRow[] = (allExpenses || []).map(e => ({
      id: e.id,
      expense_date: e.expense_date,
      amount: Number(e.amount),
      status: e.status,
      payment_method: e.payment_method,
      reference: e.reference,
      notes: e.notes,
      category_name: catMap.get(e.category_id) || '—',
      vendor_name: e.vendor_id ? vendorMap.get(e.vendor_id) || '—' : null,
    }))
    setExpenses(expenseRows)

    // Resumen por categoría (excluyendo cancelados)
    const budgetMap = Object.fromEntries(
      (budget || []).map(b => [b.category_id, b.planned_amount])
    )
    const expenseMap: Record<string, number> = {}
    for (const e of (allExpenses || []).filter(e => e.status !== 'cancelado')) {
      expenseMap[e.category_id] = (expenseMap[e.category_id] || 0) + Number(e.amount)
    }

    const summary: CategorySummary[] = cats.map(cat => {
      const planned = Number(budgetMap[cat.id] || 0)
      const actual = Number(expenseMap[cat.id] || 0)
      const variance = actual - planned
      const variance_pct = planned > 0 ? (variance / planned) * 100 : 0
      return { ...cat, planned_amount: planned, actual_amount: actual, variance, variance_pct }
    })

    setRows(summary)
    setLoading(false)
  }

  async function cancelExpense(id: string) {
    if (!confirm('¿Cancelar este gasto? El monto dejará de contar en el presupuesto.')) return
    setCancellingId(id)
    await supabase.from('expenses').update({ status: 'cancelado' }).eq('id', id)
    await fetchData()
    setCancellingId(null)
  }

  const totalPlanned = rows.reduce((s, r) => s + r.planned_amount, 0)
  const totalActual = rows.reduce((s, r) => s + r.actual_amount, 0)
  const totalVariance = totalActual - totalPlanned
  const balance = ingresos - totalActual

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Egresos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Presupuesto vs. gasto real por partida</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/egresos/proveedores"
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            Proveedores
          </Link>
          <Link
            href="/dashboard/egresos/nuevo"
            className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition"
          >
            + Registrar gasto
          </Link>
        </div>
      </div>

      {/* Selector de período */}
      <div className="flex items-center gap-3">
        <select
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          {MONTHS.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          {[2025, 2026, 2027].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Ingresos estimados" value={fmt(ingresos)} color="text-emerald-600" />
        <SummaryCard label="Presupuestado" value={fmt(totalPlanned)} color="text-blue-600" />
        <SummaryCard label="Gastado" value={fmt(totalActual)} color="text-gray-900" />
        <SummaryCard
          label="Balance del mes"
          value={fmt(balance)}
          color={balance >= 0 ? 'text-emerald-600' : 'text-red-600'}
          note={balance >= 0 ? 'Superávit' : 'Déficit'}
        />
      </div>

      {/* Barra de progreso global */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Ejecución del presupuesto</span>
          <span>{totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 100) : 0}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              totalActual > totalPlanned ? 'bg-red-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Gastado: {fmt(totalActual)}</span>
          <span>Presupuesto: {fmt(totalPlanned)}</span>
        </div>
      </div>

      {/* Tabla de partidas */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Cargando partidas...</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            No hay categorías configuradas.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Partida</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Frecuencia</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Presupuesto</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Gastado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Variación</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(row => {
                const overBudget = row.variance > 0 && row.planned_amount > 0
                const pct = row.planned_amount > 0
                  ? Math.min(100, (row.actual_amount / row.planned_amount) * 100)
                  : 0

                return (
                  <tr key={row.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{row.name}</div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1.5">
                        <div
                          className={`h-1.5 rounded-full ${overBudget ? 'bg-red-400' : 'bg-emerald-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${NATURE_COLOR[row.nature]}`}>
                        {NATURE_LABEL[row.nature]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {FREQ_LABEL[row.billing_frequency]}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {row.planned_amount > 0 ? fmt(row.planned_amount) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {row.actual_amount > 0 ? fmt(row.actual_amount) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.planned_amount === 0 && row.actual_amount === 0 ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <span className={`font-medium ${overBudget ? 'text-red-600' : 'text-emerald-600'}`}>
                          {overBudget ? '+' : ''}{fmt(row.variance)}
                          {row.planned_amount > 0 && (
                            <span className="text-xs ml-1 opacity-60">
                              ({Math.round(row.variance_pct)}%)
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/egresos/nuevo?categoria=${row.id}`}
                        className="text-xs text-gray-400 hover:text-gray-900 transition"
                      >
                        + Gasto
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td className="px-4 py-3 font-semibold text-gray-900" colSpan={3}>Total</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(totalPlanned)}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(totalActual)}</td>
                <td className="px-4 py-3 text-right font-semibold">
                  <span className={totalVariance > 0 ? 'text-red-600' : 'text-emerald-600'}>
                    {totalVariance > 0 ? '+' : ''}{fmt(totalVariance)}
                  </span>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* ============================================ */}
      {/* DETALLE DE GASTOS DEL MES (NUEVO)            */}
      {/* ============================================ */}
      {!loading && expenses.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900 text-sm">
              Detalle de gastos — {MONTHS[month - 1]} {year}
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Fecha</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Categoría</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Proveedor</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-600">Monto</th>
                <th className="text-center px-4 py-2.5 font-medium text-gray-600">Estado</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map(exp => (
                <tr key={exp.id} className={`hover:bg-gray-50 transition ${exp.status === 'cancelado' ? 'opacity-40' : ''}`}>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(exp.expense_date)}</td>
                  <td className="px-4 py-3 text-gray-900">{exp.category_name}</td>
                  <td className="px-4 py-3 text-gray-500">{exp.vendor_name || '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {exp.status === 'cancelado' ? <span className="line-through">{fmt(exp.amount)}</span> : fmt(exp.amount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[exp.status] || 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABEL[exp.status] || exp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {exp.status !== 'cancelado' && (
                      <button
                        onClick={() => cancelExpense(exp.id)}
                        disabled={cancellingId === exp.id}
                        className="text-xs text-gray-400 hover:text-red-600 transition disabled:opacity-50"
                      >
                        {cancellingId === exp.id ? 'Cancelando...' : 'Cancelar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}

function SummaryCard({
  label, value, color, note
}: {
  label: string; value: string; color: string; note?: string
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {note && <p className="text-xs text-gray-400 mt-0.5">{note}</p>}
    </div>
  )
}
