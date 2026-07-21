'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState, useCallback } from 'react'
import {
  Search,
  Download,
  FileText,
  FileSpreadsheet,
  Eye,
  ChevronDown,
  Building2,
  Calendar,
  Filter,
  X,
  Loader2,
  Upload,
  FileCheck,
  Trash2,
} from 'lucide-react'

/* ───────── types ───────── */

interface UnitOwner {
  unit_id: string
  unit_number: string
  owner_name: string | null
  owner_phone: string | null
  owner_email: string | null
}

interface Payment {
  id: string
  unit_id: string
  amount: number
  payment_date: string
  reference: string | null
  receipt_url: string | null
  status: string
  notes: string | null
  created_at: string
  units: { unit_number: string }
  payment_billing_periods?: { billing_periods: { period_year: number; period_month: number } }[]
}

interface Charge {
  id: string
  unit_id: string
  amount: number
  paid_amount: number
  status: string
  description: string | null
  due_date: string
  billing_period_id: string | null
  fee_concepts: { name: string; code: string } | null
  billing_periods: { period_year: number; period_month: number } | null
}

interface BillingPeriod {
  id: string
  period_year: number
  period_month: number
  status: string
}

type ViewMode = 'period' | 'unit'

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const STATUS_LABELS: Record<string, string> = {
  verified: 'Verificado',
  pending: 'Pendiente',
  rejected: 'Rechazado',
}

const STATUS_COLORS: Record<string, string> = {
  verified: '#16a34a',
  pending: '#ca8a04',
  rejected: '#dc2626',
}

/* ───────── helpers ───────── */

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/* ───────── component ───────── */

