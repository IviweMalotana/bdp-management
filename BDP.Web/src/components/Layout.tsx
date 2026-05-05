import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import {
  LayoutDashboard,
  Package,
  Boxes,
  Users,
  ShoppingCart,
  Factory,
  Ship,
  Settings,
  LogOut,
  Building2,
  ClipboardList,
  RefreshCw,
  FileText,
  Layers,
  Globe,
} from 'lucide-react'

const NAV = [
  { to: '/',                  label: 'Dashboard',       icon: LayoutDashboard, exact: true },
  { to: '/products',          label: 'Products',        icon: Package },
  { to: '/inventory',         label: 'Inventory',       icon: Boxes },
  { to: '/suppliers',         label: 'Suppliers',       icon: Factory },
  { to: '/shipments',         label: 'Shipments',       icon: Ship },
  { to: '/customers',         label: 'Customers',       icon: Users },
  { to: '/orders',            label: 'Legacy Orders',   icon: ShoppingCart },
  { divider: true,            label: 'B2B' },
  { to: '/clients',           label: 'Clients',         icon: Building2 },
  { to: '/b2b-orders',        label: 'Orders',          icon: ClipboardList },
  { to: '/recurring-orders',  label: 'Recurring',       icon: RefreshCw },
  { to: '/invoices',          label: 'Invoices',        icon: FileText },
  { to: '/collections',       label: 'Collections',     icon: Layers },
  { divider: true,            label: 'System' },
  { to: '/shipping-rates',    label: 'Shipping Rates',  icon: Globe },
  { to: '/settings/shipping', label: 'Settings',        icon: Settings },
]

const ROLE_COLOURS: Record<string, string> = {
  Admin:   'bg-purple-600 text-white',
  Manager: 'bg-blue-600 text-white',
}

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-64 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-800">
          <p className="text-xs font-semibold tracking-widest text-gray-500 uppercase mb-0.5">
            Be Different
          </p>
          <h1 className="text-lg font-bold text-white leading-tight">
            Packaging
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">Management System</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => {
            if ('divider' in item) {
              return (
                <div key={item.label} className="pt-3 pb-1 px-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">{item.label}</p>
                </div>
              )
            }
            const { to, label, icon: Icon, exact } = item as { to: string; label: string; icon: React.ElementType; exact?: boolean }
            return (
              <NavLink
                key={to}
                to={to}
                end={exact}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <span className={`inline-block text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_COLOURS[user?.role ?? ''] ?? 'bg-gray-700 text-gray-300'}`}>
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="h-14 flex-shrink-0 bg-gray-900 border-b border-gray-800 flex items-center px-6 gap-4">
          <div className="flex-1" />
          <span className="text-sm text-gray-400">
            {user?.firstName} {user?.lastName}
          </span>
          <span className={`text-xs px-2 py-1 rounded font-medium ${ROLE_COLOURS[user?.role ?? ''] ?? 'bg-gray-700 text-gray-300'}`}>
            {user?.role}
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
