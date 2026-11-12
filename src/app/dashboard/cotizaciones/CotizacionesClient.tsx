'use client'

import { useState } from 'react'
import { FileText, Download, Calculator, Paintbrush, ChevronDown } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Static data: unit -> monthly fee                                   */
/* ------------------------------------------------------------------ */
const UNITS: Record<string, { tipo: string; cuota: number }> = {
  '101': { tipo: 'NOGAL', cuota: 1589.41 },
  '102': { tipo: 'CEDRO', cuota: 1719.42 },
  '103': { tipo: 'CEDRO', cuota: 1719.93 },
  '201': { tipo: 'NOGAL', cuota: 1589.41 },
  '202': { tipo: 'CEDRO', cuota: 1719.42 },
  '203': { tipo: 'CEDRO', cuota: 1719.93 },
  '301': { tipo: 'NOGAL', cuota: 1589.41 },
  '302': { tipo: 'CEDRO', cuota: 1719.00 },
  '303': { tipo: 'CEDRO', cuota: 1719.93 },
  '401': { tipo: 'CEDRO', cuota: 1718.73 },
  '402': { tipo: 'CEDRO', cuota: 1720.11 },
  '403': { tipo: 'CEDRO', cuota: 1718.73 },
  '404': { tipo: 'CEDRO', cuota: 1719.93 },
  '501': { tipo: 'CEDRO', cuota: 1718.73 },
  '502': { tipo: 'CEDRO', cuota: 1718.73 },
  '503': { tipo: 'CEDRO', cuota: 1718.73 },
  '504': { tipo: 'CEDRO', cuota: 1719.93 },
  '601': { tipo: 'CEDRO', cuota: 1718.73 },
  '602': { tipo: 'CEDRO', cuota: 1720.11 },
  '603': { tipo: 'CEDRO', cuota: 1718.73 },
  '604': { tipo: 'CEDRO', cuota: 1719.93 },
  '701': { tipo: 'CEDRO', cuota: 1718.73 },
  '702': { tipo: 'CEDRO', cuota: 1720.11 },
  '703': { tipo: 'LOFT', cuota: 1734.78 },
  '704': { tipo: 'LOFT', cuota: 1735.99 },
  '801': { tipo: 'CEDRO', cuota: 1718.73 },
  '802': { tipo: 'CEDRO', cuota: 1720.11 },
  '803': { tipo: 'LOFT', cuota: 869.81 },
  '804': { tipo: 'LOFT', cuota: 870.33 },
  '901': { tipo: 'CEDRO', cuota: 1718.73 },
  '902': { tipo: 'CEDRO', cuota: 1720.11 },
  '903': { tipo: 'LOFT', cuota: 869.81 },
  '904': { tipo: 'LOFT', cuota: 870.33 },
  '1001': { tipo: 'CEDRO', cuota: 1718.73 },
  '1002': { tipo: 'CEDRO', cuota: 1720.11 },
  '1003': { tipo: 'ROBLE', cuota: 1954.74 },
  '1004': { tipo: 'ENCINO', cuota: 1484.09 },
  '1101': { tipo: 'CEDRO', cuota: 1718.73 },
  '1102': { tipo: 'CEDRO', cuota: 1720.11 },
  '1103': { tipo: 'ROBLE', cuota: 1954.74 },
  '1104': { tipo: 'ENCINO', cuota: 1484.09 },
  '1201': { tipo: 'CEDRO', cuota: 1718.73 },
  '1202': { tipo: 'CEDRO', cuota: 1720.11 },
  '1203': { tipo: 'ROBLE', cuota: 1954.74 },
  '1204': { tipo: 'ENCINO', cuota: 1484.09 },
  '1301': { tipo: 'CEDRO', cuota: 1718.21 },
  '1302': { tipo: 'CEDRO', cuota: 1720.11 },
  '1303': { tipo: 'ROBLE', cuota: 1954.22 },
  '1304': { tipo: 'ENCINO', cuota: 1484.09 },
  '1401': { tipo: 'ROBLE', cuota: 1953.53 },
  '1402': { tipo: 'ENCINO', cuota: 1484.09 },
  '1501': { tipo: 'NOGAL', cuota: 1578.19 },
  '1502': { tipo: 'ROBLE', cuota: 1953.53 },
  '1503': { tipo: 'ENCINO', cuota: 1484.09 },
  '1601': { tipo: 'NOGAL', cuota: 1578.19 },
  '1602': { tipo: 'ROBLE', cuota: 1953.53 },
  '1603': { tipo: 'ENCINO', cuota: 1484.09 },
  '1701': { tipo: 'NOGAL', cuota: 1578.19 },
  '1702': { tipo: 'ROBLE', cuota: 1953.53 },
  '1703': { tipo: 'ENCINO', cuota: 1484.09 },
  '1801': { tipo: 'NOGAL', cuota: 1578.19 },
  '1802': { tipo: 'ROBLE', cuota: 1953.53 },
  '1803': { tipo: 'ENCINO', cuota: 1484.09 },
  '1901': { tipo: 'NOGAL', cuota: 1578.19 },
  '1902': { tipo: 'CEDRO', cuota: 1717.69 },
  '1903': { tipo: 'CEDRO', cuota: 1720.11 },
  '2001': { tipo: 'NOGAL', cuota: 1578.53 },
  '2002': { tipo: 'PENTHOUSE', cuota: 3142.22 },
}

