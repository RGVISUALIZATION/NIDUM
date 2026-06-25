import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Construction } from 'lucide-react'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Construction size={40} style={{ color: 'var(--text-secondary)', opacity: 0.3 }} />
      <h1 className="text-xl font-semibold" style={{ color: 'var(--navy)' }}>
        En construcción
      </h1>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Esta sección estará lista en la siguiente iteración.
      </p>
      <a href="/dashboard" className="text-sm font-medium" style={{ color: 'var(--blue-action)' }}>
        ← Volver al inicio
      </a>
    </div>
  )
}
