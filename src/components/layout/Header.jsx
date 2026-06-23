import { useLocation } from 'react-router-dom'
import { LogOut, User, Menu } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const titles = {
  '/': 'Dashboard',
  '/clientes': 'Clientes',
  '/cotizaciones': 'Cotizaciones',
  '/instalaciones': 'Instalaciones',
  '/movimientos': 'Movimientos',
  '/mantenimientos': 'Mantenimientos',
}

export default function Header({ onMenuToggle }) {
  const { user, signOut } = useAuth()
  const location = useLocation()

  const path = location.pathname
  const title =
    path.startsWith('/cotizaciones/') && path !== '/cotizaciones'
      ? 'Detalle de Cotización'
      : titles[path] || 'GestorCam'

  return (
    <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-lg lg:text-xl font-semibold text-gray-900">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-indigo-600" />
          </div>
          <span className="hidden sm:block">{user?.email}</span>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition px-3 py-1.5 rounded-lg hover:bg-red-50"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:block">Salir</span>
        </button>
      </div>
    </header>
  )
}
