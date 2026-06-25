'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'

interface Props {
  reservationId: string
  isAdmin: boolean
  isOwner: boolean
  reservationDate: string
}

export default function CancelReservation({ reservationId, isAdmin, isOwner, reservationDate }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Solo puede cancelar el dueño de la reserva o el admin
  if (!isAdmin && !isOwner) return null

  // No se puede cancelar si ya pasó la fecha
  const isPast = new Date(reservationDate + 'T00:00:00') < new Date(new Date().toDateString())
  if (isPast) return null

  async function handleCancel() {
    if (!confirm('¿Cancelar esta reserva? Si generó un cargo pendiente, será cancelado automáticamente.')) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('reservations').update({
      status: 'cancelled',
      cancelled_by: user?.id,
    }).eq('id', reservationId)
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors"
      style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = '#EF4444'
        e.currentTarget.style.color = '#EF4444'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.color = 'var(--text-secondary)'
      }}
    >
      <X size={12} />
      {loading ? '...' : 'Cancelar'}
    </button>
  )
}
