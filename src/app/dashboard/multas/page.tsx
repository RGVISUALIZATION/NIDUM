'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatMXN, formatDate } from '@/lib/utils'
import { Gavel, Plus, ImageOff } from 'lucide-react'

interface Fine {
  id: string
  unit_id: string
  unit_number: string
  penalty_name: string
  description: string | null
  incident_date: string
  evidence_paths: string[]
  amount: number
  paid_amount: number
  balance: number
  status: string
  due_date: string
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Pendiente', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  partial:   { label: 'Parcial',   cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  paid:      { label: 'Pagada',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Cancelada', cls: 'bg-gray-50 text-gray-500 border-gray-200' },
}

export default function MultasPage() {
  const supabase = createClient()
  const [fines, setFines] = useState<Fine[]>([])
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [month, setMonth] = useState('')   // 'YYYY-MM' o ''
  const [unit, setUnit] = useState('')     // unit_number o ''

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        setIsAdmin(p?.role === 'admin')
      }
      const { data } = await supabase
        .from('fines_view')
        .select('*')
        .order('incident_date', { ascending: false })
      const rows = (data ?? []).map(r => ({
        ...r,
        amount: Number(r.amount),
        paid_amount: Number(r.paid_amount),
        balance: Number(r.balance),
      })) as Fine[]
      setFines(rows)

      const paths = rows.flatMap(r => r.evidence_paths ?? [])
      if (paths.length > 0) {
        const { data: signed } = await supabase.storage.from('fine-evidence').createSignedUrls(paths, 3600)
        const map: Record<string, string> = {}
        signed?.forEach(s => { if (s.path && s.signedUrl) map[s.path] = s.signedUrl })
        setUrls(map)
      }
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() => fines.filter(f =>
    (!month || f.incident_date.startsWith(month)) &&
    (!unit || f.unit_number === unit)
  ), [fines, month, unit])

  const totals = useMemo(() => {
    const active = filtered.filter(f => f.status !== 'cancelled')
    return {
      count: active.length,
      total: active.reduce((s, f) => s + f.amount, 0),
      paid: active.reduce((s, f) => s + f.paid_amount, 0),
      pending: active.reduce((s, f) => s + f.balance, 0),
    }
  }, [filtered])

  const unitOptions = useMemo(
    () => Array.from(new Set(fines.map(f => f.unit_number))).sort((a, b) => Number(a) - Number(b)),
    [fines]
  )

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--navy)' }}>Multas</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {isAdmin ? 'Sanciones registradas con su evidencia' : 'Multas de tu departamento'}
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/dashboard/charges/multa"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--blue-action)' }}
          >
            <Plus size={16} /> Nueva multa
          </Link>
        )}
      </div>

      {/* Totales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Multas', value: String(totals.count) },
          { label: 'Total multado', value: formatMXN(totals.total) },
          { label: 'Cobrado', value: formatMXN(totals.paid) },
          { label: 'Pendiente', value: formatMXN(totals.pending) },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border p-4" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{k.label}</p>
            <p className="text-xl font-semibold mt-1" style={{ color: 'var(--navy)' }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm bg-white"
          style={{ borderColor: 'var(--border)' }}
        />
        {isAdmin && (
          <select
            value={unit}
            onChange={e => setUnit(e.target.value)}
            className="px-3 py-2 rounded-lg border text-sm bg-white"
            style={{ borderColor: 'var(--border)' }}
          >
            <option value="">Todos los deptos</option>
            {unitOptions.map(u => <option key={u} value={u}>Depto {u}</option>)}
          </select>
        )}
        {(month || unit) && (
          <button onClick={() => { setMonth(''); setUnit('') }} className="text-sm underline" style={{ color: 'var(--text-secondary)' }}>
            Limpiar
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Cargando...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border p-10 text-center" style={{ borderColor: 'var(--border)' }}>
          <Gavel size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Sin multas registradas</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(f => {
            const st = STATUS_LABEL[f.status] ?? STATUS_LABEL.pending
            return (
              <div key={f.id} className="bg-white rounded-xl border p-4 flex gap-4" style={{ borderColor: 'var(--border)' }}>
                <div className="flex gap-2 shrink-0">
                  {f.evidence_paths?.length ? f.evidence_paths.map(p => (
                    urls[p] ? (
                      <a key={p} href={urls[p]} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={urls[p]} alt="Evidencia" className="w-20 h-20 object-cover rounded-lg border" style={{ borderColor: 'var(--border)' }} />
                      </a>
                    ) : null
                  )) : (
                    <div className="w-20 h-20 rounded-lg border flex items-center justify-center" style={{ borderColor: 'var(--border)' }}>
                      <ImageOff size={18} className="opacity-30" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium" style={{ color: 'var(--navy)' }}>
                        Depto {f.unit_number} · {f.penalty_name}
                      </p>
                      {f.description && (
                        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{f.description}</p>
                      )}
                      <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                        Hecho: {formatDate(f.incident_date)} · Vence: {formatDate(f.due_date)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold" style={{ color: 'var(--navy)' }}>{formatMXN(f.amount)}</p>
                      <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                      {f.status === 'partial' && (
                        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Resta {formatMXN(f.balance)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
