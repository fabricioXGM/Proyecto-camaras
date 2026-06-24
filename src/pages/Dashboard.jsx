import { useEffect, useState } from 'react'
import { Users, FileText, Wrench, TrendingUp, TrendingDown, Settings, DollarSign } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const fmt = (s) => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—'

function StatCard({ title, value, icon: Icon, color, subtitle }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs lg:text-sm font-medium text-gray-500 leading-tight">{title}</p>
        <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center shrink-0 ${colors[color]}`}>
          <Icon className="w-4 h-4 lg:w-5 lg:h-5" />
        </div>
      </div>
      <p className="text-2xl lg:text-3xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs lg:text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    clientes: 0,
    cotizacionesPendientes: 0,
    instalacionesActivas: 0,
    mantenimientosPendientes: 0,
    ingresosMes: 0,
    salidasMes: 0,
  })
  const [recentCotizaciones, setRecentCotizaciones] = useState([])
  const [recentInstalaciones, setRecentInstalaciones] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    setLoading(true)
    const now = new Date()
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const endMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const [
      { count: clientes },
      { count: cotPendientes },
      { count: instActivas },
      { count: mantPendientes },
      { data: movimientos },
      { data: cotRecientes },
      { data: instRecientes },
    ] = await Promise.all([
      supabase.from('clientes').select('*', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('cotizaciones').select('*', { count: 'exact', head: true }).eq('activo', true).eq('estado', 'pendiente'),
      supabase.from('instalaciones').select('*', { count: 'exact', head: true }).eq('activo', true).in('estado', ['programada', 'en_proceso']),
      supabase.from('mantenimientos').select('*', { count: 'exact', head: true }).eq('activo', true).eq('estado', 'programado'),
      supabase.from('movimientos').select('tipo, monto').eq('activo', true).gte('fecha', startMonth).lte('fecha', endMonth),
      supabase.from('cotizaciones').select('id_cotizacion, id_cliente, fecha, estado, creado_en, clientes(nombre), detalle_cotizacion(subtotal, activo)').eq('activo', true).order('creado_en', { ascending: false }).limit(5),
      supabase.from('instalaciones').select('id_instalacion, fecha_instalacion, estado, creado_en, cotizaciones(clientes(nombre))').eq('activo', true).order('creado_en', { ascending: false }).limit(5),
    ])

    const ingresosMes = (movimientos || []).filter(m => m.tipo === 'I').reduce((s, m) => s + Number(m.monto), 0)
    const salidasMes = (movimientos || []).filter(m => m.tipo === 'S').reduce((s, m) => s + Number(m.monto), 0)

    setStats({
      clientes: clientes || 0,
      cotizacionesPendientes: cotPendientes || 0,
      instalacionesActivas: instActivas || 0,
      mantenimientosPendientes: mantPendientes || 0,
      ingresosMes,
      salidasMes,
    })
    setRecentCotizaciones(
      (cotRecientes || []).map(c => ({
        ...c,
        total: (c.detalle_cotizacion || [])
          .filter(l => l.activo !== false)
          .reduce((s, l) => s + Number(l.subtotal || 0), 0),
      }))
    )
    setRecentInstalaciones(instRecientes || [])
    setLoading(false)
  }

  const estadoBadge = {
    pendiente: 'bg-yellow-100 text-yellow-700',
    aprobada: 'bg-green-100 text-green-700',
    rechazada: 'bg-red-100 text-red-700',
    vencida: 'bg-orange-100 text-orange-700',
    programada: 'bg-indigo-100 text-indigo-700',
    en_proceso: 'bg-orange-100 text-orange-700',
    completada: 'bg-green-100 text-green-700',
    garantia: 'bg-purple-100 text-purple-700',
  }

  const mesActual = format(new Date(), 'MMMM yyyy', { locale: es })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatCard title="Total Clientes" value={stats.clientes} icon={Users} color="indigo" />
        <StatCard title="Cotizaciones Pendientes" value={stats.cotizacionesPendientes} icon={FileText} color="yellow" />
        <StatCard title="Instalaciones Activas" value={stats.instalacionesActivas} icon={Wrench} color="blue" />
        <StatCard title="Mantenimientos Pendientes" value={stats.mantenimientosPendientes} icon={Settings} color="purple" />
      </div>

      {/* Monthly Balance */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm font-medium text-gray-500">Ingresos {mesActual}</p>
          </div>
          <p className="text-2xl font-bold text-green-600">
            S/ {stats.ingresosMes.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-sm font-medium text-gray-500">Salidas {mesActual}</p>
          </div>
          <p className="text-2xl font-bold text-red-600">
            S/ {stats.salidasMes.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-sm font-medium text-gray-500">Balance {mesActual}</p>
          </div>
          <p className={`text-2xl font-bold ${stats.ingresosMes - stats.salidasMes >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
            S/ {(stats.ingresosMes - stats.salidasMes).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Recent Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Quotes */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Últimas Cotizaciones</h3>
          </div>
          {recentCotizaciones.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">Sin cotizaciones registradas</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentCotizaciones.map(c => (
                <div key={c.id_cotizacion} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{c.clientes?.nombre || 'Sin cliente'}</p>
                    <p className="text-xs text-gray-500">{c.fecha}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">
                      S/ {Number(c.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoBadge[c.estado] || 'bg-gray-100 text-gray-600'}`}>
                      {fmt(c.estado)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Installations */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Últimas Instalaciones</h3>
          </div>
          {recentInstalaciones.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">Sin instalaciones registradas</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentInstalaciones.map(i => (
                <div key={i.id_instalacion} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{i.cotizaciones?.clientes?.nombre || 'Sin cliente'}</p>
                    <p className="text-xs text-gray-500">{i.fecha_instalacion || 'Sin fecha'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoBadge[i.estado] || 'bg-gray-100 text-gray-600'}`}>
                    {fmt(i.estado)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