const TOTAL_CUOTAS = Object.values(UNITS).reduce((s, u) => s + u.cuota, 0)

/* ------------------------------------------------------------------ */
/*  Quotation definitions                                              */
/* ------------------------------------------------------------------ */
interface Cotizacion {
  id: string
  nombre: string
  descripcion: string
  montoConIva: number
  logo: string
  color: string
  pdfCotizacion: string
  pdfAportacion: string
}

const COTIZACIONES: Cotizacion[] = [
  {
    id: 'vertical',
    nombre: 'Vertical Access México',
    descripcion: 'Pintura impermeabilizante de muros lisos y sellado de ventanas — 4,170 m²',
    montoConIva: 1356230.62,
    logo: '/cotizaciones/logo-vertical-access.png',
    color: '#DC2626',
    pdfCotizacion: '/cotizaciones/cotizacion-vertical-access.pdf',
    pdfAportacion: '/cotizaciones/aportacion-vertical-access.pdf',
  },
  {
    id: 'resepi',
    nombre: 'RESEPI',
    descripcion: 'Pintura exterior — Construcciones y Acabados',
    montoConIva: 1505143.15,
    logo: '/cotizaciones/logo-resepi.png',
    color: '#EAB308',
    pdfCotizacion: '/cotizaciones/cotizacion-resepi.pdf',
    pdfAportacion: '/cotizaciones/aportacion-resepi.pdf',
  },
  {
    id: 'imperhousing',
    nombre: 'ImperHousing',
    descripcion: 'Mantenimiento mayor de fachadas — 7,262 m²',
    montoConIva: 1800697.14,
    logo: '/cotizaciones/logo-imperhousing.png',
    color: '#16A34A',
    pdfCotizacion: '/cotizaciones/cotizacion-imperhousing.pdf',
    pdfAportacion: '/cotizaciones/aportacion-imperhousing.pdf',
  },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatMXN(n: number) {
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function calcAportacion(cuota: number, montoConIva: number) {
  return montoConIva * (cuota / TOTAL_CUOTAS)
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function CotizacionesClient({
  isAdmin,
  unitNumber,
}: {
  isAdmin: boolean
  unitNumber: string | null
}) {
  const [selectedUnit, setSelectedUnit] = useState<string>(unitNumber ?? '')
  const [showMensual, setShowMensual] = useState(false)

  const currentUnit = UNITS[selectedUnit]
  const allUnits = Object.keys(UNITS).sort((a, b) => Number(a) - Number(b))

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--navy)' }}>
          <Paintbrush className="inline mr-2 -mt-1" size={22} />
          Cotizaciones — Pintura Exterior
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Comparativo de presupuestos para el mantenimiento de fachadas de Torre NIDUM
        </p>
      </div>

      {/* Unit selector (admin) or auto-detected (resident) */}
      <div
        className="rounded-xl p-4 mb-6 border"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Calculator size={18} style={{ color: 'var(--navy)' }} />
            <span className="font-medium text-sm" style={{ color: 'var(--navy)' }}>
              {isAdmin ? 'Selecciona departamento:' : 'Tu departamento:'}
            </span>
          </div>

          {isAdmin ? (
            <div className="relative">
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="appearance-none rounded-lg border pl-3 pr-8 py-2 text-sm font-medium focus:outline-none focus:ring-2"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--navy)',
                  backgroundColor: 'var(--bg-page)',
                }}
              >
                <option value="">— Seleccionar —</option>
                {allUnits.map((u) => (
                  <option key={u} value={u}>
                    Depto {u} — {UNITS[u].tipo}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--text-muted)' }}
              />
            </div>
          ) : (
            <span
              className="font-semibold text-lg"
              style={{ color: 'var(--navy)' }}
            >
              {selectedUnit ? `Depto ${selectedUnit} — ${currentUnit?.tipo}` : 'No asignado'}
            </span>
          )}

          {currentUnit && (
            <label className="flex items-center gap-2 ml-auto cursor-pointer select-none">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Pago único
              </span>
              <button
                onClick={() => setShowMensual(!showMensual)}
                className="relative w-10 h-5 rounded-full transition-colors"
                style={{ backgroundColor: showMensual ? 'var(--navy)' : '#d1d5db' }}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform"
                  style={{ transform: showMensual ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                6 meses
              </span>
            </label>
          )}
        </div>
      </div>

      {/* Quotation cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {COTIZACIONES.map((cot) => {
          const aportacion = currentUnit
            ? calcAportacion(currentUnit.cuota, cot.montoConIva)
            : null

          return (
            <div
              key={cot.id}
              className="rounded-xl border overflow-hidden"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}
            >
              {/* Color bar + logo */}
              <div
                className="flex items-center justify-center py-4 px-4"
                style={{ backgroundColor: cot.color + '0D' }}
              >
                <img
                  src={cot.logo}
                  alt={cot.nombre}
                  className="h-10 object-contain"
                />
              </div>

              <div className="p-4">
                {/* Provider name */}
                <h3
                  className="font-semibold text-sm mb-1"
                  style={{ color: 'var(--navy)' }}
                >
                  {cot.nombre}
                </h3>
                <p
                  className="text-xs mb-3 leading-relaxed"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {cot.descripcion}
                </p>

                {/* Total del presupuesto */}
                <div
                  className="rounded-lg p-3 mb-3"
                  style={{ backgroundColor: 'var(--bg-page)' }}
                >
                  <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>
                    Presupuesto total (IVA incluido)
                  </p>
                  <p className="text-lg font-bold" style={{ color: 'var(--navy)' }}>
                    {formatMXN(cot.montoConIva)}
                  </p>
                </div>

                {/* Per-unit contribution */}
                {currentUnit && aportacion !== null && (
                  <div
                    className="rounded-lg p-3 mb-3 border-2"
                    style={{ borderColor: cot.color + '40', backgroundColor: cot.color + '08' }}
                  >
                    <p className="text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>
                      Tu aportación — Depto {selectedUnit}
                    </p>
                    <p className="text-xl font-bold" style={{ color: cot.color }}>
                      {showMensual
                        ? `${formatMXN(aportacion / 6)} /mes`
                        : formatMXN(aportacion)}
                    </p>
                    {showMensual && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        6 pagos · Total: {formatMXN(aportacion)}
                      </p>
                    )}
                  </div>
                )}

                {!currentUnit && (
                  <div
                    className="rounded-lg p-3 mb-3 text-center"
                    style={{ backgroundColor: 'var(--bg-page)' }}
                  >
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {isAdmin
                        ? 'Selecciona un departamento para ver la aportación'
                        : 'No se encontró tu departamento'}
                    </p>
                  </div>
                )}

                {/* Download links */}
                <div className="flex flex-col gap-2 mt-3">
                  <a
                    href={cot.pdfCotizacion}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-colors hover:bg-gray-50"
                    style={{ borderColor: 'var(--border)', color: 'var(--navy)' }}
                  >
                    <FileText size={14} />
                    Ver cotización original
                  </a>
                  <a
                    href={cot.pdfAportacion}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border transition-colors hover:bg-gray-50"
                    style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
                  >
                    <Download size={14} />
                    Descargar tabla de aportaciones
                  </a>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <div
        className="mt-6 rounded-lg p-4 text-xs leading-relaxed"
        style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', borderLeft: '3px solid var(--navy)' }}
      >
        <strong>Nota:</strong> La aportación de cada departamento se calcula de forma proporcional
        a su cuota mensual de mantenimiento respecto al total de cuotas del edificio. Los montos
        incluyen IVA. La opción a 6 meses es sin recargo adicional.
      </div>
    </div>
  )
}
