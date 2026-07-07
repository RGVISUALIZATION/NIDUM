'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Pencil, Trash2, X } from 'lucide-react'

interface Payment {
  id: string
  amount: number
  payment_date: string
  reference: string | null
  notes: string | null
  unit_number: string
}

export default function PaymentActions({ payment, onUpdate }: { payment: Payment; onUpdate: () => void }) {
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [amount, setAmount] = useState(payment.amount.toString())
  const [paymentDate, setPaymentDate] = useState(payment.payment_date)
  const [reference, setReference] = useState(payment.reference || '')
  const [notes, setNotes] = useState(payment.notes || '')

  const supabase = createClientComponentClient()

  async function handleEdit() {
    setLoading(true)
    setError('')
    const parsed = parseFloat(amount)
    if (isNaN(parsed) || parsed <= 0) {
      setError('Monto inválido')
      setLoading(false)
      return
    }
    const { error: err } = await supabase.rpc('admin_edit_payment', {
      p_payment_id: payment.id,
      p_amount: parsed,
      p_payment_date: paymentDate,
      p_reference: reference || null,
      p_notes: notes || null,
    })
    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setShowEdit(false)
      onUpdate()
    }
  }

  async function handleDelete() {
    setLoading(true)
    setError('')
    const { error: err } = await supabase.rpc('admin_delete_payment', {
      p_payment_id: payment.id,
    })
    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setShowDelete(false)
      onUpdate()
    }
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          onClick={() => { setShowEdit(true); setError('') }}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
          title="Editar pago"
        >
          <Pencil size={15} />
        </button>
        <button
          onClick={() => { setShowDelete(true); setError('') }}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600 transition-colors"
          title="Eliminar pago"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Modal Editar */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: 'var(--navy, #0F2240)' }}>
                Editar pago — Depto {payment.unit_number}
              </h3>
              <button onClick={() => setShowEdit(false)} className="p-1 rounded hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Monto ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Fecha de pago</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Referencia</label>
                <input
                  type="text"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Opcional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Notas</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Opcional"
                />
              </div>
            </div>

            {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowEdit(false)}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleEdit}
                disabled={loading}
                className="px-4 py-2 text-sm rounded-lg text-white font-medium disabled:opacity-50"
                style={{ backgroundColor: 'var(--blue-action, #2563EB)' }}
              >
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--navy, #0F2240)' }}>
              Eliminar pago
            </h3>
            <p className="text-sm text-gray-600 mb-1">
              ¿Eliminar el pago de <strong>${payment.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong> del depto <strong>{payment.unit_number}</strong>?
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Las asignaciones a cargos se revertirán automáticamente.
            </p>

            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDelete(false)}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 text-sm rounded-lg text-white font-medium bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
