'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft } from 'lucide-react'

export default function NewUnitPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    unit_number: '',
    floor: '',
    area_m2: '',
    monthly_fee: '',
    notes: '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: err } = await supabase.from('units').insert({
      unit_number: form.unit_number.trim(),
      floor: form.floor ? parseInt(form.floor) : null,
      area_m2: form.area_m2 ? parseFloat(form.area_m2) : null,
      monthly_fee: parseFloat(form.monthly_fee),
      notes: form.notes.trim() || null,
      status: 'active',
    })

    if (err) {
      setError(err.code === '23505' ? 'Ya existe un departamento con ese número.' : err.message)
      setLoading(false)
      return
    }

    router.push('/dashboard/units')
    router.refresh()
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
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--navy)' }}>
            Nuevo departamento
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Agrega los datos del departamento
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 flex flex-col gap-5" style={{ borderColor: 'var(--border)' }}>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Número de departamento *">
            <input
              required
              placeholder="ej. 101, A-12"
              value={form.unit_number}
              onChange={e => set('unit_number', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Piso">
            <input
              type="number"
              placeholder="ej. 3"
              value={form.floor}
              onChange={e => set('floor', e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Superficie (m²)">
            <input
              type="number"
              step="0.01"
              placeholder="ej. 85.50"
              value={form.area_m2}
              onChange={e => set('area_m2', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Cuota mensual (MXN) *">
            <input
              required
              type="number"
              step="0.01"
              min="0"
              placeholder="ej. 2500.00"
              value={form.monthly_fee}
              onChange={e => set('monthly_fee', e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Notas internas">
          <textarea
            placeholder="Observaciones del departamento..."
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={2}
            className={`${inputClass} resize-none`}
          />
        </Field>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors"
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
            {loading ? 'Guardando...' : 'Guardar departamento'}
          </button>
        </div>
      </form>
    </div>
  )
}

const inputClass = `w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-all`

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}
