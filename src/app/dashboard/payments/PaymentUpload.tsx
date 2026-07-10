'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatMXN, formatDate } from '@/lib/utils'
import { Upload, CheckCircle } from 'lucide-react'

interface BillingPeriod {
  id: string
  period_year: number
  period_month: number
  status: string
}

interface Props {
  unitId: string
  unitNumber: string
  pendingCharges: any[]
  userId: string
  billingPeriods: BillingPeriod[]
}

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function PaymentUpload({ unitId, unitNumber, pendingCharges, userId, billingPeriods }: Props) {
  const supabase = createClient()
  const [amount, setAmount] = useState('')
  const [selectedPeriods, setSelectedPeriods] = useState<Set<string>>(new Set())
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const totalPending = pendingCharges.reduce((s, c) => s + (Number(c.amount) - Number(c.paid_amount)), 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    let receipt_url: string | null = null

    // Subir comprobante si se adjuntó
    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${userId}/${Date.now()}.${ext}`
      const { data: uploaded, error: uploadErr } = await supabase.storage
        .from('payment-receipts')
        .upload(path, file, { upsert: false })

      if (uploadErr) {
        setError('Error al subir el comprobante. Inténtalo de nuevo.')
        setLoading(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage.from('payment-receipts').getPublicUrl(path)
      receipt_url = publicUrl
    }

    const { data: newPayment, error: insertErr } = await supabase.from('payments').insert({
      unit_id: unitId,
      amount: parseFloat(amount),
      payment_date: paymentDate,
      reference: reference.trim() || null,
      notes: notes.trim() || null,
      receipt_url,
      status: 'pending_review',
      submitted_by: userId,
    }).select('id').single()

    if (insertErr) {
      setError(insertErr.message)
      setLoading(false)
      return
    }

    if (newPayment && selectedPeriods.size > 0) {
      await supabase.from('payment_billing_periods').insert(
        Array.from(selectedPeriods).map(periodId => ({
          payment_id: newPayment.id,
          billing_period_id: periodId,
        }))
      )
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="rounded-xl border bg-white p-8 flex flex-col items-center gap-3" style={{ borderColor: 'var(--border)' }}>
        <CheckCircle size={40} className="text-emerald-500" />
        <h3 className="font-semibold" style={{ color: 'var(--navy)' }}>¡Pago registrado!</h3>
        <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
          La administración revisará tu comprobante y actualizará tu estado de cuenta en breve.
        </p>
        <button
          onClick={() => { setSuccess(false); setAmount(''); setReference(''); setNotes(''); setFile(null); setSelectedPeriods(new Set()) }}
          className="text-sm font-medium mt-2"
          style={{ color: 'var(--blue-action)' }}
        >
          Registrar otro pago
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-white p-6" style={{ borderColor: 'var(--border)' }}>
      <h2 className="font-semibold text-sm mb-1" style={{ color: 'var(--navy)' }}>
        Registrar pago — Depto {unitNumber}
      </h2>
      {totalPending > 0 && (
        <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
          Tienes <span className="font-semibold text-amber-600">{formatMXN(totalPending)}</span> pendientes de pago
        </p>
      )}

      {pendingCharges.length > 0 && (
        <div className="mb-5 rounded-lg border p-3 flex flex-col gap-1.5" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-page)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Cargos pendientes</p>
          {pendingCharges.map(c => (
            <div key={c.id} className="flex justify-between text-sm">
              <span style={{ color: 'var(--text-primary)' }}>{c.fee_concepts?.name} · vence {formatDate(c.due_date)}</span>
              <span className="font-semibold" style={{ color: 'var(--navy)' }}>{formatMXN(Number(c.amount) - Number(c.paid_amount))}</span>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {billingPeriods.length > 0 && (
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>¿A qué mes(es) corresponde este pago?</label>
            <div className="flex flex-wrap gap-2">
              {billingPeriods.map(bp => {
                const selected = selectedPeriods.has(bp.id)
                return (
                  <button
                    key={bp.id}
                    type="button"
                    onClick={() => {
                      const next = new Set(selectedPeriods)
                      selected ? next.delete(bp.id) : next.add(bp.id)
                      setSelectedPeriods(next)
                    }}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                    style={{
                      borderColor: selected ? 'var(--blue-action)' : 'var(--border)',
                      backgroundColor: selected ? 'var(--blue-action)' : 'transparent',
                      color: selected ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    {MONTH_NAMES[bp.period_month - 1]} {bp.period_year}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Monto pagado *</label>
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
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Fecha de pago *</label>
            <input
              required
              type="date"
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Referencia de transferencia</label>
          <input
            placeholder="Número de referencia o folio"
            value={reference}
            onChange={e => setReference(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
            style={{ borderColor: 'var(--border)' }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Comprobante (imagen o PDF)</label>
          <label
            className="flex flex-col items-center justify-center w-full h-24 rounded-lg border-2 border-dashed cursor-pointer transition-colors"
            style={{ borderColor: file ? 'var(--blue-action)' : 'var(--border)', backgroundColor: file ? 'rgba(37,99,235,0.04)' : 'var(--bg-page)' }}
          >
            <Upload size={18} style={{ color: file ? 'var(--blue-action)' : 'var(--text-secondary)' }} />
            <span className="text-xs mt-1.5" style={{ color: file ? 'var(--blue-action)' : 'var(--text-secondary)' }}>
              {file ? file.name : 'Clic para adjuntar comprobante'}
            </span>
            <input
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Notas adicionales</label>
          <textarea
            placeholder="¿Quieres agregar alguna nota para la administración?"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none resize-none"
            style={{ borderColor: 'var(--border)' }}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity mt-1"
          style={{ backgroundColor: 'var(--blue-action)', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Enviando...' : 'Enviar pago para revisión'}
        </button>
      </form>
    </div>
  )
}
