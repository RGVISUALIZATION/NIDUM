import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Profile } from '@/lib/types'
import CotizacionesClient from './CotizacionesClient'

export default async function CotizacionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const isAdmin = (profile as Profile).role === 'admin'

  let unitNumber: string | null = null

  if (!isAdmin) {
    const { data: residency } = await supabase
      .from('unit_residents')
      .select('unit_id, units(unit_number)')
      .eq('profile_id', user.id)
      .is('end_date', null)
      .single()

    unitNumber = (residency?.units as any)?.unit_number ?? null
  }

  return <CotizacionesClient isAdmin={isAdmin} unitNumber={unitNumber} />
}
