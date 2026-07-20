import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatMXN, formatDate, PAYMENT_STATUS_COLOR, PAYMENT_STATUS_LABEL } from '@/lib/utils'
import Badge from '@/components/Badge'
import PaymentUpload from './PaymentUpload'
import PaymentVerify from './PaymentVerify'
import AdminPaymentButton from './AdminPaymentButton'
import PaymentActions from './PaymentActions'
import InvoiceDownload from './InvoiceDownload'

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  if (isAdmin) {
    const { data: payments } = await supabase
      .from('payments')
      .select('*, units(unit_number, floor), profiles!payments_submitted_by_fkey(full_name), payment_billing_periods(billing_periods(period_year, period_month))')
      .order('created_at', { ascending: false })
      .limit(50)

    const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--navy)' }}>Pagos</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Revisa y verifica los comprobantes de pago de los vecinos
            </p>
          </div>
          <AdminPaymentButton />
        </div>

        {/* Tabla de pagos */}
        <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: 'var(--border)' }}>
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-page)', borderBottom: `1px solid var(--border)` }}>
                  {['Depto', 'Fecha pago', 'Monto', 'Referencia', 'Periodo', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="text-left px-5 py-3 font-medium text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payments?.map((p, i) => (
                  <tr
                    key={p.id}
                    style={{ borderTop: i > 0 ? `1px solid var(--border)` : undefined }}
                  >
                    <td className="px-5 py-3.5 font-medium" style={{ color: 'var(--navy)' }}>
                      Depto {p.units?.unit_number}
                    </td>
                    <td className="px-5 py-3.5" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(p.payment_date)}
                    </td>
                    <td className="px-5 py-3.5 font-semibold" style={{ color: 'var(--navy)' }}>
                      {formatMXN(p.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {p.reference ?? '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      {(p as any).payment_billing_periods?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {(p as any).payment_billing_periods.map((pbp: any, idx: number) => (
                            <span key={idx} className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: 'rgba(37,99,235,0.08)', color: 'var(--blue-action)' }}>
                              {MONTH_SHORT[pbp.billing_periods.period_month - 1]} {pbp.billing_periods.period_year}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge
                        label={PAYMENT_STATUS_LABEL[p.status as keyof typeof PAYMENT_STATUS_LABEL]}
                        colorClass={PAYMENT_STATUS_COLOR[p.status as keyof typeof PAYMENT_STATUS_COLOR]}
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      {p.status === 'pending_review' ? (
                        <PaymentVerify paymentId={p.id} amount={p.amount} unitNumber={p.units?.unit_number} receiptUrl={p.receipt_url} />
                      ) : (
                        <PaymentActions payment={p} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Móvil */}
          <div className="sm:hidden divide-y" style={{ borderColor: 'var(--border)' }}>
            {payments?.map(p => (
              <div key={p.id} className="px-4 py-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--navy)' }}>Depto {p.units?.unit_number}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{formatDate(p.payment_date)}</p>
                    {(p as any).payment_billing_periods?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(p as any).payment_billing_periods.map((pbp: any, idx: number) => (
                          <span key={idx} className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ backgroundColor: 'rgba(37,99,235,0.08)', color: 'var(--blue-action)' }}>
                            {MONTH_SHORT[pbp.billing_periods.period_month - 1]} {pbp.billing_periods.period_year}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm" style={{ color: 'var(--navy)' }}>{formatMXN(p.amount)}</p>
                    <Badge label={PAYMENT_STATUS_LABEL[p.status as keyof typeof PAYMENT_STATUS_LABEL]} colorClass={PAYMENT_STATUS_COLOR[p.status as keyof typeof PAYMENT_STATUS_COLOR]} />
                  </div>
                </div>
                <div className="mt-2">
                  {p.status === 'pending_review' ? (
                    <PaymentVerify paymentId={p.id} amount={p.amount} unitNumber={p.units?.unit_number} receiptUrl={p.receipt_url} />
                  ) : (
                    <PaymentActions payment={p} />
                  )}
                </div>
              </div>
            ))}
          </div>

          {(!payments || payments.length === 0) && (
            <div className="py-16 text-center">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No hay pagos registrados aún.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Vista residente
  const { data: residency } = await supabase
    .from('unit_residents')
    .select('unit_id, units(unit_number, monthly_fee)')
    .eq('profile_id', user.id)
    .is('end_date', null)
    .single()

  const { data: pendingCharges } = residency?.unit_id
    ? await supabase
        .from('charges')
        .select('*, fee_concepts(name)')
        .eq('unit_id', residency.unit_id)
        .in('status', ['pending', 'partial'])
        .order('due_date')
    : { data: [] }

  const { data: billingPeriods } = await supabase
    .from('billing_periods')
    .select('id, period_year, period_month, status')
    .order('period_year')
    .order('period_month')

  const { data: myPayments } = residency?.unit_id
    ? await supabase
        .from('payments')
        .select('*')
        .eq('unit_id', residency.unit_id)
        .order('created_at', { ascending: false })
        .limit(10)
    : { data: [] }

  const paymentIds = myPayments?.map(p => p.id) ?? []
  const { data: invoiceRows } = paymentIds.length > 0
    ? await supabase
        .from('payment_invoices')
        .select('payment_id, file_type, file_path')
        .in('payment_id', paymentIds)
    : { data: [] }

  const invoiceMap: Record<string, { file_type: string; file_path: string }[]> = {}
  invoiceRows?.forEach(inv => {
    if (!invoiceMap[inv.payment_id]) invoiceMap[inv.payment_id] = []
    invoiceMap[inv.payment_id].push({ file_type: inv.file_type, file_path: inv.file_path })
  })

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--navy)' }}>Mis pagos</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Registra tu pago y sube tu comprobante
        </p>
      </div>

      {residency ? (
        <>
          <PaymentUpload
            unitId={residency.unit_id}
            unitNumber={(residency.units as any).unit_number}
            pendingCharges={pendingCharges ?? []}
            userId={user.id}
            billingPeriods={billingPeriods ?? []}
          />

          <div className="mt-8">
            <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--navy)' }}>Historial de pagos</h2>
            <div className="rounded-xl border bg-white overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              {myPayments && myPayments.length > 0 ? (
                <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {myPayments.map(p => (
                    <div key={p.id} className="flex items-center justify-between px-5 py-3.5">
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{formatDate(p.payment_date)}</p>
                        {p.reference && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Ref: {p.reference}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold" style={{ color: 'var(--navy)' }}>{formatMXN(p.amount)}</p>
                        <Badge label={PAYMENT_STATUS_LABEL[p.status as keyof typeof PAYMENT_STATUS_LABEL]} colorClass={PAYMENT_STATUS_COLOR[p.status as keyof typeof PAYMENT_STATUS_COLOR]} />
                        {invoiceMap[p.id] && <InvoiceDownload invoices={invoiceMap[p.id]} />}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No has registrado pagos aún.</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl border bg-white p-8 text-center" style={{ borderColor: 'var(--border)' }}>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Tu usuario aún no está vinculado a ningún departamento. Contacta a la administración.
          </p>
        </div>
      )}
    </div>
  )
}
