'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatMXN } from '@/lib/utils'
import { Pencil, Trash2, X, Save, AlertTriangle } from 'lucide-react'

interface Props {
  payment: {
    id: string
    unit_id: string
    amount: number
    payment_date: string
    reference: string | null
    notes: string | null
    status: string
    receipt_url: string | null
    units?: { unit_number: string } | null
  }
}

export default function PaymentActions({ payment }: Props) {
  const supabase = createClient()
  const router = useRouter()

  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Edit fields
  const [amount, setAmount] = useState(String(payment.amount))
  const [paymentDate, setPaymentDate] = useState(payment.payment_date)
  const [reference, setReference] = useState(payment.reference ?? '')
  const [notes, setNotes] = useState(payment.notes ?? '')

  async function handleDelete() {
    setLoading(true)
    setError('')
    try {
      // 1. If verified, set to rejected first → trigger deletes allocations & recalculates charges
      if (payment.status === 'verified') {
        const { error: rejectErr } = await supabase
          .from('payments')
          .update({ status: 'rejected' })
          .eq('id', payment.id)
        if (rejectErr) throw rejectErr
      }

      // 2. Delete any remaining allocations
      await supabase
        .from('payment_allocations')
        .delete()
        .eq('payment_id', payment.id)

      // 3. Delete the payment
      const { error: delErr } = await supabase
        .from('payments')
        .delete()
        .eq('id', payment.id)
      if (delErr) throw delErr

      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error al eliminar')
      setLoading(false)
    }
  }

  async function handleSave() {
    const newAmount = parseFloat(amount)
    if (!newAmount || newAmount <= 0) {
      setError('Monto inválido')
      return
    }
    setLoading(true)
    setError('')
    try {
      const amountChanged = newAmount !== payment.amount

      if (amountChanged && payment.status === 'verified') {
        // Step 1: Set to rejected → trigger deletes allocations & recalculates charges
        const { error: rejectErr } = await supabase
          .from('payments')
          .update({ status: 'rejected' })
          .eq('id', payment.id)
        if (rejectErr) throw rejectErr

        // Step 2: Update with new data and set back to verified → trigger re-allocates
        const { error: updateErr } = await supabase
          .from('payments')
          .update({
            amount: newAmount,
            payment_date: paymentDate,
            reference: reference.trim() || null,
            notes: notes.trim() || null,
            status: 'verified',
          })
          .eq('id', payment.id)
        if (updateErr) throw updateErr
      } else {
        // Simple update without re-allocation
        const { error: updateErr } = await supabase
          .from('payments')
          .update({
            amount: newAmount,
            payment_date: paymentDate,
            reference: reference.trim() || null,
            notes: notes.trim() || null,
          })
          .eq('id', payment.id)
        if (updateErr) throw updateErr
      }

      setEditing(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error al guardar')
      setLoading(false)
    }
  }

  // Inline edit row
  if (editing) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 items-end flex-wrap">
          <div>
            <label className="block text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>Monto</label>
            <input
              type="number"
              step="0.01"
              min="1"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-28 px-2 py-1.5 rounded border text-xs outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>Fecha</label>
            <input
              type="date"
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
              className="px-2 py-1.5 rounded border text-xs outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>Referencia</label>
            <input
              value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder="—"
              className="w-32 px-2 py-1.5 rounded border text-xs outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>Notas</label>
          <input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="—"
            className="w-full px-2 py-1.5 rounded border text-xs outline-none"
            style={{ borderColor: 'var(--border)' }}
          />
        </div>
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white"
            style={{ backgroundColor: 'var(--blue-action)', opacity: loading ? 0.6 : 1 }}
          >
            <Save size={12} />
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            onClick={() => { setEditing(false); setError(''); setAmount(String(payment.amount)); setPaymentDate(payment.payment_date); setReference(payment.reference ?? ''); setNotes(payment.notes ?? '') }}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            <X size={12} />
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  // Delete confirmation
  if (confirmDelete) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
          <AlertTriangle size={13} />
          ¿Eliminar pago de {formatMXN(payment.amount)} del Depto {payment.units?.unit_number}?
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white"
            style={{ backgroundColor: '#EF4444', opacity: loading ? 0.6 : 1 }}
          >
            <Trash2 size={12} />
            {loading ? 'Eliminando...' : 'Sí, eliminar'}
          </button>
          <button
            onClick={() => { setConfirmDelete(false); setError('') }}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  // Default: action buttons
  return (
    <div className="flex items-center gap-1">
      {payment.status === 'pending_review' ? null : (
        <>
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            title="Editar pago"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            title="Eliminar pago"
          >
            <Trash2 size={14} />
          </button>
        </>
      )}
      {payment.receipt_url && (
        <a
          href={payment.receipt_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium ml-1"
          style={{ color: 'var(--blue-action)' }}
        >
          Comprobante
        </a>
      )}
    </div>
  )
}
