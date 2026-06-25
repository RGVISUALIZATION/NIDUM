import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Profile } from '@/lib/types'
import { formatMXN, formatDate, CHARGE_STATUS_COLOR, CHARGE_STATUS_LABEL, PAYMENT_STATUS_COLOR, PAYMENT_STATUS_LABEL } from '@/lib/utils'
import Badge from '@/components/Badge'
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2,
} from 'lucide-react'

export default async function DashboardPage() {
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

  if (isAdmin) {
    return <AdminDashboard supabase={supabase} profile={profile as Profile} />
  } else {
    return <ResidentDashboard supabase={supabase} profile={profile as Profile} userId={user.id} />
  }
}

async function AdminDashboard({ supabase, profile }: { supabase: any; profile: Profile }) {
  // Metricas generales
  const [
    { count: totalUnits },
    { data: pendingPayments },
    { data: recentCharges },
    { data: openPeriod },
  ] = await Promise.all([
    supabase.from('units').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('payments').select('id, unit_id, amount, payment_date, status, units(unit_number)').eq('status', 'pending_review').order('created_at', { ascending: false }).limit(5),
    supabase.from('charges').select('id, amount, paid_amount, due_date, status, units(unit_number), fee_concepts(name)').in('status', ['pending', 'partial']).order('due_date').limit(8),
    supabase.from('billing_periods').select('*').eq('status', 'open').single(),
  ])

  // Totales de cargos
  const { data: chargeSummary } = await supabase
    .from('charges')
    .select('status, amount, paid_amount')
    .neq('status', 'cancelled')

  const totalPending = chargeSummary?.filter((c: any) => c.status === 'pending').reduce((s: number, c: any) => s + Number(c.amount), 0) ?? 0
  const totalCollected = chargeSummary?.filter((c: any) => c.status === 'paid').reduce((s: number, c: any) => s + Number(c.paid_amount), 0) ?? 0
  const pendingReviewCount = pendingPayments?.length ?? 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--navy)' }}>
          Buenos días, {profile.full_name.split(' ')[0]} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {openPeriod ? `Periodo activo: ${MESES[openPeriod.period_month - 1]} ${openPeriod.period_year} · Vence ${formatDate(openPeriod.due_date)}` : 'No hay periodo abierto'}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Departamentos activos"
          value={String(totalUnits ?? 0)}
          icon={<Building2 size={18} />}
          accent="#2563EB"
        />
        <StatCard
          label="Por cobrar"
          value={formatMXN(totalPending)}
          icon={<AlertTriangle size={18} />}
          accent="#F59E0B"
        />
        <StatCard
          label="Cobrado"
          value={formatMXN(totalCollected)}
          icon={<TrendingUp size={18} />}
          accent="#10B981"
        />
        <StatCard
          label="Pagos por revisar"
          value={String(pendingReviewCount)}
          icon={<Clock size={18} />}
          accent={pendingReviewCount > 0 ? '#EF4444' : '#10B981'}
          urgent={pendingReviewCount > 0}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pagos pendientes de revisión */}
        <div className="rounded-xl border bg-white p-5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--navy)' }}>
              Pagos por verificar
            </h2>
            {pendingReviewCount > 0 && (
              <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                {pendingReviewCount} pendientes
              </span>
            )}
          </div>
          {pendingPayments && pendingPayments.length > 0 ? (
            <div className="flex flex-col gap-2">
              {pendingPayments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Depto {p.units?.unit_number}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(p.payment_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>
                      {formatMXN(p.amount)}
                    </p>
                    <Badge label="En revisión" colorClass={PAYMENT_STATUS_COLOR['pending_review']} />
                  </div>
                </div>
              ))}
              <a href="/dashboard/payments" className="text-xs font-medium mt-1 block text-center py-2 rounded-lg transition-colors" style={{ color: 'var(--blue-action)' }}>
                Ver todos los pagos →
              </a>
            </div>
          ) : (
            <EmptyState icon={<CheckCircle size={28} />} text="No hay pagos pendientes de revisión" />
          )}
        </div>

        {/* Cargos vencidos / próximos */}
        <div className="rounded-xl border bg-white p-5" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--navy)' }}>
            Cargos sin liquidar
          </h2>
          {recentCharges && recentCharges.length > 0 ? (
            <div className="flex flex-col gap-2">
              {recentCharges.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Depto {c.units?.unit_number} · {c.fee_concepts?.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Vence {formatDate(c.due_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>
                      {formatMXN(c.amount - c.paid_amount)}
                    </p>
                    <Badge label={CHARGE_STATUS_LABEL[c.status as keyof typeof CHARGE_STATUS_LABEL]} colorClass={CHARGE_STATUS_COLOR[c.status as keyof typeof CHARGE_STATUS_COLOR]} />
                  </div>
                </div>
              ))}
              <a href="/dashboard/charges" className="text-xs font-medium mt-1 block text-center py-2 rounded-lg" style={{ color: 'var(--blue-action)' }}>
                Ver todos los cargos →
              </a>
            </div>
          ) : (
            <EmptyState icon={<CheckCircle size={28} />} text="No hay cargos pendientes" />
          )}
        </div>
      </div>
    </div>
  )
}

