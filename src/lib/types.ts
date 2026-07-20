export type Role = 'admin' | 'resident' | 'accountant'
export type UnitStatus = 'active' | 'inactive'
export type ChargeStatus = 'pending' | 'partial' | 'paid' | 'cancelled'
export type PaymentStatus = 'pending_review' | 'verified' | 'rejected'
export type PeriodStatus = 'draft' | 'open' | 'closed'
export type ResidentRole = 'owner' | 'tenant'

export interface Profile {
  id: string
  full_name: string
  phone: string | null
  role: Role
  created_at: string
  updated_at: string
}

export interface Unit {
  id: string
  unit_number: string
  floor: number | null
  area_m2: number | null
  monthly_fee: number
  status: UnitStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface UnitResident {
  id: string
  unit_id: string
  profile_id: string
  role: ResidentRole
  is_primary: boolean
  start_date: string
  end_date: string | null
  created_at: string
}

export interface FeeConcept {
  id: string
  code: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

export interface BillingPeriod {
  id: string
  period_year: number
  period_month: number
  due_date: string
  status: PeriodStatus
  notes: string | null
  generated_at: string | null
  created_at: string
  created_by: string | null
}

export interface Charge {
  id: string
  unit_id: string
  concept_id: string
  billing_period_id: string | null
  description: string | null
  amount: number
  paid_amount: number
  due_date: string
  status: ChargeStatus
  created_at: string
  created_by: string | null
}

export interface Payment {
  id: string
  unit_id: string
  amount: number
  payment_date: string
  reference: string | null
  receipt_url: string | null
  status: PaymentStatus
  notes: string | null
  admin_notes: string | null
  submitted_by: string | null
  verified_by: string | null
  verified_at: string | null
  created_at: string
}

export interface PaymentAllocation {
  id: string
  payment_id: string
  charge_id: string
  amount: number
  created_at: string
}

// Tipos extendidos con joins frecuentes
export interface ChargeWithUnit extends Charge {
  units: Pick<Unit, 'unit_number' | 'floor'>
  fee_concepts: Pick<FeeConcept, 'name' | 'code'>
}

export interface PaymentInvoice {
  id: string
  payment_id: string
  file_type: 'pdf' | 'xml'
  file_path: string
  file_name: string
  uploaded_by: string | null
  created_at: string
}

export interface PaymentWithUnit extends Payment {
  units: Pick<Unit, 'unit_number' | 'floor'>
  profiles: Pick<Profile, 'full_name'>
}

export interface UnitWithBalance extends Unit {
  total_pending: number
  charges_count: number
}