export default function AccountingClient() {
  const supabase = createClient()

  // data
  const [owners, setOwners] = useState<UnitOwner[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [charges, setCharges] = useState<Charge[]>([])
  const [periods, setPeriods] = useState<BillingPeriod[]>([])

  // filters
  const [viewMode, setViewMode] = useState<ViewMode>('period')
  const [selectedUnit, setSelectedUnit] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // invoices
  const [invoices, setInvoices] = useState<Record<string, { pdf?: string; xml?: string }>>({})
  const [uploadingPaymentId, setUploadingPaymentId] = useState<string | null>(null)

  // ui
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  /* ── fetch base data ── */
  useEffect(() => {
    async function load() {
      setLoading(true)
      const [ownersRes, periodsRes] = await Promise.all([
        supabase.rpc('get_unit_owners_with_email'),
        supabase.from('billing_periods').select('*').order('period_year', { ascending: false }).order('period_month', { ascending: false }),
      ])
      if (ownersRes.data) setOwners(ownersRes.data)
      if (periodsRes.data) setPeriods(periodsRes.data)
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── fetch payments & charges on filter change ── */
  const fetchData = useCallback(async () => {
    setLoading(true)

    if (viewMode === 'period') {
      // Payments in the selected month/year
      const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
      const endDay = new Date(selectedYear, selectedMonth, 0).getDate()
      const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`

      let payQ = supabase
        .from('payments')
        .select('*, units(unit_number), payment_billing_periods(billing_periods(period_year, period_month))')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .order('payment_date', { ascending: false })

      if (statusFilter !== 'all') {
        payQ = payQ.eq('status', statusFilter)
      }

      const { data: payData } = await payQ
      if (payData) {
        setPayments(payData as unknown as Payment[])
        const payIds = payData.map((p: any) => p.id)
        if (payIds.length > 0) {
          const { data: invData } = await supabase
            .from('payment_invoices')
            .select('payment_id, file_type, file_path')
            .in('payment_id', payIds)
          if (invData) {
            const map: Record<string, { pdf?: string; xml?: string }> = {}
            invData.forEach((inv: any) => {
              if (!map[inv.payment_id]) map[inv.payment_id] = {}
              map[inv.payment_id][inv.file_type as 'pdf' | 'xml'] = inv.file_path
            })
            setInvoices(map)
          }
        } else {
          setInvoices({})
        }
      }

      // Charges for this billing period
      const matchingPeriod = periods.find(
        p => p.period_year === selectedYear && p.period_month === selectedMonth
      )
      if (matchingPeriod) {
        const { data: chargeData } = await supabase
          .from('charges')
          .select('*, fee_concepts(name, code), billing_periods(period_year, period_month)')
          .eq('billing_period_id', matchingPeriod.id)
        if (chargeData) setCharges(chargeData as unknown as Charge[])
      } else {
        setCharges([])
      }

    } else {
      // Unit history mode
      if (!selectedUnit) {
        setPayments([])
        setCharges([])
        setLoading(false)
        return
      }

      let payQ = supabase
        .from('payments')
        .select('*, units(unit_number), payment_billing_periods(billing_periods(period_year, period_month))')
        .eq('unit_id', selectedUnit)
        .order('payment_date', { ascending: false })

      if (statusFilter !== 'all') {
        payQ = payQ.eq('status', statusFilter)
      }

      const { data: payData } = await payQ
      if (payData) {
        setPayments(payData as unknown as Payment[])
        const payIds = payData.map((p: any) => p.id)
        if (payIds.length > 0) {
          const { data: invData } = await supabase
            .from('payment_invoices')
            .select('payment_id, file_type, file_path')
            .in('payment_id', payIds)
          if (invData) {
            const map: Record<string, { pdf?: string; xml?: string }> = {}
            invData.forEach((inv: any) => {
              if (!map[inv.payment_id]) map[inv.payment_id] = {}
              map[inv.payment_id][inv.file_type as 'pdf' | 'xml'] = inv.file_path
            })
            setInvoices(map)
          }
        } else {
          setInvoices({})
        }
      }

      const { data: chargeData } = await supabase
        .from('charges')
        .select('*, fee_concepts(name, code), billing_periods(period_year, period_month)')
        .eq('unit_id', selectedUnit)
        .order('due_date', { ascending: false })
      if (chargeData) setCharges(chargeData as unknown as Charge[])
    }

    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, selectedUnit, selectedYear, selectedMonth, statusFilter, periods])

  useEffect(() => {
    if (periods.length > 0 || viewMode === 'unit') {
      fetchData()
    }
  }, [fetchData, periods, viewMode])

  /* ── computed ── */

  const ownerMap = new Map(owners.map(o => [o.unit_id, o]))

  const filteredPayments = payments.filter(p => {
    if (!searchTerm) return true
    const owner = ownerMap.get(p.unit_id)
    const term = searchTerm.toLowerCase()
    return (
      p.units?.unit_number?.toLowerCase().includes(term) ||
      owner?.owner_name?.toLowerCase().includes(term) ||
      p.reference?.toLowerCase().includes(term)
    )
  })

  const totalCobrado = filteredPayments
    .filter(p => p.status === 'verified')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const totalPendiente = charges
    .filter(c => c.status !== 'paid')
    .reduce((sum, c) => sum + (Number(c.amount) - Number(c.paid_amount)), 0)

  const totalCargos = charges.reduce((sum, c) => sum + Number(c.amount), 0)

  /* ── invoice upload / delete ── */
  async function handleInvoiceUpload(paymentId: string, unitId: string, file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'pdf' && ext !== 'xml') return
    setUploadingPaymentId(paymentId)

    const path = `${unitId}/${paymentId}/factura.${ext}`
    const { error: upErr } = await supabase.storage.from('invoices').upload(path, file, { upsert: true })
    if (upErr) { setUploadingPaymentId(null); return }

    const { data: { user } } = await supabase.auth.getUser()

    await supabase.from('payment_invoices').upsert({
      payment_id: paymentId,
      file_type: ext,
      file_path: path,
      file_name: file.name,
      uploaded_by: user?.id ?? null,
    }, { onConflict: 'payment_id,file_type' })

    setInvoices(prev => ({
      ...prev,
      [paymentId]: { ...prev[paymentId], [ext]: path },
    }))
    setUploadingPaymentId(null)
  }

  async function handleInvoiceDelete(paymentId: string, fileType: 'pdf' | 'xml') {
    const path = invoices[paymentId]?.[fileType]
    if (!path) return

    await supabase.storage.from('invoices').remove([path])
    await supabase.from('payment_invoices').delete().eq('payment_id', paymentId).eq('file_type', fileType)

    setInvoices(prev => {
      const copy = { ...prev }
      if (copy[paymentId]) {
        const entry = { ...copy[paymentId] }
        delete entry[fileType]
        if (Object.keys(entry).length === 0) delete copy[paymentId]
        else copy[paymentId] = entry
      }
      return copy
    })
  }

  /* ── export CSV ── */
  async function exportCSV() {
    setExporting(true)
    const header = 'Unidad,Propietario,Teléfono,Email,Fecha Pago,Monto,Referencia,Estado,Concepto\n'
    const rows = filteredPayments.map(p => {
      const owner = ownerMap.get(p.unit_id)
      // Try to find matching concept from charges
      const unitCharges = charges.filter(c => c.unit_id === p.unit_id)
      const concept = unitCharges.length > 0 ? unitCharges[0]?.fee_concepts?.name || 'Cuota' : 'Cuota'
      return [
        p.units?.unit_number || '',
        owner?.owner_name || '',
        owner?.owner_phone || '',
        owner?.owner_email || '',
        p.payment_date,
        p.amount,
        p.reference || '',
        STATUS_LABELS[p.status] || p.status,
        concept,
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    }).join('\n')

    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const label = viewMode === 'period'
      ? `pagos_${MONTHS[selectedMonth - 1]}_${selectedYear}`
      : `pagos_depto_${owners.find(o => o.unit_id === selectedUnit)?.unit_number || 'all'}`
    a.download = `${label}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  /* ── export PDF (simple printable HTML) ── */
  async function exportPDF() {
    setExporting(true)
    const title = viewMode === 'period'
      ? `Reporte de Pagos — ${MONTHS[selectedMonth - 1]} ${selectedYear}`
      : `Historial de Pagos — Depto ${owners.find(o => o.unit_id === selectedUnit)?.unit_number || ''}`

    const rowsHtml = filteredPayments.map(p => {
      const owner = ownerMap.get(p.unit_id)
      return `<tr>
        <td>${p.units?.unit_number || ''}</td>
        <td>${owner?.owner_name || ''}</td>
        <td>${owner?.owner_phone || ''}</td>
        <td>${owner?.owner_email || ''}</td>
        <td>${formatDate(p.payment_date)}</td>
        <td style="text-align:right">${formatCurrency(Number(p.amount))}</td>
        <td>${p.reference || ''}</td>
        <td>${STATUS_LABELS[p.status] || p.status}</td>
      </tr>`
    }).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <title>${title}</title>
      <style>
        body{font-family:system-ui,sans-serif;padding:40px;font-size:12px;color:#1a1a1a}
        h1{font-size:18px;margin-bottom:4px}
        .meta{color:#666;margin-bottom:20px;font-size:11px}
        table{width:100%;border-collapse:collapse;margin-top:12px}
        th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
        th{background:#f5f5f5;font-weight:600}
        .summary{margin-top:20px;display:flex;gap:30px}
        .summary div{padding:10px 16px;background:#f9f9f9;border-radius:6px}
        .summary .label{font-size:10px;color:#888;text-transform:uppercase}
        .summary .value{font-size:16px;font-weight:700}
        @media print{body{padding:20px}}
      </style>
    </head><body>
      <h1>${title}</h1>
      <p class="meta">Generado: ${new Date().toLocaleString('es-MX')} — NIDUM Residencial</p>
      <div class="summary">
        <div><div class="label">Total Cobrado</div><div class="value">${formatCurrency(totalCobrado)}</div></div>
        <div><div class="label">Total Pendiente</div><div class="value">${formatCurrency(totalPendiente)}</div></div>
        <div><div class="label">Pagos</div><div class="value">${filteredPayments.length}</div></div>
      </div>
      <table>
        <thead><tr><th>Unidad</th><th>Propietario</th><th>Teléfono</th><th>Email</th><th>Fecha</th><th>Monto</th><th>Referencia</th><th>Estado</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </body></html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      win.print()
    }
    setExporting(false)
  }

  /* ── unique years from periods ── */
  const years = [...new Set(periods.map(p => p.period_year))].sort((a, b) => b - a)
  if (years.length === 0) years.push(new Date().getFullYear())

  /* ───────── render ───────── */
  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Contabilidad
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Consulta y descarga de pagos, comprobantes y saldos
        </p>
      </div>

      {/* View mode toggle */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => { setViewMode('period'); setSelectedUnit('') }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            backgroundColor: viewMode === 'period' ? 'var(--navy)' : 'var(--bg-secondary)',
            color: viewMode === 'period' ? '#fff' : 'var(--text-secondary)',
          }}
        >
          <Calendar size={15} />
          Por Período
        </button>
        <button
          onClick={() => setViewMode('unit')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            backgroundColor: viewMode === 'unit' ? 'var(--navy)' : 'var(--bg-secondary)',
            color: viewMode === 'unit' ? '#fff' : 'var(--text-secondary)',
          }}
        >
          <Building2 size={15} />
          Por Departamento
        </button>
      </div>

      {/* Filters bar */}
      <div
        className="rounded-xl p-4 mb-5 flex flex-wrap items-end gap-3"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
      >
        {viewMode === 'period' ? (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Año</label>
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="appearance-none rounded-lg px-3 py-2 pr-8 text-sm"
                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-secondary)' }} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Mes</label>
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="appearance-none rounded-lg px-3 py-2 pr-8 text-sm"
                  style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                >
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-secondary)' }} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-1 min-w-[200px]">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Departamento</label>
            <div className="relative">
              <select
                value={selectedUnit}
                onChange={e => setSelectedUnit(e.target.value)}
                className="appearance-none rounded-lg px-3 py-2 pr-8 text-sm w-full"
                style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                <option value="">Seleccionar...</option>
                {owners.map(o => (
                  <option key={o.unit_id} value={o.unit_id}>
                    {o.unit_number} — {o.owner_name || 'Sin propietario'}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-secondary)' }} />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Estado</label>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none rounded-lg px-3 py-2 pr-8 text-sm"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <option value="all">Todos</option>
              <option value="verified">Verificado</option>
              <option value="pending">Pendiente</option>
              <option value="rejected">Rechazado</option>
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-secondary)' }} />
          </div>
        </div>

        {/* Search */}
        <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
          <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Buscar</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Unidad, propietario, referencia..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="rounded-lg pl-8 pr-8 py-2 text-sm w-full"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X size={14} style={{ color: 'var(--text-secondary)' }} />
              </button>
            )}
          </div>
        </div>

        {/* Export buttons */}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={exportCSV}
            disabled={exporting || filteredPayments.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
            style={{ backgroundColor: '#16a34a', color: '#fff' }}
          >
            <FileSpreadsheet size={14} />
            CSV
          </button>
          <button
            onClick={exportPDF}
            disabled={exporting || filteredPayments.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40"
            style={{ backgroundColor: '#dc2626', color: '#fff' }}
          >
            <FileText size={14} />
            PDF
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>Cobrado</p>
          <p className="text-xl font-bold" style={{ color: '#16a34a' }}>{formatCurrency(totalCobrado)}</p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>Pendiente</p>
          <p className="text-xl font-bold" style={{ color: '#dc2626' }}>{formatCurrency(totalPendiente)}</p>
        </div>
        <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>Total Cargos</p>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalCargos)}</p>
        </div>
      </div>

      {/* Payments table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
        </div>
      ) : filteredPayments.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
        >
          <Filter size={32} className="mx-auto mb-3" style={{ color: 'var(--text-secondary)' }} />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {viewMode === 'unit' && !selectedUnit
              ? 'Selecciona un departamento para ver su historial'
              : 'No se encontraron pagos con los filtros seleccionados'}
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Unidad</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Propietario</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>Teléfono</th>
                  <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>Email</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Fecha</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Monto</th>
                  <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>Referencia</th>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Periodo</th>
                  <th className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Estado</th>
                  <th className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Comprobante</th>
                  <th className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Factura</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p, i) => {
                  const owner = ownerMap.get(p.unit_id)
                  return (
                    <tr
                      key={p.id}
                      style={{
                        backgroundColor: i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                        borderTop: '1px solid var(--border)',
                      }}
                    >
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                        {p.units?.unit_number}
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--text-primary)' }}>
                        {owner?.owner_name || '—'}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>
                        {owner?.owner_phone || '—'}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {owner?.owner_email || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
                        {formatDate(p.payment_date)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums" style={{ color: 'var(--text-primary)' }}>
                        {formatCurrency(Number(p.amount))}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>
                        {p.reference || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {p.payment_billing_periods && p.payment_billing_periods.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {p.payment_billing_periods.map((pbp, idx) => (
                              <span key={idx} className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: 'rgba(37,99,235,0.08)', color: 'var(--blue-action, #2563eb)' }}>
                                {MONTHS[pbp.billing_periods.period_month - 1]?.slice(0, 3)} {pbp.billing_periods.period_year}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${STATUS_COLORS[p.status]}15`,
                            color: STATUS_COLORS[p.status],
                          }}
                        >
                          {STATUS_LABELS[p.status] || p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {p.receipt_url ? (
                          <a
                            href={p.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-all"
                            style={{ color: 'var(--navy)', backgroundColor: 'rgba(30,58,138,0.08)' }}
                          >
                            <Eye size={13} />
                            Ver
                          </a>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {uploadingPaymentId === p.id ? (
                          <Loader2 size={14} className="animate-spin mx-auto" style={{ color: 'var(--text-secondary)' }} />
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            {invoices[p.id]?.pdf && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: '#dc262615', color: '#dc2626' }}>
                                <FileCheck size={10} />PDF
                                <button onClick={() => handleInvoiceDelete(p.id, 'pdf')} className="ml-0.5 hover:opacity-70"><Trash2 size={9} /></button>
                              </span>
                            )}
                            {invoices[p.id]?.xml && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: '#16a34a15', color: '#16a34a' }}>
                                <FileCheck size={10} />XML
                                <button onClick={() => handleInvoiceDelete(p.id, 'xml')} className="ml-0.5 hover:opacity-70"><Trash2 size={9} /></button>
                              </span>
                            )}
                            <label className="cursor-pointer inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded transition-all"
                              style={{ backgroundColor: 'rgba(37,99,235,0.08)', color: 'var(--blue-action)' }}>
                              <Upload size={10} />Subir
                              <input type="file" accept=".pdf,.xml" className="hidden"
                                onChange={e => {
                                  const f = e.target.files?.[0]
                                  if (f) handleInvoiceUpload(p.id, p.unit_id, f)
                                  e.target.value = ''
                                }} />
                            </label>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Table footer with totals */}
          <div
            className="flex items-center justify-between px-4 py-3 text-sm"
            style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>
              {filteredPayments.length} pago{filteredPayments.length !== 1 ? 's' : ''}
            </span>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Total: {formatCurrency(filteredPayments.reduce((s, p) => s + Number(p.amount), 0))}
            </span>
          </div>
        </div>
      )}

      {/* Balance detail by unit (when in period mode) */}
      {viewMode === 'period' && charges.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Saldos del Período — {MONTHS[selectedMonth - 1]} {selectedYear}
          </h2>
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid var(--border)' }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Unidad</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Propietario</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Concepto</th>
                    <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Cargo</th>
                    <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Pagado</th>
                    <th className="text-right px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Saldo</th>
                    <th className="text-center px-4 py-3 font-semibold" style={{ color: 'var(--text-secondary)' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {charges
                    .sort((a, b) => {
                      const unitA = owners.find(o => o.unit_id === a.unit_id)?.unit_number || ''
                      const unitB = owners.find(o => o.unit_id === b.unit_id)?.unit_number || ''
                      return unitA.localeCompare(unitB, undefined, { numeric: true })
                    })
                    .map((c, i) => {
                      const owner = ownerMap.get(c.unit_id)
                      const balance = Number(c.amount) - Number(c.paid_amount)
                      return (
                        <tr
                          key={c.id}
                          style={{
                            backgroundColor: i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                            borderTop: '1px solid var(--border)',
                          }}
                        >
                          <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>
                            {owner?.unit_number || '—'}
                          </td>
                          <td className="px-4 py-2.5" style={{ color: 'var(--text-primary)' }}>
                            {owner?.owner_name || '—'}
                          </td>
                          <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>
                            {c.fee_concepts?.name || c.description || '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>
                            {formatCurrency(Number(c.amount))}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: '#16a34a' }}>
                            {formatCurrency(Number(c.paid_amount))}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-medium" style={{ color: balance > 0 ? '#dc2626' : '#16a34a' }}>
                            {formatCurrency(balance)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span
                              className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{
                                backgroundColor: c.status === 'paid' ? '#16a34a15' : c.status === 'partial' ? '#ca8a0415' : '#dc262615',
                                color: c.status === 'paid' ? '#16a34a' : c.status === 'partial' ? '#ca8a04' : '#dc2626',
                              }}
                            >
                              {c.status === 'paid' ? 'Pagado' : c.status === 'partial' ? 'Parcial' : 'Pendiente'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
