'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { X, Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { formatMXN } from '@/lib/utils'

interface Unit { id: string; unit_number: string }

export default function AdminPaymentForm({ onClose }: { onClose: () => void }) {
  const supabase = createClient()
  const router = useRouter()
  const [units, setUnits] = useState<Unit[]>([])
  const [unitId, setUnitId] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('units').select('id, unit_number').eq('status', 'active').order('unit_number')
      if (data) setUnits(data)
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!unitId || !amount) { setError('Selecciona departamento y monto.'); return }
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Usuario no autenticado.'); setLoading(false); return }
    
    let receipt_url: string | null = null

    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('payment-receipts').upload(path, file)
      if (upErr) { setError('Error al subir comprobante.'); setLoading(false); return }
      const { data: { publicUrl } } = supabase.storage.from('payment-receipts').getPublicUrl(path)
      receipt_url = publicUrl
    }

    // Crear pago directamente como verificado
    const { error: insertErr } = await supabase.from('payments').insert({
      unit_id: unitId,
      amount: parseFloat(amount),
      payment_date: paymentDate,
      reference: reference.trim() || null,
      notes: notes.trim() || null,
      receipt_url,
      status: 'verified',
      submitted_by: user.id,
      verified_by: user.id,
      verified_at: new Date().toISOString(),
    })

    if (insertErr) { setError(insertErr.message); setLoading(false); return }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => { router.refresh(); onClose() }, 1500)
  }

  if (success) {
    return (
      <div className="rounded-xl border-2 bg-white p-6 mb-6 text-center" style={{ borderColor: '#10B981' }}>
        <CheckCircle size={36} className="mx-auto mb-3 text-emerald-500" />
        <p className="font-semibold" style={{ color: 'var(--navy)' }}>Pago registrado y verificado</p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Se aplicó automáticamente a los cargos pendientes del departamento.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border-2 bg-white p-6 mb-6" style={{ borderColor: 'var(--blue-action)' }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold" style={{ color: 'var(--navy)' }}>Registrar pago de vecino</h2>
        <button onClick={onClose} style={{ color: 'var(--text-secondary)' }}><X size={18} /></button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Departamento *</label>
            <select required value={unitId} onChange={e => setUnitId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={{ borderColor: 'var(--border)' }}>
              <option value="">Seleccionar...</option>
              {units.map(u => <option key={u.id} value={u.id}>Depto {u.unit_number}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Monto *</label>
            <input required type="number" step="0.01" min="1" placeholder="0.00" value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={{ borderColor: 'var(--border)' }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Fecha de pago *</label>
            <input required type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={{ borderColor: 'var(--border)' }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Referencia</label>
            <input placeholder="No. de transferencia" value={reference} onChange={e => setReference(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={{ borderColor: 'var(--border)' }} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Comprobante (imagen o PDF)</label>
          <label className="flex flex-col items-center justify-center w-full h-20 rounded-lg border-2 border-dashed cursor-pointer"
            style={{ borderColor: file ? 'var(--blue-action)' : 'var(--border)', backgroundColor: file ? 'rgba(37,99,235,0.04)' : 'var(--bg-page)' }}>
            <Upload size={16} style={{ color: file ? 'var(--blue-action)' : 'var(--text-secondary)' }} />
            <span className="text-xs mt-1" style={{ color: file ? 'var(--blue-action)' : 'var(--text-secondary)' }}>
              {file ? file.name : 'Adjuntar comprobante'}
            </span>
            <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Notas</label>
          <input placeholder="Pago recibido por WhatsApp, etc." value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none" style={{ borderColor: 'var(--border)' }} />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle size={15} />{error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border text-sm font-medium"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>Cancelar</button>
          <button type="submit" disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: 'var(--blue-action)' }}>
            {loading ? 'Registrando...' : 'Registrar y verificar pago'}
          </button>
        </div>
      </form>
    </div>
  )
}
