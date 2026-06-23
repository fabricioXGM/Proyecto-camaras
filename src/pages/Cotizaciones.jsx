import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, X, Eye, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getCotizaciones, createCotizacion, updateCotizacion, deleteCotizacion } from '../services/cotizaciones'
import { getClientesSelect } from '../services/clientes'
import { useNotification } from '../hooks/useNotification'

function Notification({ n }) {
  if (!n) return null
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${n.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
      {n.type === 'error' && <AlertCircle className="w-4 h-4" />}{n.message}
    </div>
  )
}

const estadoColors = {
  Pendiente: 'bg-yellow-100 text-yellow-700',
  Aprobada: 'bg-green-100 text-green-700',
  Rechazada: 'bg-red-100 text-red-700',
  Facturada: 'bg-blue-100 text-blue-700',
}

const estados = ['Todos', 'Pendiente', 'Aprobada', 'Rechazada', 'Facturada']
const emptyForm = { cliente_id: '', fecha: new Date().toISOString().split('T')[0], estado: 'Pendiente', notas: '' }

export default function Cotizaciones() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('Todos')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const { notification, notify } = useNotification()

  useEffect(() => { fetchData(); fetchClientes() }, [])

  async function fetchData() {
    setLoading(true)
    const { data } = await getCotizaciones()
    setItems(data || [])
    setLoading(false)
  }

  async function fetchClientes() {
    const { data } = await getClientesSelect()
    setClientes(data || [])
  }

  function openAdd() {
    setEditingItem(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(item) {
    setEditingItem(item)
    setForm({ cliente_id: item.cliente_id || '', fecha: item.fecha, estado: item.estado, notas: item.notas || '' })
    setShowModal(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.cliente_id) { notify('Seleccione un cliente', 'error'); return }
    setSaving(true)
    try {
      if (editingItem) {
        const { error } = await updateCotizacion(editingItem.id, form)
        if (error) throw error
        notify('Cotización actualizada')
      } else {
        const { data, error } = await createCotizacion(form)
        if (error) throw error
        notify('Cotización creada')
        setShowModal(false)
        navigate(`/cotizaciones/${data.id}`)
        return
      }
      setShowModal(false)
      fetchData()
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Eliminar esta cotización? Se eliminarán también sus líneas de detalle.')) return
    const { error } = await deleteCotizacion(id)
    if (error) notify(error.message, 'error')
    else { notify('Cotización eliminada'); fetchData() }
  }

  const filtered = items.filter(c => {
    const matchSearch = (c.clientes?.nombre || '').toLowerCase().includes(search.toLowerCase())
    const matchEstado = filterEstado === 'Todos' || c.estado === filterEstado
    return matchSearch && matchEstado
  })

  return (
    <div className="space-y-6">
      <Notification n={notification} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Cotizaciones</h2>
          <p className="text-sm text-gray-500">{items.length} cotizaciones en total</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
          <Plus className="w-4 h-4" /> Nueva Cotización
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar por cliente..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {estados.map(e => (
            <button key={e} onClick={() => setFilterEstado(e)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filterEstado === e ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="text-center py-12"><div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No se encontraron cotizaciones</div>
        ) : filtered.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-gray-900">{c.clientes?.nombre || 'Sin cliente'}</p>
                <p className="text-sm text-gray-500">{c.fecha}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${estadoColors[c.estado] || 'bg-gray-100 text-gray-600'}`}>{c.estado}</span>
            </div>
            <p className="text-base font-semibold text-gray-900">
              S/ {Number(c.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button onClick={() => navigate(`/cotizaciones/${c.id}`)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                <Eye className="w-4 h-4" /> Ver detalle
              </button>
              <button onClick={() => openEdit(c)} className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition">
                <Edit2 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(c.id)} className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg transition">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12"><div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">No se encontraron cotizaciones</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => navigate(`/cotizaciones/${c.id}`)}>
                  <td className="px-6 py-4 font-medium text-gray-900">{c.clientes?.nombre || <span className="text-gray-400">Sin cliente</span>}</td>
                  <td className="px-6 py-4 text-gray-600">{c.fecha}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${estadoColors[c.estado] || 'bg-gray-100 text-gray-600'}`}>{c.estado}</span>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900">
                    S/ {Number(c.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => navigate(`/cotizaciones/${c.id}`)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Ver detalle">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEdit(c)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal — bottom-sheet en móvil */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-end sm:items-center sm:p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{editingItem ? 'Editar Cotización' : 'Nueva Cotización'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente <span className="text-red-500">*</span></label>
                <select value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Seleccionar cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {['Pendiente', 'Aprobada', 'Rechazada', 'Facturada'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea rows={3} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-1 pb-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition disabled:opacity-50 font-medium">
                  {saving ? 'Guardando...' : editingItem ? 'Actualizar' : 'Crear y Ver Detalle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
