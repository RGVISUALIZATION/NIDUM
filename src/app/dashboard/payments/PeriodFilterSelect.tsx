'use client'

import { useRouter } from 'next/navigation'

interface BillingPeriod {
  id: string
  period_year: number
  period_month: number
  status: string
}

interface Props {
  periods: BillingPeriod[]
  selected: string
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  open: 'Abierto',
  closed: 'Cerrado',
}

export default function PeriodFilterSelect({ periods, selected }: Props) {
  const router = useRouter()

  const sorted = [...periods].sort((a, b) => {
    if (a.period_year !== b.period_year) return b.period_year - a.period_year
    return b.period_month - a.period_month
  })

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value
    router.push(value ? `/dashboard/payments?period=${value}` : '/dashboard/payments')
  }

  return (
    <select
      value={selected}
      onChange={handleChange}
      className="text-sm border rounded-lg px-3 py-2 bg-white"
      style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
    >
      <option value="">Últimos pagos</option>
      <option value="all">Todos los periodos</option>
      {sorted.map(p => (
        <option key={p.id} value={p.id}>
          {MESES[p.period_month - 1]} {p.period_year} · {STATUS_LABEL[p.status] ?? p.status}
        </option>
      ))}
    </select>
  )
}
