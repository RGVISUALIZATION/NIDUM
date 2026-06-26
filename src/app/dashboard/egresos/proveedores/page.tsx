'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Vendor {
  id: string
  name: string
  service: string | null
  contact_name: string | null
  phone: string | null
  rfc: string | null
  is_active: boolean
  notes: string | null
}

const EMPTY_FORM = {
  name: '',
  service: '',
  contact_name: '',
  phone: '',
  rfc: '',
  notes: '',
}

export default function ProveedoresPage() {
  const supabase = createClient()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchVendors() }, [])

  async function fetchVendors() {
    setLoading(true)
    const { data } = await supabase
      .from('vendors')
      .select('*')
      .order('name')
    setVendors(data || [])
    setLoading(false)
  }

  function openNew() {
    setForm({ ...EMPTY_FORM })
    setEditId(null)
    setError('')
    setShowForm(true)
  }

  function openEdit(v: Vendor) {
    setForm({
      name: v.name,
      service: v.service || '',
      contact_name: v.contact_name || '',
      phone: v.phone || '',
      rfc: v.rfc || '',
      notes: v.notes || '',
    })
    setEditId(v.id)
    setError('')
    setShowForm(true)
  }

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSave() {
    setError('')
    if (!form.name.trim()) return setError('El nombre del proveedor es obligatorio.')

    setSaving(true)
    const payload = {
      name: form.name.trim(),
      service: form.service.trim() || null,
      contact_name: form.contact_name.trim() || null,
      phone: form.phone.trim() || null,
      rfc: form.rfc.trim().toUpperCase() || null,
      notes: form.notes.trim() || null,
    }

    const { error: dbError } = editId
      ? await supabase.from('vendors').update(payload).eq('id', editId)
      : await supabase.from('vendors').insert(payload)

    if (dbError) {
      setError('Error al guardar: ' + dbError.message)
    } else {
      setShowForm(false)
      await fetchVendors()
    }
    setSaving(false)
  }

  async function toggleActive(v: Vendor) {
    await supabase.from('vendors').update({ is_active: !v.is_active }).eq('id', v.id)
    await fetchVendors()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Empresas y personas que prestan servicios al edificio
          </p>
        </div>
        <button
          onClick={openNew}
          className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition"
        >
          + Nuevo proveedor
        </button>
      </div>

      {/* Formulario inline */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">
            {editId ? 'Editar proveedor' : 'Nuevo proveedor'}
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Nombre *</label>
              <input
                type="text"
                placeholder="Empresa o persona"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Servicio que presta</label>
              <input
                type="text"
                placeholder="Ej. Vigilancia, Jardinería..."
                value={form.service}
                onChange={e => set('service', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Contacto</label>
              <input
                type="text"
                placeholder="Nombre del representante"
                value={form.contact_name}
                onChange={e => set('contact_name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Teléfono</label>
              <input
                type="text"
                placeholder="10 dígitos"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">RFC</label>
              <input
                type="text"
                placeholder="Para validar facturas"
                value={form.rfc}
                onChange={e => set('rfc', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Notas</label>
              <input
                type="text"
                placeholder="Observaciones opcionales"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar proveedor'}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Cargando proveedores...</div>
        ) : vendors.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-500 text-sm">Aún no hay proveedores registrados.</p>
            <button
              onClick={openNew}
              className="mt-3 text-sm text-gray-900 underline"
            >
              Agrega el primero
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Proveedor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Servicio</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contacto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">RFC</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vendors.map(v => (
                <tr key={v.id} className={`hover:bg-gray-50 transition ${!v.is_active ? 'opacity-40' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-900">{v.name}</td>
                  <td className="px-4 py-3 text-gray-500">{v.service || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {v.contact_name || '—'}
                    {v.phone && <span className="block text-xs text-gray-400">{v.phone}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{v.rfc || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      v.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {v.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => openEdit(v)}
                        className="text-xs text-gray-500 hover:text-gray-900 transition"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleActive(v)}
                        className="text-xs text-gray-400 hover:text-gray-600 transition"
                      >
                        {v.is_active ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
