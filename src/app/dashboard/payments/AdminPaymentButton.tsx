'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import AdminPaymentForm from './AdminPaymentForm'

export default function AdminPaymentButton() {
  const [show, setShow] = useState(false)

  return (
    <div>
      <button
        onClick={() => setShow(!show)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
        style={{ backgroundColor: 'var(--blue-action)' }}
      >
        <Plus size={16} />
        Registrar pago
      </button>
      {show && (
        <div className="fixed inset-0 z-30 flex items-start justify-center pt-24 px-4" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
          <div className="w-full max-w-lg">
            <AdminPaymentForm onClose={() => setShow(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
