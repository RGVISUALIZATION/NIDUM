'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Building2,
  LayoutDashboard,
  Home,
  CreditCard,
  Upload,
  Calendar,
  CalendarDays,
  Wrench,
  TrendingDown,
  FileSpreadsheet,
  LogOut,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react'
import { Profile } from '@/lib/types'
import { useState } from 'react'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  adminOnly?: boolean
  visibleTo?: string[]   // if set, only these roles see the item
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',                label: 'Inicio',         icon: LayoutDashboard },
  { href: '/dashboard/units',          label: 'Departamentos',  icon: Home,            adminOnly: true },
  { href: '/dashboard/charges',        label: 'Cargos',         icon: CreditCard,      adminOnly: true },
  { href: '/dashboard/payments',       label: 'Pagos',          icon: Upload,          adminOnly: true },
  { href: '/dashboard/periods',        label: 'Periodos',       icon: Calendar,        adminOnly: true },
  { href: '/dashboard/accounting',     label: 'Contabilidad',   icon: FileSpreadsheet, visibleTo: ['accountant'] },
  { href: '/dashboard/reservations',   label: 'Áreas comunes',  icon: CalendarDays },
  { href: '/dashboard/maintenance',    label: 'Mantenimiento',  icon: Wrench },
  { href: '/dashboard/egresos',        label: 'Egresos',        icon: TrendingDown,    adminOnly: true },
]

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const isAdmin = profile.role === 'admin'
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.visibleTo) return item.visibleTo.includes(profile.role)
    if (item.adminOnly) return isAdmin
    return true
  })

  const navContent = (
    <>
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <Building2 className="text-white" size={22} strokeWidth={1.5} />
          <div>
            <p className="text-white font-semibold text-sm leading-tight">
              Condominio
            </p>
            <p className="text-blue-300 text-xs">Administración</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {visibleItems.map(item => {
          const Icon = item.icon
          const active = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group"
              style={{
                backgroundColor: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: active ? '#ffffff' : 'rgba(255,255,255,0.6)',
              }}
            >
              <Icon size={17} strokeWidth={active ? 2 : 1.5} />
              <span className={active ? 'font-medium' : ''}>{item.label}</span>
              {active && (
                <ChevronRight size={14} className="ml-auto opacity-60" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            {profile.full_name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm truncate">{profile.full_name}</p>
            <p className="text-blue-300/60 text-xs capitalize">{profile.role === 'accountant' ? 'Contadora' : profile.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-sm transition-all"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          <LogOut size={15} strokeWidth={1.5} />
          Cerrar sesión
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Sidebar desktop */}
      <aside
        className="hidden lg:flex flex-col w-60 min-h-screen fixed left-0 top-0 z-20"
        style={{ backgroundColor: 'var(--navy)' }}
      >
        {navContent}
      </aside>

      {/* Mobile hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 px-4 py-3 flex items-center" style={{ backgroundColor: 'var(--navy)' }}>
        <button onClick={() => setMobileOpen(true)} className="text-white p-1">
          <Menu size={22} />
        </button>
        <span className="text-white text-sm font-medium ml-3">Condominio</span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside
            className="relative flex flex-col w-64 min-h-screen"
            style={{ backgroundColor: 'var(--navy)' }}
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-white/60"
            >
              <X size={20} />
            </button>
            {navContent}
          </aside>
        </div>
      )}
    </>
  )
}
