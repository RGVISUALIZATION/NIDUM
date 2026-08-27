'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatMXN, formatDate } from '@/lib/utils'
import { Pencil, Trash2, X, Save, AlertTriangle, Banknote } from 'lucide-react'

interface Charge {
  id: string
  description: string
  amount: number
  paid_amount: number
  due_date: string
  status: string
  fee_concepts: { name: string } | null
}

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
  creditBalance?: number
  creditId?: string | null
}

export default function PaymentActions({ payment, creditBalance = 0, creditId = null }: Props) {
  const supabase = createClient()
  const router = useRouter()

  // UI states
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [applyingCredit, setApplyingCredit] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasInvoices, setHasInvoices] = useState(false)
  const [checkingInvoices, setCheckingInvoices] = useState(true)

  // Invoice check
  useEffect(() => {
    async function checkInvoices() {
      const { count } = await supabase
        .from('payment_invoices')
        .select('*', { count: 'exact', head: true })
        .eq('payment_id', payment.id)
      setHasInvoices((count ?? 0) > 0)
      setCheckingInvoices(false)
    }
    checkInvoices()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment.id])

  // Edit fields
  const [amount, setAmount] = useState(String(payment.amount))
  const [paymentDate, setPaymentDate] = useState(payment.payment_date)
  const [reference, setReference] = useState(payment.reference ?? '')
  const [notes, setNotes] = useState(payment.notes ?? '')

  // Charge reassignment
  const [charges, setCharges] = useState<Charge[]>([])
  const [selectedCharges, setSelectedCharges] = useState<Set<string>>(new Set())
  const [loadingCharges, setLoadingCharges] = useState(false)
  const [chargesLoaded, setChargesLoaded] = useState(false)

  // Credit application
  const [creditCharges, setCreditCharges] = useState<Charge[]>([])
  const [selectedCreditCharge, setSelectedCreditCharge] = useState('')
  const [creditAmount, setCreditAmount] = useState('')
  const [loadingCreditCharges, setLoadingCreditCharges] = useState(false)

  async function loadChargesForEdit() {
    if (chargesLoaded) return
    setLoadingCharges(true)

    // Load pending/partial charges for this unit
    const { data } = await supabase
      .from('charges')
      .select('id, description, amount, paid_amount, due_date, status, fee_concepts(name)')
      .eq('unit_id', payment.unit_id)
      .in('status', ['pending', 'partial'])
      .order('due_date')
    setCharges((data as any) ?? [])

    // Pre-select charges currently allocated to this payment
    const { data: currentAllocations } = await supabase
      .from('payment_allocations')
      .select('charge_id')
      .eq('payment_id', payment.id)
    if (currentAllocations && currentAllocations.length > 0) {
      setSelectedCharges(new Set(currentAllocations.map(a => a.charge_id)))
    }

    setChargesLoaded(true)
    setLoadingCharges(false)
  }

  async function loadChargesForCredit() {
    setLoadingCreditCharges(true)
    const { data } = await supabase
      .from('charges')
      .select('id, description, amount, paid_amount, due_date, status, fee_concepts(name)')
      .eq('unit_id', payment.unit_id)
      .in('status', ['pending', 'partial'])
      .order('due_date')
    setCreditCharges((data as any) ?? [])
    setLoadingCreditCharges(false)
  }

  function resetEditState() {
    setEditing(false)
    setError('')
    setAmount(String(payment.amount))
    setPaymentDate(payment.payment_date)
    setReference(payment.reference ?? '')
    setNotes(payment.notes ?? '')
    setSelectedCharges(new Set())
    setChargesLoaded(false)
  }

  // --- DELETE ---
  async function handleDelete() {
    setLoading(true)
    setError('')
    try {
      if (payment.status === 'verified') {
        const { error: rejectErr } = await supabase
          .from('payments')
          .update({ status: 'rejected' })
          .eq('id', payment.id)
        if (rejectErr) throw rejectErr
      }
      await supabase.from('payment_allocations').delete().eq('payment_id', payment.id)
      const { error: delErr } = await supabase.from('payments').delete().eq('id', payment.id)
      if (delErr) throw delErr
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error al eliminar')
      setLoading(false)
    }
  }

  // --- SAVE (edit + reassign) ---
  async function handleSave() {
    const newAmount = parseFloat(amount)
    if (!newAmount || newAmount <= 0) {
      setError('Monto inválido')
      return
    }
    setLoading(true)
    setError('')
    try {
      if (payment.status === 'verified') {
        // Step 1: Reject → trigger deletes allocations & unused credits
        const { error: rejectErr } = await supabase
          .from('payments')
          .update({ status: 'rejected' })
          .eq('id', payment.id)
        if (rejectErr) throw rejectErr

        // Step 2: Set up new charge selections
        await supabase.from('payment_charges').delete().eq('payment_id', payment.id)
        if (selectedCharges.size > 0) {
          await supabase.from('payment_charges').insert(
            Array.from(selectedCharges).map(chargeId => ({
              payment_id: payment.id,
              charge_id: chargeId,
            }))
          )
        }

        // Step 3: Re-verify with updated data → trigger re-allocates
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
        // Non-verified: simple field update
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
      setChargesLoaded(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error al guardar')
      setLoading(false)
    }
  }

  // --- APPLY CREDIT ---
  async function handleApplyCredit() {
    if (!creditId || !selectedCreditCharge || !creditAmount) return
    const applyAmt = parseFloat(creditAmount)
    if (!applyAmt || applyAmt <= 0) {
      setError('Monto inválido')
      return
    }
    if (applyAmt > creditBalance) {
      setError(`El monto excede el saldo disponible (${formatMXN(creditBalance)})`)
      return
    }
    setLoading(true)
    setError('')
    try {
      const { error: rpcErr } = await supabase.rpc('apply_unit_credit', {
        p_credit_id: creditId,
        p_charge_id: selectedCreditCharge,
        p_amount: applyAmt,
      })
      if (rpcErr) throw rpcErr
      setApplyingCredit(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error al aplicar saldo')
      setLoading(false)
    }
  }

  // =============================================
  // RENDER: Apply credit view
  // =============================================
  if (applyingCredit) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-2">
          <Banknote size={13} />
          Aplicar saldo a favor: {formatMXN(creditBalance)} disponible
        </div>

        {loadingCreditCharges ? (
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Cargando cargos...</p>
        ) : creditCharges.length > 0 ? (
          <div className="rounded-lg border p-2 flex flex-col gap-1" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-page)' }}>
            {creditCharges.map(c => {
              const remaining = Number(c.amount) - Number(c.paid_amount)
              return (
                <label key={c.id} className="flex items-center gap-1.5 text-xs cursor-pointer py-0.5">
                  <input
                    type="radio"
                    name="credit_charge"
                    checked={selectedCreditCharge === c.id}
                    onChange={() => {
                      setSelectedCreditCharge(c.id)
                      setCreditAmount(String(Math.min(creditBalance, remaining)))
                    }}
                    className="accent-emerald-600 w-3.5 h-3.5"
                  />
                  <span className="flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                    {c.description || c.fee_concepts?.name}
                  </span>
                  <span className="font-semibold whitespace-nowrap" style={{ color: 'var(--navy)' }}>
                    {formatMXN(remaining)}
                  </span>
                </label>
              )
            })}
          </div>
        ) : (
          <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>No hay cargos pendientes.</p>
        )}

        {selectedCreditCharge && (
          <div>
            <label className="block text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>Monto a aplicar</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={creditBalance}
              value={creditAmount}
              onChange={e => setCreditAmount(e.target.value)}
              className="w-28 px-2 py-1.5 rounded border text-xs outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={handleApplyCredit}
            disabled={loading || !selectedCreditCharge || !creditAmount}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white"
            style={{ backgroundColor: '#10B981', opacity: loading || !selectedCreditCharge ? 0.6 : 1 }}
          >
            <Save size={12} />
            {loading ? 'Aplicando...' : 'Aplicar'}
          </button>
          <button
            onClick={() => { setApplyingCredit(false); setError(''); setSelectedCreditCharge(''); setCreditAmount('') }}
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

  // =============================================
  // RENDER: Edit + reassign view
  // =============================================
  if (editing) {
    if (hasInvoices) {
      return (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-2">
            <AlertTriangle size={13} />
            Este pago tiene factura vinculada. Elimina primero la factura desde Contabilidad antes de modificar o eliminar el pago.
          </div>
          <button
            onClick={() => { setEditing(false); setError('') }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Entendido
          </button>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-2">
        {/* Basic fields */}
        <div className="flex gap-2 items-end flex-wrap">
          <div>
            <label className="block text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>Monto</label>
            <input type="number" step="0.01" min="1" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-28 px-2 py-1.5 rounded border text-xs outline-none" style={{ borderColor: 'var(--border)' }} />
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>Fecha</label>
            <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
              className="px-2 py-1.5 rounded border text-xs outline-none" style={{ borderColor: 'var(--border)' }} />
          </div>
          <div>
            <label className="block text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>Referencia</label>
            <input value={reference} onChange={e => setReference(e.target.value)} placeholder="—"
              className="w-32 px-2 py-1.5 rounded border text-xs outline-none" style={{ borderColor: 'var(--border)' }} />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>Notas</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="—"
            className="w-full px-2 py-1.5 rounded border text-xs outline-none" style={{ borderColor: 'var(--border)' }} />
        </div>

        {/* Charge selector (replaces old period selector) */}
        {payment.status === 'verified' && (
          <div>
            <label className="block text-[10px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Asignar a cargo(s)
            </label>
            {loadingCharges ? (
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Cargando cargos...</p>
            ) : charges.length > 0 ? (
              <div className="rounded-lg border p-2 flex flex-col gap-1" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-page)' }}>
                {charges.map(c => {
                  const remaining = Number(c.amount) - Number(c.paid_amount)
                  const checked = selectedCharges.has(c.id)
                  return (
                    <label key={c.id} className="flex items-center gap-1.5 text-xs cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = new Set(selectedCharges)
                          checked ? next.delete(c.id) : next.add(c.id)
                          setSelectedCharges(next)
                        }}
                        className="accent-blue-600 w-3.5 h-3.5 rounded"
                      />
                      <span className="flex-1 truncate" style={{ color: 'var(--text-primary)' }}>
                        {c.description || c.fee_concepts?.name} · vence {formatDate(c.due_date)}
                      </span>
                      <span className="font-semibold whitespace-nowrap" style={{ color: 'var(--navy)' }}>
                        {formatMXN(remaining)}
                      </span>
                    </label>
                  )
                })}
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {selectedCharges.size === 0
                    ? 'Sin selección = FIFO automático a todos los cargos pendientes'
                    : 'Sobrante se guardará como saldo a favor del depto'}
                </p>
              </div>
            ) : (
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                No hay cargos pendientes para este depto.
              </p>
            )}
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button onClick={handleSave} disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white"
            style={{ backgroundColor: 'var(--blue-action)', opacity: loading ? 0.6 : 1 }}>
            <Save size={12} />
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          <button onClick={resetEditState} disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
            <X size={12} />
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  // =============================================
  // RENDER: Delete confirmation
  // =============================================
  if (confirmDelete) {
    return (
      <div className="flex flex-col gap-2">
        {hasInvoices ? (
          <>
            <div className="flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-2">
              <AlertTriangle size={13} />
              Este pago tiene factura vinculada. Elimina primero la factura desde Contabilidad antes de modificar o eliminar el pago.
            </div>
            <button
              onClick={() => { setConfirmDelete(false); setError('') }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              Entendido
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
              <AlertTriangle size={13} />
              ¿Eliminar pago de {formatMXN(payment.amount)} del Depto {payment.units?.unit_number}?
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-2">
              <button onClick={handleDelete} disabled={loading}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white"
                style={{ backgroundColor: '#EF4444', opacity: loading ? 0.6 : 1 }}>
                <Trash2 size={12} />
                {loading ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
              <button onClick={() => { setConfirmDelete(false); setError('') }} disabled={loading}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border"
                style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  // =============================================
  // RENDER: Default action buttons
  // =============================================
  return (
    <div className="flex items-center gap-1">
      {payment.status !== 'pending_review' && (
        <>
          <button
            onClick={() => { setEditing(true); loadChargesForEdit() }}
            disabled={checkingInvoices}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: hasInvoices ? '#f59e0b' : 'var(--text-secondary)', opacity: checkingInvoices ? 0.3 : 1 }}
            title={hasInvoices ? 'Pago con factura — clic para detalles' : 'Editar y reasignar cargos'}
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={checkingInvoices}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: hasInvoices ? '#f59e0b' : 'var(--text-secondary)', opacity: checkingInvoices ? 0.3 : 1 }}
            title={hasInvoices ? 'Pago con factura — clic para detalles' : 'Eliminar pago'}
          >
            <Trash2 size={14} />
          </button>
          {creditBalance > 0 && creditId && (
            <button
              onClick={() => { setApplyingCredit(true); loadChargesForCredit() }}
              className="p-1.5 rounded-md transition-colors"
              style={{ color: '#10B981' }}
              title={`Aplicar saldo a favor: ${formatMXN(creditBalance)}`}
            >
              <Banknote size={14} />
            </button>
          )}
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
