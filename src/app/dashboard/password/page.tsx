'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Lock, CheckCircle, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ChangePasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const [current, setCurrent] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (newPwd.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (newPwd !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)

    // Verificar contraseña actual intentando reautenticar
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      setError('No se pudo obtener tu sesión.')
      setLoading(false)
      return
    }

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    })

    if (signInErr) {
      setError('La contraseña actual es incorrecta.')
      setLoading(false)
      return
    }

    // Cambiar contraseña
    const { error: updateErr } = await supabase.auth.updateUser({
      password: newPwd,
    })

    if (updateErr) {
      setError('No se pudo actualizar la contraseña. Intenta de nuevo.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="max-w-sm mx-auto text-center py-16">
        <CheckCircle size={48} className="mx-auto mb-4 text-emerald-500" />
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--navy)' }}>
          Contraseña actualizada
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Tu contraseña se cambió correctamente. Úsala la próxima vez que inicies sesión.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: 'var(--blue-action)' }}
        >
          Volver al inicio
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-sm">
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
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--navy)' }}>
            Cambiar contraseña
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Ingresa tu contraseña actual y la nueva
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 flex flex-col gap-4" style={{ borderColor: 'var(--border)' }}>
        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
            Contraseña actual
          </label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="password"
              required
              value={current}
              onChange={e => setCurrent(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
            Nueva contraseña
          </label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="password"
              required
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
            Confirmar nueva contraseña
          </label>
          <div className="relative">
            <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="password"
              required
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repite la nueva contraseña"
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm outline-none"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
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
          className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity mt-1"
          style={{ backgroundColor: 'var(--blue-action)', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Actualizando...' : 'Cambiar contraseña'}
        </button>
      </form>
    </div>
  )
}

