import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, X, AlertCircle } from 'lucide-react'
import { getInstalaciones, createInstalacion, updateInstalacion, deleteInstalacion } from '../services/instalaciones'
import { getClientesSelect } from '../services/clientes'
import { getCotizacionesSelect } from '../services/cotizaciones'
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
  Programada: 'bg-indigo-100 text-indigo-700',
  'En Proceso': 'bg-orange-100 text-orange-700',
  Completada: 'bg-green-100 text-green-700',
  Cancelada: 'bg-red-100 text-red-700',
}

const estados = ['Todos', 'Programada', 'En Proceso', 'Completada', 'Cancelada']
const emptyForm = {
  cliente_id: '', cotizacion_id: '', fecha_instalacion: new Date().toISOString().split('T')[0],
  tecnico: '', estado: 'Programada', notas: ''
}

export default function Instalaciones() {
  const [items, setItems] = useState([])
  const [clientes, setClientes] = useState([])
  const [cotizaciones, setCotizaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('Todos')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const { notification, notify } = useNotification()

  useEffect(() => { fetchData(); fetchSelects() }, [])

  async function fetchData() {
    setLoading(true)
    const { data } = await getInstalaciones()
    setItems(data || [])
    setLoading(false)
  }

  async function fetchSelects() {
    const [{ data: cls }, { data: cots }] = await Promise.all([
      getClientesSelect(),
      getCotizacionesSelect(),
    ])
    setClientes(cls || [])
    setCotizaciones(cots || [])
  }

  function openAdd() { setEditingItem(null); setForm(emptyForm); setShowModal(true) }

  function openEdit(item) {
    setEditingItem(item)
    setForm({
      cliente_id: item.cliente_id || '', cotizacion_id: item.cotizacion_id || '',
      fecha_instalacion: item.fecha_instalacion || '', tecnico: item.tecnico || '',
      estado: item.estado, notas: item.notas || ''
    })
    setShowModal(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = { ...form, cotizacion_id: form.cotizacion_id || null, cliente_id: form.cliente_id || null }
    setSaving(true)
    try {
      if (editingItem) {
        const { error } = await updateInstalacion(editingItem.id, payload)
        if (error) throw error
        notify('Instalación actualizada')
      } else {
        const { error } = await createInstalacion(payload)
        if (error) throw error
        notify('Instalación creada')
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
    if (!window.confirm('¿Eliminar esta instalación?')) return
    const { error } = await deleteInstalacion(id)
    if (error) notify(error.message, 'error')
    else { notify('Instalación eliminada'); fetchData() }
  }

  const filtered = items.filter(i => {
    const matchSearch = (i.clientes?.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.tecnico || '').toLowerCase().includes(search.toLowerCase())
    const matchEstado = filterEstado === 'Todos' || i.estado === filterEstado
    return matchSearch && matchEstado
  })

  return (
    <div className="space-y-6">
      <Notification n={notification} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Instalaciones</h2>
          <p className="text-sm text-gray-500">{items.length} instalaciones registradas</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
          <Plus className="w-4 h-4" /> Nueva Instalación
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar por cliente o técnico..." value={search}
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha Instalación</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Técnico</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Notas</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12"><div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No se encontraron instalaciones</td></tr>
              ) : filtered.map(i => (
                <tr key={i.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">{i.clientes?.nombre || <span className="text-gray-400">—</span>}</td>
                  <td className="px-6 py-4 text-gray-600">{i.fecha_instalacion || <span className="text-gray-400">—</span>}</td>
                  <td className="px-6 py-4 text-gray-600">{i.tecnico || <span className="text-gray-400">—</span>}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${estadoColors[i.estado] || 'bg-gray-100 text-gray-600'}`}>{i.estado}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{i.notas || <span className="text-gray-300">—</span>}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(i)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(i.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{editingItem ? 'Editar Instalación' : 'Nueva Instalación'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <select value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Sin cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cotización Relacionada</label>
                <select value={form.cotizacion_id} onChange={e => setForm({ ...form, cotizacion_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Sin cotización</option>
                  {cotizaciones.map(c => <option key={c.id} value={c.id}>{c.clientes?.nombre} — S/ {Number(c.total || 0).toFixed(2)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Instalación</label>
                <input type="date" value={form.fecha_instalacion} onChange={e => setForm({ ...form, fecha_instalacion: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Técnico</label>
                <input type="text" value={form.tecnico} onChange={e => setForm({ ...form, tecnico: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {['Programada', 'En Proceso', 'Completada', 'Cancelada'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea rows={2} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              <div className="col-span-2 flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition disabled:opacity-50 font-medium">
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
