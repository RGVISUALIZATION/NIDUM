'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, AlertCircle, CheckCircle, Zap } from 'lucide-react'
import { formatMXN } from '@/lib/utils'

export default function DerramaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [activeUnits, setActiveUnits] = useState(0)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const now = new Date()
  const [dueDate, setDueDate] = useState(
    new Date(now.getFullYear(), now.getMonth() + 1, 10).toISOString().split('T')[0]
  )
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { count } = await supabase.from('units').select('*', { count: 'exact', head: true }).eq('status', 'active')
      setActiveUnits(count ?? 0)
    }
    load()
  }, [])

  const amountNum = parseFloat(amount) || 0
  const totalToCollect = amountNum * activeUnits

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || amountNum <= 0) {
      setError('Captura el título y un monto mayor a cero')
      return
    }
    if (!confirm(`¿Generar ${activeUnits} cargos de ${formatMXN(amountNum)} cada uno? Esta acción no se puede deshacer en bloque (tendrías que cancelar cargo por cargo).`)) return

    setLoading(true)
    setError('')

    const { data, error: err } = await supabase.rpc('create_extraordinary_charges', {
      p_title: title.trim(),
      p_description: description.trim(),
      p_amount: amountNum,
      p_due_date: dueDate,
    })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setSuccess(data as number)
    setLoading(false)
  }

  if (success !== null) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500" />
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--navy)' }}>
          ¡Derrama generada!
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Se crearon <strong>{success} cargos</strong> de <strong>{formatMXN(amountNum)}</strong> cada uno.<br />
          Los vecinos ya pueden verlos en su estado de cuenta.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push('/dashboard/charges')}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--blue-action)' }}
          >
            Ver cargos
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg">
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
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--navy)' }}>Nueva derrama</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Genera un cargo extraordinario para todos los departamentos activos
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 flex flex-col gap-5" style={{ borderColor: 'var(--border)' }}>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
            Título de la derrama *
          </label>
          <input
            required
            placeholder="ej. Reposición de bomba hidráulica"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'var(--border)' }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
            Descripción (opcional)
          </label>
          <textarea
            placeholder="Más detalle sobre la derrama..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none resize-none"
            style={{ borderColor: 'var(--border)' }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Monto por depto *
            </label>
            <input
              required
              type="number"
              step="0.01"
              min="1"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Fecha límite *
            </label>
            <input
              required
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
        </div>

        {/* Vista previa */}
        <div
          className="rounded-lg p-4 border"
          style={{ backgroundColor: amountNum > 0 ? 'rgba(37,99,235,0.05)' : 'var(--bg-page)', borderColor: amountNum > 0 ? 'var(--blue-action)' : 'var(--border)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap size={15} style={{ color: 'var(--blue-action)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>Vista previa</p>
          </div>
          {amountNum > 0 ? (
            <>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                Se generarán <strong>{activeUnits} cargos</strong> de <strong>{formatMXN(amountNum)}</strong> cada uno
              </p>
              <p className="text-sm font-semibold mt-2" style={{ color: 'var(--blue-action)' }}>
                Total a recaudar: {formatMXN(totalToCollect)}
              </p>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Captura un monto para ver el total
            </p>
          )}
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
            disabled={loading || amountNum <= 0}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ backgroundColor: 'var(--blue-action)' }}
          >
            {loading ? 'Generando...' : `Generar ${activeUnits} cargos`}
          </button>
        </div>
      </form>
    </div>
  )
}
