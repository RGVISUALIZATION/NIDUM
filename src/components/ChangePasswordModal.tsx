'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { KeyRound, Lock, AlertCircle, CheckCircle } from 'lucide-react'

interface ChangePasswordModalProps {
  open: boolean
  onClose: () => void
}

export default function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const supabase = createClient()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  function reset() {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess(false)
    setLoading(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Todos los campos son obligatorios')
      return
    }
    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      setError('No se pudo obtener el usuario actual')
      setLoading(false)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (signInError) {
      setError('La contraseña actual es incorrecta')
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })
    if (updateError) {
      setError('Error al actualizar la contraseña. Intenta de nuevo.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(handleClose, 2000)
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-sm rounded-xl shadow-xl p-6"
        style={{ backgroundColor: 'var(--bg-card)' }}
        onClick={e => e.stopPropagation()}
      >
        {success ? (
          <div className="text-center py-4">
            <CheckCircle size={36} className="mx-auto mb-3 text-emerald-500" />
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Contraseña actualizada correctamente
            </p>
            <button
              onClick={handleClose}
              className="mt-4 text-sm font-medium"
              style={{ color: 'var(--blue-action)' }}
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-5">
              <KeyRound size={20} style={{ color: 'var(--navy)' }} />
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                Cambiar contraseña
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Contraseña actual
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm outline-none"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Nueva contraseña
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm outline-none"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                  Confirmar nueva contraseña
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm outline-none"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                  <AlertCircle size={15} />{error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--blue-action)' }}
              >
                {loading ? 'Actualizando...' : 'Cambiar contraseña'}
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="w-full py-2 text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                Cancelar
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
