'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Zap, Lock, MoreVertical } from 'lucide-react'

interface Period {
  id: string
  period_year: number
  period_month: number
  status: string
  generated_at: string | null
}

export default function PeriodActions({ period, compact }: { period: Period; compact: boolean }) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  async function generateCharges() {
    if (!confirm(`¿Generar los cargos de mantenimiento para todos los departamentos activos? Esta acción no se puede deshacer.`)) return
    setLoading('generate')
    setResult(null)

    const { data, error } = await supabase.rpc('generate_period_charges', {
      p_period_id: period.id,
    })

    if (error) {
      setResult(`Error: ${error.message}`)
    } else {
      setResult(`✓ ${data} cargos generados`)
      router.refresh()
    }
    setLoading(null)
  }

  async function closePeriod() {
    if (!confirm('¿Cerrar este periodo? Ya no se podrán generar más cargos de mantenimiento para este mes.')) return
    setLoading('close')
    await supabase.from('billing_periods').update({ status: 'closed' }).eq('id', period.id)
    router.refresh()
    setLoading(null)
  }

  if (period.status === 'closed') {
    return <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Cerrado</span>
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {period.status === 'draft' && (
          <button
            onClick={generateCharges}
            disabled={!!loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity"
            style={{ backgroundColor: 'var(--blue-action)', opacity: loading ? 0.7 : 1 }}
          >
            <Zap size={12} />
            {loading === 'generate' ? 'Generando...' : 'Generar cargos'}
          </button>
        )}
        {period.status === 'open' && (
          <button
            onClick={closePeriod}
            disabled={!!loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            <Lock size={12} />
            {loading === 'close' ? 'Cerrando...' : 'Cerrar periodo'}
          </button>
        )}
        {result && <span className="text-xs text-emerald-600">{result}</span>}
      </div>
    )
  }

  // Versión grande para el card del periodo activo
  return (
    <div className="flex flex-col items-end gap-2">
      {period.status === 'open' && !period.generated_at && (
        <button
          onClick={generateCharges}
          disabled={!!loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity"
          style={{ backgroundColor: 'var(--blue-action)', opacity: loading ? 0.7 : 1 }}
        >
          <Zap size={15} />
          {loading === 'generate' ? 'Generando cargos...' : 'Generar cargos'}
        </button>
      )}
      {period.status === 'open' && (
        <button
          onClick={closePeriod}
          disabled={!!loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          <Lock size={15} />
          {loading === 'close' ? 'Cerrando...' : 'Cerrar periodo'}
        </button>
      )}
      {result && (
        <span className="text-sm font-medium text-emerald-600">{result}</span>
      )}
    </div>
  )
}
