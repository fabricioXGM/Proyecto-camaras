import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, X, AlertCircle } from 'lucide-react'
import { getMantenimientos, createMantenimiento, updateMantenimiento, deleteMantenimiento } from '../services/mantenimientos'
import { getClientesSelect } from '../services/clientes'
import { getInstalacionesSelect } from '../services/instalaciones'
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
  Programado: 'bg-indigo-100 text-indigo-700',
  'En Proceso': 'bg-orange-100 text-orange-700',
  Completado: 'bg-green-100 text-green-700',
  Cancelado: 'bg-red-100 text-red-700',
}

const tipoColors = {
  Preventivo: 'bg-blue-100 text-blue-700',
  Correctivo: 'bg-orange-100 text-orange-700',
}

const emptyForm = {
  cliente_id: '', instalacion_id: '', fecha: new Date().toISOString().split('T')[0],
  tipo: 'Preventivo', descripcion: '', estado: 'Programado', tecnico: ''
}

export default function Mantenimientos() {
  const [items, setItems] = useState([])
  const [clientes, setClientes] = useState([])
  const [instalaciones, setInstalaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('Todos')
  const [filterTipo, setFilterTipo] = useState('Todos')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const { notification, notify } = useNotification()

  useEffect(() => { fetchData(); fetchSelects() }, [])

  async function fetchData() {
    setLoading(true)
    const { data } = await getMantenimientos()
    setItems(data || [])
    setLoading(false)
  }

  async function fetchSelects() {
    const [{ data: cls }, { data: inst }] = await Promise.all([
      getClientesSelect(),
      getInstalacionesSelect(),
    ])
    setClientes(cls || [])
    setInstalaciones(inst || [])
  }

  function openAdd() { setEditingItem(null); setForm(emptyForm); setShowModal(true) }

  function openEdit(item) {
    setEditingItem(item)
    setForm({
      cliente_id: item.cliente_id || '', instalacion_id: item.instalacion_id || '',
      fecha: item.fecha, tipo: item.tipo, descripcion: item.descripcion || '',
      estado: item.estado, tecnico: item.tecnico || ''
    })
    setShowModal(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = { ...form, cliente_id: form.cliente_id || null, instalacion_id: form.instalacion_id || null }
    setSaving(true)
    try {
      if (editingItem) {
        const { error } = await updateMantenimiento(editingItem.id, payload)
        if (error) throw error
        notify('Mantenimiento actualizado')
      } else {
        const { error } = await createMantenimiento(payload)
        if (error) throw error
        notify('Mantenimiento registrado')
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
    if (!window.confirm('¿Eliminar este mantenimiento?')) return
    const { error } = await deleteMantenimiento(id)
    if (error) notify(error.message, 'error')
    else { notify('Mantenimiento eliminado'); fetchData() }
  }

  const filtered = items.filter(i => {
    const matchSearch =
      (i.clientes?.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.tecnico || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.descripcion || '').toLowerCase().includes(search.toLowerCase())
    const matchEstado = filterEstado === 'Todos' || i.estado === filterEstado
    const matchTipo = filterTipo === 'Todos' || i.tipo === filterTipo
    return matchSearch && matchEstado && matchTipo
  })

  return (
    <div className="space-y-6">
      <Notification n={notification} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Mantenimientos</h2>
          <p className="text-sm text-gray-500">{items.length} mantenimientos registrados</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
          <Plus className="w-4 h-4" /> Nuevo Mantenimiento
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar por cliente, técnico o descripción..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {['Todos', 'Programado', 'En Proceso', 'Completado', 'Cancelado'].map(e => (
            <button key={e} onClick={() => setFilterEstado(e)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${filterEstado === e ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              {e}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {['Todos', 'Preventivo', 'Correctivo'].map(t => (
            <button key={t} onClick={() => setFilterTipo(t)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${filterTipo === t ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="text-center py-12"><div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No se encontraron mantenimientos</div>
        ) : filtered.map(i => (
          <div key={i.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-gray-900">{i.clientes?.nombre || <span className="text-gray-400">Sin cliente</span>}</p>
                <p className="text-sm text-gray-500">{i.fecha}{i.tecnico ? ` · ${i.tecnico}` : ''}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${estadoColors[i.estado] || 'bg-gray-100 text-gray-600'}`}>{i.estado}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${tipoColors[i.tipo]}`}>{i.tipo}</span>
              </div>
            </div>
            {i.descripcion && <p className="text-sm text-gray-500 line-clamp-2">{i.descripcion}</p>}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button onClick={() => openEdit(i)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                <Edit2 className="w-4 h-4" /> Editar
              </button>
              <button onClick={() => handleDelete(i.id)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg transition">
                <Trash2 className="w-4 h-4" /> Eliminar
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
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Técnico</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Descripción</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12"><div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No se encontraron mantenimientos</td></tr>
              ) : filtered.map(i => (
                <tr key={i.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">{i.clientes?.nombre || <span className="text-gray-400">—</span>}</td>
                  <td className="px-6 py-4 text-gray-600">{i.fecha}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${tipoColors[i.tipo]}`}>{i.tipo}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${estadoColors[i.estado] || 'bg-gray-100 text-gray-600'}`}>{i.estado}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{i.tecnico || <span className="text-gray-400">—</span>}</td>
                  <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{i.descripcion || <span className="text-gray-300">—</span>}</td>
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

      {/* Modal — bottom-sheet en móvil */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-end sm:items-center sm:p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{editingItem ? 'Editar Mantenimiento' : 'Nuevo Mantenimiento'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <select value={form.cliente_id} onChange={e => setForm({ ...form, cliente_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Sin cliente</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Instalación Relacionada</label>
                <select value={form.instalacion_id} onChange={e => setForm({ ...form, instalacion_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Sin instalación</option>
                  {instalaciones.map(i => <option key={i.id} value={i.id}>{i.clientes?.nombre || 'Sin cliente'} — {i.fecha_instalacion || 'Sin fecha'}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Técnico</label>
                <input type="text" value={form.tecnico} onChange={e => setForm({ ...form, tecnico: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option>Preventivo</option>
                  <option>Correctivo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {['Programado', 'En Proceso', 'Completado', 'Cancelado'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea rows={3} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Detalle del trabajo de mantenimiento..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              <div className="sm:col-span-2 flex gap-3 pt-1 pb-2">
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