async function ResidentDashboard({ supabase, profile, userId }: { supabase: any; profile: Profile; userId: string }) {
  const { data: residency } = await supabase
    .from('unit_residents')
    .select('unit_id, units(unit_number, floor, monthly_fee)')
    .eq('profile_id', userId)
    .is('end_date', null)
    .single()

  const unitId = residency?.unit_id

  const [{ data: charges }, { data: payments }] = await Promise.all([
    unitId
      ? supabase.from('charges').select('*, fee_concepts(name)').eq('unit_id', unitId).order('due_date', { ascending: false }).limit(6)
      : { data: [] },
    unitId
      ? supabase.from('payments').select('*').eq('unit_id', unitId).order('created_at', { ascending: false }).limit(5)
      : { data: [] },
  ])

  const pendingAmount = charges?.filter((c: any) => ['pending', 'partial'].includes(c.status)).reduce((s: number, c: any) => s + (Number(c.amount) - Number(c.paid_amount)), 0) ?? 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--navy)' }}>
          Hola, {profile.full_name.split(' ')[0]} 👋
        </h1>
        {residency?.units && (
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Depto {residency.units.unit_number} · Piso {residency.units.floor} · Cuota mensual {formatMXN(residency.units.monthly_fee)}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard
          label="Por pagar"
          value={formatMXN(pendingAmount)}
          icon={<AlertTriangle size={18} />}
          accent={pendingAmount > 0 ? '#F59E0B' : '#10B981'}
          urgent={pendingAmount > 0}
        />
        <StatCard
          label="Últimos pagos"
          value={String(payments?.length ?? 0)}
          icon={<CheckCircle size={18} />}
          accent="#2563EB"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-5" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--navy)' }}>Mis cargos</h2>
          {charges && charges.length > 0 ? (
            <div className="flex flex-col gap-2">
              {charges.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.fee_concepts?.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Vence {formatDate(c.due_date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>{formatMXN(c.amount)}</p>
                    <Badge label={CHARGE_STATUS_LABEL[c.status as keyof typeof CHARGE_STATUS_LABEL]} colorClass={CHARGE_STATUS_COLOR[c.status as keyof typeof CHARGE_STATUS_COLOR]} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<CheckCircle size={28} />} text="No tienes cargos registrados" />
          )}
        </div>

        <div className="rounded-xl border bg-white p-5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--navy)' }}>Mis pagos</h2>
            <a href="/dashboard/payments" className="text-xs font-medium" style={{ color: 'var(--blue-action)' }}>
              Registrar pago →
            </a>
          </div>
          {payments && payments.length > 0 ? (
            <div className="flex flex-col gap-2">
              {payments.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(p.payment_date)}</p>
                    {p.reference && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Ref: {p.reference}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>{formatMXN(p.amount)}</p>
                    <Badge label={PAYMENT_STATUS_LABEL[p.status as keyof typeof PAYMENT_STATUS_LABEL]} colorClass={PAYMENT_STATUS_COLOR[p.status as keyof typeof PAYMENT_STATUS_COLOR]} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Clock size={28} />} text="No has registrado pagos aún" />
          )}
        </div>
      </div>
    </div>
  )
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function StatCard({ label, value, icon, accent, urgent }: { label: string; value: string; icon: React.ReactNode; accent: string; urgent?: boolean }) {
  return (
    <div
      className="rounded-xl border bg-white p-4 sm:p-5"
      style={{ borderColor: urgent ? accent : 'var(--border)', borderWidth: urgent ? 1.5 : 1 }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <p className="text-xl sm:text-2xl font-semibold leading-none" style={{ color: 'var(--navy)' }}>
        {value}
      </p>
    </div>
  )
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <span style={{ color: 'var(--text-secondary)', opacity: 0.4 }}>{icon}</span>
      <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>{text}</p>
    </div>
  )
}
