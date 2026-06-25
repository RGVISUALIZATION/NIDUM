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
  Wrench,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { Profile } from '@/lib/types'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',           label: 'Inicio',         icon: LayoutDashboard },
  { href: '/dashboard/units',     label: 'Departamentos',  icon: Home,            adminOnly: true },
  { href: '/dashboard/charges',   label: 'Cargos',         icon: CreditCard,      adminOnly: true },
  { href: '/dashboard/payments',  label: 'Pagos',          icon: Upload },
  { href: '/dashboard/periods',   label: 'Periodos',       icon: Calendar,        adminOnly: true },
  { href: '/dashboard/maintenance', label: 'Mantenimiento', icon: Wrench },
]

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const isAdmin = profile.role === 'admin'

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin)

  return (
    <>
      {/* Sidebar desktop */}
      <aside
        className="hidden lg:flex flex-col w-60 min-h-screen fixed left-0 top-0 z-20"
        style={{ backgroundColor: 'var(--navy)' }}
      >
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
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group"
                style={{
                  backgroundColor: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: active ? '#ffffff' : 'rgba(255,255,255,0.6)',
                }}
              >
                <Icon size={17} strokeWidth={active ? 2 : 1.5} />
                <span className="font-medium">{item.label}</span>
                {active && (
                  <ChevronRight size={14} className="ml-auto opacity-60" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Perfil y logout */}
        <div className="px-3 pb-4 border-t border-white/10 pt-3">
          <div className="px-3 py-2 mb-1">
            <p className="text-white text-sm font-medium truncate">{profile.full_name}</p>
            <p className="text-blue-300 text-xs capitalize">{isAdmin ? 'Administradora' : 'Residente'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full transition-all"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
          >
            <LogOut size={17} strokeWidth={1.5} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Bottom nav móvil */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-20 flex border-t"
        style={{ backgroundColor: 'var(--navy)', borderColor: 'rgba(255,255,255,0.1)' }}
      >
        {visibleItems.slice(0, 5).map(item => {
          const Icon = item.icon
          const active = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors"
              style={{ color: active ? '#ffffff' : 'rgba(255,255,255,0.5)' }}
            >
              <Icon size={20} strokeWidth={active ? 2 : 1.5} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
