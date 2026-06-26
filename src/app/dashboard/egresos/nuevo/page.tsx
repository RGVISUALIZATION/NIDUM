'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Category {
  id: string
  name: string
  nature: string
  billing_frequency: string
}

interface Vendor {
  id: string
  name: string
  service: string
}

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]

const now = new Date()

export default function NuevoGastoPage() {
  const supabase = createClient()
  const router = useRouter()
  const params = useSearchParams()

  const [categories, setCategories] = useState<Category[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    category_id: params.get('categoria') || '',
    vendor_id: '',
    period_year: now.getFullYear(),
    period_month: now.getMonth() + 1,
    expense_date: now.toISOString().split('T')[0],
    amount: '',
    payment_method: 'transferencia',
    reference: '',
    invoice_number: '',
    invoice_url: '',
    status: 'pagado',
    notes: '',
  })

  useEffect(() => {
    async function load() {
      const [{ data: cats }, { data: vens }] = await Promise.all([
        supabase.from('expense_categories').select('id,name,nature,billing_frequency').eq('is_active', true).order('name'),
        supabase.from('vendors').select('id,name,service').eq('is_active', true).order('name'),
      ])
      setCategories(cats || [])
      setVendors(vens || [])
    }
    load()
  }, [])

  function set(field: string, value: string | number) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    const ext = file.name.split('.').pop()
    const path = `facturas/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(path, file)

    if (uploadError) {
      setError('Error al subir el archivo: ' + uploadError.message)
    } else {
      set('invoice_url', path)
    }
    setUploadingFile(false)
  }

  async function handleSubmit() {
    setError('')

    if (!form.category_id) return setError('Selecciona una partida de gasto.')
    if (!form.vendor_id) return setError('Selecciona un proveedor.')
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      return setError('Ingresa un monto válido.')
    if (!form.expense_date) return setError('Ingresa la fecha del gasto.')

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    const { error: insertError } = await supabase.from('expenses').insert({
      category_id: form.category_id,
      vendor_id: form.vendor_id,
      period_year: form.period_year,
      period_month: form.period_month,
      expense_date: form.expense_date,
      amount: Number(form.amount),
      payment_method: form.payment_method,
      reference: form.reference || null,
      invoice_number: form.invoice_number || null,
      invoice_url: form.invoice_url || null,
      status: form.status,
      notes: form.notes || null,
      created_by: user?.id,
    })

    if (insertError) {
      setError('Error al guardar: ' + insertError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard/egresos')
  }

  const selectedCat = categories.find(c => c.id === form.category_id)

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 flex items-center gap-1 transition"
        >
          ← Regresar
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Registrar gasto</h1>
        <p className="text-sm text-gray-500 mt-0.5">Captura el gasto con su comprobante fiscal</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">

        {/* Partida */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Partida de gasto *</label>
          <select
            value={form.category_id}
            onChange={e => set('category_id', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="">Selecciona una partida</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {selectedCat && (
            <p className="text-xs text-gray-400 mt-1">
              {selectedCat.nature} · {selectedCat.billing_frequency}
            </p>
          )}
        </div>

        {/* Proveedor */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Proveedor *</label>
          <div className="flex gap-2">
            <select
              value={form.vendor_id}
              onChange={e => set('vendor_id', e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="">Selecciona un proveedor</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name}{v.service ? ` — ${v.service}` : ''}
                </option>
              ))}
            </select>
            <a
              href="/dashboard/egresos/proveedores"
              className="px-3 py-2.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition whitespace-nowrap"
            >
              + Nuevo
            </a>
          </div>
        </div>

        {/* Período */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Mes del período *</label>
            <select
              value={form.period_month}
              onChange={e => set('period_month', Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Año *</label>
            <select
              value={form.period_year}
              onChange={e => set('period_year', Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              {[2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Fecha y monto */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Fecha del pago *</label>
            <input
              type="date"
              value={form.expense_date}
              onChange={e => set('expense_date', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Monto (MXN) *</label>
            <input
              type="number"
              placeholder="0.00"
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>

        {/* Método de pago y referencia */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Método de pago *</label>
            <select
              value={form.payment_method}
              onChange={e => set('payment_method', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Referencia / Folio SPEI</label>
            <input
              type="text"
              placeholder="Ej. 2024061500001"
              value={form.reference}
              onChange={e => set('reference', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>

        {/* Factura */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Número de factura / CFDI</label>
          <input
            type="text"
            placeholder="Ej. A-0001 o UUID fiscal"
            value={form.invoice_number}
            onChange={e => set('invoice_number', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        {/* Archivo de factura */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Factura (PDF, XML o imagen)</label>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-lg p-5 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition"
          >
            {uploadingFile ? (
              <p className="text-sm text-gray-400">Subiendo archivo...</p>
            ) : form.invoice_url ? (
              <p className="text-sm text-emerald-600 font-medium">✓ Archivo subido correctamente</p>
            ) : (
              <>
                <p className="text-sm text-gray-500">Haz clic para seleccionar archivo</p>
                <p className="text-xs text-gray-400 mt-1">PDF, XML, JPG o PNG · máx. 10 MB</p>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.xml,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* Estado */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Estado</label>
          <select
            value={form.status}
            onChange={e => set('status', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="pagado">Pagado</option>
            <option value="pendiente">Pendiente de pago</option>
          </select>
        </div>

        {/* Notas */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Notas internas</label>
          <textarea
            rows={2}
            placeholder="Observaciones opcionales..."
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
          />
        </div>

      </div>

      {/* Botones */}
      <div className="flex gap-3">
        <button
          onClick={() => router.back()}
          className="flex-1 py-3 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || uploadingFile}
          className="flex-1 py-3 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Guardar gasto'}
        </button>
      </div>

    </div>
  )
}
