'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatMXN, formatDate } from '@/lib/utils'
import { CheckCircle, XCircle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'

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
  paymentId: string
  amount: number
  unitNumber: string
  unitId: string
  receiptUrl: string | null
}

export default function PaymentVerify({ paymentId, amount, unitNumber, unitId, receiptUrl }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState<'verify' | 'reject' | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)
  const [charges, setCharges] = useState<Charge[]>([])
  const [selectedCharges, setSelectedCharges] = useState<Set<string>>(new Set())
  const [showCharges, setShowCharges] = useState(false)
  const [loadingCharges, setLoadingCharges] = useState(false)

  async function loadCharges() {
    if (charges.length > 0) { setShowCharges(!showCharges); return }
    setLoadingCharges(true)
    const { data } = await supabase
      .from('charges')
      .select('id, description, amount, paid_amount, due_date, status, fee_concepts(name)')
      .eq('unit_id', unitId)
      .in('status', ['pending', 'partial'])
      .order('due_date')
    setCharges((data as any) ?? [])

    // Pre-select charges the resident already chose
    const { data: existing } = await supabase
      .from('payment_charges')
      .select('charge_id')
      .eq('payment_id', paymentId)
    if (existing && existing.length > 0) {
      setSelectedCharges(new Set(existing.map(e => e.charge_id)))
    }

    setShowCharges(true)
    setLoadingCharges(false)
  }

  async function verify() {
    setLoading('verify')
    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('payment_charges').delete().eq('payment_id', paymentId)
    if (selectedCharges.size > 0) {
      await supabase.from('payment_charges').insert(
        Array.from(selectedCharges).map(chargeId => ({
          payment_id: paymentId,
          charge_id: chargeId,
        }))
      )
    }

    await supabase.from('payments').update({
      status: 'verified',
      verified_by: user?.id,
      verified_at: new Date().toISOString(),
      admin_notes: adminNotes || null,
    }).eq('id', paymentId)

    router.refresh()
    setLoading(null)
  }

  async function reject() {
    if (!adminNotes.trim()) {
      setShowNotes(true)
      return
    }
    setLoading('reject')
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('payments').update({
      status: 'rejected',
      verified_by: user?.id,
      verified_at: new Date().toISOString(),
      admin_notes: adminNotes,
    }).eq('id', paymentId)
    router.refresh()
    setLoading(null)
  }

  return (
    <div className="flex flex-col gap-2">
      {receiptUrl && (
        <a
          href={receiptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-medium"
          style={{ color: 'var(--blue-action)' }}
        >
          <ExternalLink size={12} />
          Ver comprobante
        </a>
      )}

      <button
        type="button"
        onClick={loadCharges}
        className="flex items-center gap-1 text-xs font-medium"
        style={{ color: 'var(--blue-action)' }}
      >
        {showCharges ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {loadingCharges ? 'Cargando...' : showCharges ? 'Ocultar cargos' : 'Aplicar a cargos específicos'}
      </button>

      {showCharges && charges.length > 0 && (
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
                  {c.description || c.fee_concepts?.name}
                </span>
                <span className="font-semibold whitespace-nowrap" style={{ color: 'var(--navy)' }}>{formatMXN(remaining)}</span>
              </label>
            )
          })}
          {selectedCharges.size === 0 && (
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>Sin selección = se aplica FIFO automático</p>
          )}
        </div>
      )}

      {showCharges && charges.length === 0 && !loadingCharges && (
        <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>No hay cargos pendientes para este depto.</p>
      )}

      {showNotes && (
        <input
          autoFocus
          placeholder="Motivo del rechazo (requerido)"
          value={adminNotes}
          onChange={e => setAdminNotes(e.target.value)}
          className="text-xs px-2 py-1.5 rounded border outline-none"
          style={{ borderColor: 'var(--border)' }}
        />
      )}
      <div className="flex gap-2">
        <button
          onClick={verify}
          disabled={!!loading}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity"
          style={{ backgroundColor: '#10B981', opacity: loading ? 0.6 : 1 }}
        >
          <CheckCircle size={12} />
          {loading === 'verify' ? '...' : 'Verificar'}
        </button>
        <button
          onClick={reject}
          disabled={!!loading}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white transition-opacity"
          style={{ backgroundColor: '#EF4444', opacity: loading ? 0.6 : 1 }}
        >
          <XCircle size={12} />
          {loading === 'reject' ? '...' : 'Rechazar'}
        </button>
      </div>
    </div>
  )
}
