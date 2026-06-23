import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, X, AlertCircle } from 'lucide-react'
import { getClientes, createCliente, updateCliente, deleteCliente } from '../services/clientes'
import { useNotification } from '../hooks/useNotification'

function Notification({ notification }) {
  if (!notification) return null
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
      {notification.type === 'error' && <AlertCircle className="w-4 h-4" />}
      {notification.message}
    </div>
  )
}

const TIPOS = ['residencial', 'negocio', 'empresa']

const tipoColors = {
  residencial: 'bg-green-100 text-green-700',
  negocio:     'bg-blue-100 text-blue-700',
  empresa:     'bg-indigo-100 text-indigo-700',
}

const emptyForm = { nombre: '', email: '', telefono: '', direccion: '', distrito: '', tipo_cliente: 'residencial' }

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const { notification, notify } = useNotification()

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data } = await getClientes()
    setClientes(data || [])
    setLoading(false)
  }

  function openAdd() {
    setEditingItem(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(item) {
    setEditingItem(item)
    setForm({
      nombre: item.nombre,
      email: item.email || '',
      telefono: item.telefono || '',
      direccion: item.direccion || '',
      distrito: item.distrito || '',
      tipo_cliente: item.tipo_cliente || 'residencial',
    })
    setShowModal(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingItem) {
        const { error } = await updateCliente(editingItem.id, form)
        if (error) throw error
        notify('Cliente actualizado correctamente')
      } else {
        const { error } = await createCliente(form)
        if (error) throw error
        notify('Cliente creado correctamente')
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
    if (!window.confirm('¿Está seguro de eliminar este cliente? Esta acción no se puede deshacer.')) return
    const { error } = await deleteCliente(id)
    if (error) notify(error.message, 'error')
    else { notify('Cliente eliminado'); fetchData() }
  }

  const filtered = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.telefono || '').includes(search)
  )

  return (
    <div className="space-y-6">
      <Notification notification={notification} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Listado de Clientes</h2>
          <p className="text-sm text-gray-500">{clientes.length} clientes registrados</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
          <Plus className="w-4 h-4" /> Nuevo Cliente
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre, email o teléfono..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="text-center py-12"><div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">{search ? 'No se encontraron resultados' : 'No hay clientes registrados'}</div>
        ) : filtered.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-gray-900">{c.nombre}</p>
                <p className="text-sm text-gray-500">{c.distrito || '—'}</p>
              </div>
              {c.tipo_cliente && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize shrink-0 ${tipoColors[c.tipo_cliente] || 'bg-gray-100 text-gray-600'}`}>
                  {c.tipo_cliente}
                </span>
              )}
            </div>
            {(c.email || c.telefono) && (
              <div className="text-sm text-gray-500 space-y-0.5">
                {c.email && <p>{c.email}</p>}
                {c.telefono && <p>{c.telefono}</p>}
              </div>
            )}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <button onClick={() => openEdit(c)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                <Edit2 className="w-4 h-4" /> Editar
              </button>
              <button onClick={() => handleDelete(c.id)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg transition">
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
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Distrito</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Teléfono</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12"><div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">{search ? 'No se encontraron resultados' : 'No hay clientes registrados'}</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">{c.nombre}</td>
                  <td className="px-6 py-4">
                    {c.tipo_cliente
                      ? <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${tipoColors[c.tipo_cliente] || 'bg-gray-100 text-gray-600'}`}>{c.tipo_cliente}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{c.distrito || <span className="text-gray-300">—</span>}</td>
                  <td className="px-6 py-4 text-gray-600">{c.email || <span className="text-gray-300">—</span>}</td>
                  <td className="px-6 py-4 text-gray-600">{c.telefono || <span className="text-gray-300">—</span>}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Editar">
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
              <h2 className="font-semibold text-gray-900">{editingItem ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
                <input type="text" required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                <input type="tel" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cliente <span className="text-red-500">*</span></label>
                <select required value={form.tipo_cliente} onChange={e => setForm({ ...form, tipo_cliente: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {TIPOS.map(t => (
                    <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Distrito <span className="text-red-500">*</span></label>
                <input type="text" required value={form.distrito} onChange={e => setForm({ ...form, distrito: e.target.value })}
                  placeholder="Ej: Miraflores, San Isidro, Surco..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <textarea rows={2} value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-1 pb-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition disabled:opacity-50 font-medium">
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
