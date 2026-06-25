import { ChargeStatus, PaymentStatus, PeriodStatus } from './types'

export function formatMXN(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr + 'T00:00:00'))
}

export function formatMonth(year: number, month: number): string {
  return new Intl.DateTimeFormat('es-MX', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1))
}

export const CHARGE_STATUS_LABEL: Record<ChargeStatus, string> = {
  pending: 'Pendiente',
  partial: 'Parcial',
  paid: 'Pagado',
  cancelled: 'Cancelado',
}

export const CHARGE_STATUS_COLOR: Record<ChargeStatus, string> = {
  pending: 'text-amber-700 bg-amber-50 border-amber-200',
  partial: 'text-blue-700 bg-blue-50 border-blue-200',
  paid: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  cancelled: 'text-gray-500 bg-gray-100 border-gray-200',
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending_review: 'En revisión',
  verified: 'Verificado',
  rejected: 'Rechazado',
}

export const PAYMENT_STATUS_COLOR: Record<PaymentStatus, string> = {
  pending_review: 'text-amber-700 bg-amber-50 border-amber-200',
  verified: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  rejected: 'text-red-700 bg-red-50 border-red-200',
}

export const PERIOD_STATUS_LABEL: Record<PeriodStatus, string> = {
  draft: 'Borrador',
  open: 'Abierto',
  closed: 'Cerrado',
}
