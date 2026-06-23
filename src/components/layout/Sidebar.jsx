import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FileText,
  Wrench,
  ArrowLeftRight,
  Settings,
  Camera,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/clientes', icon: Users, label: 'Clientes' },
  { to: '/cotizaciones', icon: FileText, label: 'Cotizaciones' },
  { to: '/instalaciones', icon: Wrench, label: 'Instalaciones' },
  { to: '/movimientos', icon: ArrowLeftRight, label: 'Movimientos' },
  { to: '/mantenimientos', icon: Settings, label: 'Mantenimientos' },
]

export default function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 flex flex-col h-screen sticky top-0 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-700">
        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
          <Camera className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-base leading-none">GestorCam</p>
          <p className="text-gray-400 text-xs mt-0.5">Cámaras de Seguridad</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-700">
        <p className="text-gray-500 text-xs text-center">v1.0.0</p>
      </div>
    </aside>
  )
}
