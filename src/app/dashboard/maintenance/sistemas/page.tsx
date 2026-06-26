import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import SystemsManager from './SystemsManager'

export default async function SystemsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard/maintenance')

  const { data: systems } = await supabase
    .from('maintenance_systems')
    .select('*')
    .order('display_order')

  return (
    <div className="max-w-3xl">
      <a
        href="/dashboard/maintenance"
        className="inline-flex items-center gap-1 text-sm font-medium mb-6"
        style={{ color: 'var(--text-secondary)' }}
      >
        <ChevronLeft size={16} />
        Volver a mantenimiento
      </a>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--navy)' }}>Tablero del edificio</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Edita el estado y los detalles que ven todos los vecinos
        </p>
      </div>

      <SystemsManager initial={systems ?? []} />
    </div>
  )
}
