'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react'
import { formatMXN } from '@/lib/utils'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

interface Area {
  id: string
  name: string
  slug: string
  capacity: number
  cleaning_fee: number
  cleaning_fee_min_guests: number | null
  open_time: string
  close_time: string
  rules: string
}

export default function NewReservationPage() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createClient()

  const [areas, setAreas] = useState<Area[]>([])
  const [selectedArea, setSelectedArea] = useState<Area | null>(null)
  const [unitId, setUnitId] = useState<string | null>(null)
  const [occupiedDates, setOccupiedDates] = useState<string[]>([])
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [startTime, setStartTime] = useState('14:00')
  const [endTime, setEndTime] = useState('20:00')
  const [guestCount, setGuestCount] = useState(10)
  const [eventType, setEventType] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: areasData } = await supabase.from('common_areas').select('*').eq('is_active', true).order('name')
      if (areasData) {
        setAreas(areasData)
        const preselected = params.get('area')
        const found = areasData.find(a => a.id === preselected)
        if (found) setSelectedArea(found)
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: res } = await supabase
          .from('unit_residents')
          .select('unit_id')
          .eq('profile_id', user.id)
          .is('end_date', null)
          .single()
        if (res) setUnitId(res.unit_id)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedArea) return
    async function loadOccupied() {
      const firstDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).toISOString().split('T')[0]
      const lastDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).toISOString().split('T')[0]
      const { data } = await supabase
        .from('reservations')
        .select('reservation_date')
        .eq('area_id', selectedArea!.id)
        .eq('status', 'confirmed')
        .gte('reservation_date', firstDay)
        .lte('reservation_date', lastDay)
      setOccupiedDates(data?.map(r => r.reservation_date) ?? [])
    }
    loadOccupied()
  }, [selectedArea, calendarDate])

  // Calcular cuota estimada
  const estimatedFee = selectedArea
    ? (selectedArea.cleaning_fee_min_guests === null || guestCount >= selectedArea.cleaning_fee_min_guests)
      ? selectedArea.cleaning_fee
      : 0
    : 0

  // Construir calendario
  function buildCalendar() {
    const year = calendarDate.getFullYear()
    const month = calendarDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const cells: (number | null)[] = Array(firstDay).fill(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    return { cells, year, month, today }
  }

  const { cells, year, month, today } = buildCalendar()

  function prevMonth() {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1))
    setSelectedDate(null)
  }
  function nextMonth() {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1))
    setSelectedDate(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDate || !selectedArea || !unitId) {
      setError('Selecciona un área y una fecha.')
      return
    }
    if (startTime >= endTime) {
      setError('La hora de inicio debe ser antes de la hora de fin.')
      return
    }
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    const { error: err } = await supabase.from('reservations').insert({
      area_id: selectedArea.id,
      unit_id: unitId,
      profile_id: user!.id,
      reservation_date: selectedDate,
      start_time: startTime,
      end_time: endTime,
      guest_count: guestCount,
      event_type: eventType || null,
      notes: notes || null,
      status: 'confirmed',
    })

    if (err) {
      setError(err.message.includes('ya está reservada') ? 'Ese horario ya está ocupado. Elige otro.' : err.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500" />
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--navy)' }}>¡Reserva confirmada!</h2>
        <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
          {selectedArea?.name} · {selectedDate && new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        {estimatedFee > 0 && (
          <p className="text-sm mb-6 font-medium text-amber-700">
            Se generó un cargo de {formatMXN(estimatedFee)} por limpieza en tu estado de cuenta.
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push('/dashboard/reservations')}
            className="px-4 py-2 rounded-lg text-sm font-medium border"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Ver mis reservas
          </button>
          <button
            onClick={() => { setSuccess(false); setSelectedDate(null) }}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: 'var(--blue-action)' }}
          >
            Nueva reserva
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
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
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--navy)' }}>Nueva reserva</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Selecciona el área, fecha y horario</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* Selección de área */}
        <div className="rounded-xl border bg-white p-5" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--navy)' }}>1. Selecciona el área</p>
          <div className="grid grid-cols-2 gap-3">
            {areas.map(area => (
              <button
                key={area.id}
                type="button"
                onClick={() => { setSelectedArea(area); setSelectedDate(null) }}
                className="p-4 rounded-xl border-2 text-left transition-all"
                style={{
                  borderColor: selectedArea?.id === area.id ? 'var(--blue-action)' : 'var(--border)',
                  backgroundColor: selectedArea?.id === area.id ? 'rgba(37,99,235,0.05)' : 'transparent',
                }}
              >
                <p className="font-semibold text-sm" style={{ color: 'var(--navy)' }}>{area.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Hasta {area.capacity} personas
                </p>
                <p className="text-xs mt-1 font-medium" style={{ color: 'var(--blue-action)' }}>
                  {area.cleaning_fee_min_guests
                    ? `${formatMXN(area.cleaning_fee)} con ${area.cleaning_fee_min_guests}+ personas`
                    : `${formatMXN(area.cleaning_fee)} siempre`}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Calendario */}
        {selectedArea && (
          <div className="rounded-xl border bg-white p-5" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--navy)' }}>2. Selecciona la fecha</p>

            <div className="flex items-center justify-between mb-4">
              <button type="button" onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100">
                <ChevronLeft size={18} style={{ color: 'var(--text-secondary)' }} />
              </button>
              <p className="font-semibold text-sm" style={{ color: 'var(--navy)' }}>
                {MESES[month]} {year}
              </p>
              <button type="button" onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100">
                <ChevronRight size={18} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {DIAS.map(d => (
                <div key={d} className="text-center text-xs font-medium py-1" style={{ color: 'var(--text-secondary)' }}>
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (!day) return <div key={i} />
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const cellDate = new Date(dateStr + 'T00:00:00')
                const isPast = cellDate < today
                const isOccupied = occupiedDates.includes(dateStr)
                const isSelected = selectedDate === dateStr

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={isPast || isOccupied}
                    onClick={() => setSelectedDate(dateStr)}
                    className="aspect-square rounded-lg text-sm font-medium transition-all flex items-center justify-center"
                    style={{
                      backgroundColor: isSelected
                        ? 'var(--blue-action)'
                        : isOccupied
                        ? '#FEE2E2'
                        : isPast
                        ? 'transparent'
                        : 'transparent',
                      color: isSelected
                        ? '#fff'
                        : isOccupied
                        ? '#EF4444'
                        : isPast
                        ? '#CBD5E1'
                        : 'var(--text-primary)',
                      cursor: isPast || isOccupied ? 'not-allowed' : 'pointer',
                    }}
                    onMouseEnter={e => {
                      if (!isPast && !isOccupied && !isSelected)
                        e.currentTarget.style.backgroundColor = 'var(--bg-page)'
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    {day}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-red-100 border border-red-300" />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Ocupado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--blue-action)' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Seleccionado</span>
              </div>
            </div>
          </div>
        )}

        {/* Horario y detalles */}
        {selectedDate && (
          <div className="rounded-xl border bg-white p-5" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm font-semibold mb-4" style={{ color: 'var(--navy)' }}>3. Horario y detalles</p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Hora inicio</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  min={selectedArea?.open_time.slice(0,5)}
                  max={selectedArea?.close_time.slice(0,5)}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Hora fin</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  min={startTime}
                  max={selectedArea?.close_time.slice(0,5)}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Número de personas
                </label>
                <input
                  type="number"
                  min={1}
                  max={selectedArea?.capacity}
                  value={guestCount}
                  onChange={e => setGuestCount(parseInt(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Tipo de evento
                </label>
                <input
                  placeholder="Cumpleaños, reunión..."
                  value={eventType}
                  onChange={e => setEventType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                  style={{ borderColor: 'var(--border)' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>Notas</label>
              <textarea
                placeholder="Información adicional para la administración..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none resize-none"
                style={{ borderColor: 'var(--border)' }}
              />
            </div>

            {/* Resumen de costo */}
            <div
              className="mt-4 p-3 rounded-lg"
              style={{ backgroundColor: estimatedFee > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)' }}
            >
              <p className="text-sm font-medium" style={{ color: estimatedFee > 0 ? '#92400E' : '#065F46' }}>
                {estimatedFee > 0
                  ? `Se generará un cargo de ${formatMXN(estimatedFee)} por limpieza`
                  : '✓ Sin cargo de limpieza para este evento'}
              </p>
              {selectedArea?.cleaning_fee_min_guests && guestCount < selectedArea.cleaning_fee_min_guests && (
                <p className="text-xs mt-0.5" style={{ color: '#065F46' }}>
                  Con menos de {selectedArea.cleaning_fee_min_guests} personas no aplica cuota de limpieza
                </p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        {selectedDate && (
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity"
            style={{ backgroundColor: 'var(--blue-action)', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Reservando...' : `Confirmar reserva${estimatedFee > 0 ? ` · ${formatMXN(estimatedFee)}` : ''}`}
          </button>
        )}
      </form>
    </div>
  )
}
