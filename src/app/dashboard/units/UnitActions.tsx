'use client'

import { MoreVertical } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export default function UnitActions({ unitId, unitNumber }: { unitId: string; unitNumber: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg transition-colors"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-page)')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-8 w-44 rounded-xl border bg-white shadow-lg z-10 py-1"
          style={{ borderColor: 'var(--border)' }}
        >
          <a
            href={`/dashboard/units/${unitId}/edit`}
            className="flex items-center px-4 py-2.5 text-sm transition-colors"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-page)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
          >
            Editar depto {unitNumber}
          </a>
          <a
            href={`/dashboard/charges?unit=${unitId}`}
            className="flex items-center px-4 py-2.5 text-sm transition-colors"
            style={{ color: 'var(--text-primary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-page)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
          >
            Ver cargos
          </a>
        </div>
      )}
    </div>
  )
}
