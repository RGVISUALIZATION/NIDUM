'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { formatMXN } from '@/lib/utils'
import { CheckCircle, XCircle, ExternalLink } from 'lucide-react'

interface Props {
  paymentId: string
  amount: number
  unitNumber: string
  receiptUrl: string | null
}

export default function PaymentVerify({ paymentId, amount, unitNumber, receiptUrl }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState<'verify' | 'reject' | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [showNotes, setShowNotes] = useState(false)

  async function verify() {
    setLoading('verify')
    const { data: { user } } = await supabase.auth.getUser()
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
