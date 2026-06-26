'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react'
import { formatMXN } from '@/lib/utils'

interface Unit { id: string; unit_number: string; floor: number | null }
interface PenaltyType {
  id: string
  code: string
  name: string
  description: string | null
  default_amount: number
}

export default function MultaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [units, setUnits] = useState<Unit[]>([])
  const [types, setTypes] = useState<PenaltyType[]>([])
  const [unitId, setUnitId] = useState('')
  const [typeId, setTypeId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const now = new Date()
  const [dueDate, setDueDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 15).toISOString().split('T')[0]
  )
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: u }, { data: t }] = await Promise.all([
        supabase.from('units').select('id, unit_number, floor').eq('status', 'active').order('unit_number'),
        supabase.from('penalty_types').select('*').eq('is_active', true).order('name'),
      ])
      if (u) setUnits(u)
      if (t) setTypes(t)
    }
    load()
  }, [])

  // Al cambiar el tipo, autocompletar el monto sugerido
  function handleTypeChange(id: string) {
    setTypeId(id)
    const selected = types.find(t => t.id === id)
    if (selected && selected.default_amount > 0) {
      setAmount(String(selected.default_amount))
    } else {
      setAmount('')
    }
  }

  const selectedType = types.find(t => t.id === typeId)
  const selectedUnit = units.find(u => u.id === unitId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!unitId || !typeId) {
      setError('Selecciona departamento y tipo de multa')
      return
    }
    const amountNum = parseFloat(amount)
    if (!amountNum || amountNum <= 0) {
      setError('Captura un monto mayor a cero')
      return
    }

    setLoading(true)
    setError('')

    // Encontrar el concept_id de 'penalty'
    const { data: concept } = await supabase
      .from('fee_concepts')
      .select('id')
      .eq('code', 'penalty')
      .single()

    if (!concept) {
      setError('No se encontró el concepto de multa')
      setLoading(false)
      return
    }

    const desc = selectedType!.name + (description.trim() ? ` — ${description.trim()}` : '')

    const { error: err } = await supabase.from('charges').insert({
      unit_id: unitId,
      concept_id: concept.id,
      description: desc,
      amount: amountNum,
      due_date: dueDate,
      status: 'pending',
    })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500" />
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--navy)' }}>
          ¡Multa registrada!
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Se asignó la multa al departamento <strong>{selectedUnit?.unit_number}</strong> por <strong>{formatMXN(parseFloat(amount))}</strong>
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setSuccess(false)
              setUnitId('')
              setTypeId('')
              setAmount('')
              setDescription('')
            }}
            className="px-4 py-2 rounded-lg border text-sm font-medium"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Asignar otra multa
          </button>
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
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--navy)' }}>Asignar multa</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Aplica una sanción a un departamento específico
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 flex flex-col gap-5" style={{ borderColor: 'var(--border)' }}>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
            Departamento *
          </label>
          <select
            required
            value={unitId}
            onChange={e => setUnitId(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'var(--border)' }}
          >
            <option value="">Selecciona el depto...</option>
            {units.map(u => (
              <option key={u.id} value={u.id}>
                Depto {u.unit_number}{u.floor ? ` · Piso ${u.floor}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
            Tipo de multa *
          </label>
          <select
            required
            value={typeId}
            onChange={e => handleTypeChange(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'var(--border)' }}
          >
            <option value="">Selecciona el tipo...</option>
            {types.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}{t.default_amount > 0 ? ` — ${formatMXN(t.default_amount)} sugerido` : ''}
              </option>
            ))}
          </select>
          {selectedType?.description && (
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>
              {selectedType.description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              Monto * {selectedType && selectedType.default_amount > 0 && (
                <span className="text-xs font-normal" style={{ color: 'var(--text-secondary)' }}>
                  (editable)
                </span>
              )}
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

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
            Motivo específico (opcional)
          </label>
          <textarea
            placeholder="ej. Música a las 02:30am del 24/06, vecino del depto 105 reportó."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none resize-none"
            style={{ borderColor: 'var(--border)' }}
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            El vecino verá este motivo en su estado de cuenta
          </p>
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
            {loading ? 'Guardando...' : 'Asignar multa'}
          </button>
        </div>
      </form>
    </div>
  )
}
