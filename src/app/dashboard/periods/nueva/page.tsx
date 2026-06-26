'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, AlertCircle } from 'lucide-react'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function NewPeriodPage() {
  const router = useRouter()
  const supabase = createClient()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [dueDate, setDueDate] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-10`
  )
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: err } = await supabase.from('billing_periods').insert({
      period_year: year,
      period_month: month,
      due_date: dueDate,
      notes: notes.trim() || null,
      status: 'draft',
    })

    if (err) {
      setError(err.code === '23505'
        ? `Ya existe un periodo para ${MESES[month - 1]} ${year}.`
        : err.message)
      setLoading(false)
      return
    }

    router.push('/dashboard/periods')
    router.refresh()
  }

  return (
    <div className="max-w-md">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--border)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--navy)' }}>Nuevo periodo</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Define el mes y la fecha de vencimiento
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 flex flex-col gap-5" style={{ borderColor: 'var(--border)' }}>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Mes</label>
            <select
              value={month}
              onChange={e => setMonth(parseInt(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'var(--border)' }}
            >
              {MESES.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Año</label>
            <select
              value={year}
              onChange={e => setYear(parseInt(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'var(--border)' }}
            >
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
            Fecha límite de pago *
          </label>
          <input
            required
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'var(--border)' }}
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Los vecinos verán esta fecha como su fecha límite de pago
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Notas internas</label>
          <textarea
            placeholder="Observaciones para este periodo..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none resize-none"
            style={{ borderColor: 'var(--border)' }}
          />
        </div>

        {/* Info del flujo */}
        <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: 'rgba(37,99,235,0.05)', color: 'var(--navy)' }}>
          <p className="font-medium mb-1">¿Cómo funciona?</p>
          <ol className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
            <li>1. Creas el periodo en estado <strong>Borrador</strong></li>
            <li>2. Haces clic en <strong>"Generar cargos"</strong> — el sistema crea automáticamente un cargo por cada departamento activo con su cuota fija</li>
            <li>3. Al final del mes, <strong>cierras</strong> el periodo</li>
          </ol>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-2.5 rounded-lg border text-sm font-medium"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity"
            style={{ backgroundColor: 'var(--blue-action)', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Creando...' : 'Crear periodo'}
          </button>
        </div>
      </form>
    </div>
  )
}
