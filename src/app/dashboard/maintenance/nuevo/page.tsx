'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ChevronLeft, AlertCircle, CheckCircle, Upload,
  Droplets, Zap, ArrowUpDown, Building2, Shield, Sparkles, Volume2, HelpCircle, Wrench,
} from 'lucide-react'

const ICONS: Record<string, any> = {
  Droplets, Zap, ArrowUpDown, Building2, Shield, Sparkles, Volume2, HelpCircle,
}

const LOCATIONS = [
  { value: 'unit',         label: 'En mi departamento' },
  { value: 'common_area',  label: 'Área común (gym, salón, etc.)' },
  { value: 'hallway',      label: 'Pasillo' },
  { value: 'parking',      label: 'Estacionamiento' },
  { value: 'outside',      label: 'Fachada / exterior' },
  { value: 'other',        label: 'Otro' },
]

export default function NewIncidentPage() {
  const router = useRouter()
  const supabase = createClient()

  const [categories, setCategories] = useState<any[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [locationType, setLocationType] = useState('')
  const [locationDetail, setLocationDetail] = useState('')
  const [priority, setPriority] = useState('medium')
  const [file, setFile] = useState<File | null>(null)
  const [unitId, setUnitId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: cats } = await supabase
        .from('incident_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (cats) setCategories(cats)

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: res } = await supabase
          .from('unit_residents')
          .select('unit_id')
          .eq('profile_id', user.id)
          .is('end_date', null)
          .maybeSingle()
        if (res) setUnitId(res.unit_id)
      }
    }
    load()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!categoryId || !title.trim() || !locationType) {
      setError('Completa categoría, título y ubicación.')
      return
    }
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Sesión inválida')
      setLoading(false)
      return
    }

    let photo_url: string | null = null

    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('incident-photos')
        .upload(path, file)
      if (uploadErr) {
        setError('No se pudo subir la foto: ' + uploadErr.message)
        setLoading(false)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from('incident-photos').getPublicUrl(path)
      photo_url = publicUrl
    }

    const { error: insertErr } = await supabase.from('incidents').insert({
      category_id: categoryId,
      reporter_id: user.id,
      unit_id: locationType === 'unit' ? unitId : unitId,
      title: title.trim(),
      description: description.trim() || null,
      location_type: locationType,
      location_detail: locationDetail.trim() || null,
      photo_url,
      priority,
      status: 'open',
    })

    if (insertErr) {
      setError(insertErr.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500" />
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--navy)' }}>
          ¡Reporte enviado!
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          La administración revisará tu reporte y te dará seguimiento. Puedes consultar el estado en cualquier momento.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push('/dashboard/maintenance')}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--blue-action)' }}
          >
            Ver mis reportes
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--border)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--navy)' }}>Reportar incidencia</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Describe el problema y la administración le dará seguimiento
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* Categoría */}
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--navy)' }}>1. Categoría *</p>
          <div className="grid grid-cols-2 gap-2">
            {categories.map(cat => {
              const Icon = ICONS[cat.icon] ?? Wrench
              const active = categoryId === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-left text-sm transition-all"
                  style={{
                    borderColor: active ? 'var(--blue-action)' : 'var(--border)',
                    backgroundColor: active ? 'rgba(37,99,235,0.05)' : 'transparent',
                    color: active ? 'var(--blue-action)' : 'var(--text-primary)',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  <Icon size={15} />
                  {cat.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Detalles */}
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--navy)' }}>2. Descripción</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Título corto *
              </label>
              <input
                required
                placeholder="ej. Fuga en el pasillo del piso 3"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                style={{ borderColor: 'var(--border)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Descripción detallada
              </label>
              <textarea
                placeholder="Explica con más detalle lo que está pasando..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none resize-none"
                style={{ borderColor: 'var(--border)' }}
              />
            </div>
          </div>
        </div>

        {/* Ubicación */}
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--navy)' }}>3. Ubicación *</p>
          <select
            required
            value={locationType}
            onChange={e => setLocationType(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none mb-3"
            style={{ borderColor: 'var(--border)' }}
          >
            <option value="">¿Dónde está el problema?</option>
            {LOCATIONS.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
          {locationType && locationType !== 'unit' && (
            <input
              placeholder="Especifica la ubicación (ej. piso 3 cerca del elevador A)"
              value={locationDetail}
              onChange={e => setLocationDetail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          )}
        </div>

        {/* Foto */}
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--navy)' }}>4. Foto (opcional pero recomendado)</p>
          <label
            className="flex flex-col items-center justify-center w-full h-28 rounded-lg border-2 border-dashed cursor-pointer transition-colors"
            style={{
              borderColor: file ? 'var(--blue-action)' : 'var(--border)',
              backgroundColor: file ? 'rgba(37,99,235,0.04)' : 'var(--bg-page)',
            }}
          >
            <Upload size={18} style={{ color: file ? 'var(--blue-action)' : 'var(--text-secondary)' }} />
            <span className="text-xs mt-1.5" style={{ color: file ? 'var(--blue-action)' : 'var(--text-secondary)' }}>
              {file ? file.name : 'Adjuntar foto del problema'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        {/* Prioridad */}
        <div className="bg-white rounded-xl border p-5" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--navy)' }}>5. Prioridad</p>
          <div className="flex gap-2">
            {[
              { v: 'low',    l: 'Baja',  color: '#10B981' },
              { v: 'medium', l: 'Media', color: '#F59E0B' },
              { v: 'high',   l: 'Alta',  color: '#EF4444' },
            ].map(p => {
              const active = priority === p.v
              return (
                <button
                  key={p.v}
                  type="button"
                  onClick={() => setPriority(p.v)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all"
                  style={{
                    borderColor: active ? p.color : 'var(--border)',
                    backgroundColor: active ? `${p.color}15` : 'transparent',
                    color: active ? p.color : 'var(--text-secondary)',
                  }}
                >
                  {p.l}
                </button>
              )
            })}
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
            Reserva "Alta" para emergencias que afectan a varios vecinos o ponen en riesgo el edificio.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity"
          style={{ backgroundColor: 'var(--blue-action)', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Enviando reporte...' : 'Enviar reporte'}
        </button>
      </form>
    </div>
  )
}
