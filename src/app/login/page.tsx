'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Building2, Lock, Mail, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Correo o contraseña incorrectos.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel izquierdo — identidad del edificio */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ backgroundColor: 'var(--navy)' }}
      >
        <div className="flex items-center gap-3">
          <Building2 className="text-white" size={28} strokeWidth={1.5} />
          <span className="text-white font-semibold text-lg tracking-wide">
            Administración
          </span>
        </div>

        <div>
          <p className="text-blue-200 text-sm uppercase tracking-widest mb-4 font-medium">
            Plataforma condominial
          </p>
          <h1 className="text-white text-5xl font-light leading-tight mb-6">
            Todo lo que necesitas<br />
            <span className="font-semibold">para tu edificio,</span><br />
            en un solo lugar.
          </h1>
          <p className="text-blue-300 text-base leading-relaxed max-w-sm">
            Cuotas, pagos, reservas, reportes y comunicados. Diseñado para administrar con confianza y los vecinos de NIDUM estén siempre informados.
          </p>
        </div>

        <div className="flex gap-8">
          <div>
            <p className="text-white text-3xl font-semibold">68</p>
            <p className="text-blue-300 text-sm mt-1">Departamentos</p>
          </div>
          <div>
            <p className="text-white text-3xl font-semibold">24/7</p>
            <p className="text-blue-300 text-sm mt-1">Disponibilidad</p>
          </div>
          <div>
            <p className="text-white text-3xl font-semibold">100%</p>
            <p className="text-blue-300 text-sm mt-1">Seguro</p>
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex items-center justify-center p-8" style={{ backgroundColor: 'var(--bg-page)' }}>
        <div className="w-full max-w-sm">
          {/* Logo móvil */}
          <div className="flex lg:hidden items-center gap-2 mb-10">
            <Building2 size={24} strokeWidth={1.5} style={{ color: 'var(--navy)' }} />
            <span className="font-semibold text-base" style={{ color: 'var(--navy)' }}>
              Administración
            </span>
          </div>

          <h2 className="text-2xl font-semibold mb-1" style={{ color: 'var(--navy)' }}>
            Bienvenido
          </h2>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
            Ingresa con tu correo y contraseña
          </p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Correo electrónico
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-secondary)' }}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm outline-none transition-all"
                  style={{
                    borderColor: 'var(--border)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--blue-action)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Contraseña
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-secondary)' }}
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg border text-sm outline-none transition-all"
                  style={{
                    borderColor: 'var(--border)',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--blue-action)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
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
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity mt-2"
              style={{ backgroundColor: 'var(--blue-action)', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="text-xs text-center mt-8" style={{ color: 'var(--text-secondary)' }}>
            ¿Olvidaste tu contraseña? Contacta a la administración.
          </p>
        </div>
      </div>
    </div>
  )
}
