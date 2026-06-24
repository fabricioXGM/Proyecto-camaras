import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, X, Eye, AlertCircle, ChevronDown, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getCotizaciones, createCotizacion, updateCotizacion, deleteCotizacion, restoreCotizacion } from '../services/cotizaciones'
import { getClientesSelect } from '../services/clientes'
import { resolveUserName, fmtDate } from '../lib/audit'
import { useNotification } from '../hooks/useNotification'

function Notification({ n }) {
  if (!n) return null
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${n.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
      {n.type === 'error' && <AlertCircle className="w-4 h-4" />}{n.message}
    </div>
  )
}

const fmt = (s) => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—'

const estadoColors = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  aprobada: 'bg-green-100 text-green-700',
  rechazada: 'bg-red-100 text-red-700',
  vencida: 'bg-orange-100 text-orange-700',
}

const estados = ['todos', 'pendiente', 'aprobada', 'rechazada', 'vencida']
const emptyForm = { cliente_id: '', fecha: new Date().toISOString().split('T')[0], estado: 'pendiente', notas: '' }

function ClienteCombobox({ clientes, value, onChange }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const filtrados = clientes.filter(c => c.nombre.toLowerCase().includes(search.toLowerCase()))
  const seleccionado = clientes.find(c => c.id === value)
  return (
    <div className="relative">
      <div className="relative">
        <input type="text"
          value={open ? search : (seleccionado?.nombre || '')}
          onFocus={() => { setOpen(true); setSearch('') }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar cliente..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
      {open && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtrados.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">Sin resultados</div>
          ) : filtrados.map(c => (
            <div key={c.id} onMouseDown={() => { onChange(c.id); setOpen(false) }}
              className={`px-3 py-2 cursor-pointer hover:bg-indigo-50 text-sm ${value === c.id ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-gray-800'}`}>
              {c.nombre}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Cotizaciones() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [mostrarEliminados, setMostrarEliminados] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [auditInfo, setAuditInfo] = useState({ creador: null, modificador: null })
  const { notification, notify } = useNotification()

  useEffect(() => { fetchData(false); fetchClientes() }, [])

  async function fetchData(incl = mostrarEliminados) {
    setLoading(true)
    const { data } = await getCotizaciones({ incluirEliminados: incl })
    setItems(data || [])
    setLoading(false)
  }

  async function fetchClientes() {
    const { data } = await getClientesSelect()
    setClientes(data || [])
  }

  function handleToggle(checked) {
    setMostrarEliminados(checked)
    fetchData(checked)
  }

  function openAdd() {
    setEditingItem(null)
    setForm(emptyForm)
    setAuditInfo({ creador: null, modificador: null })
    setShowModal(true)
  }

  function openEdit(item) {
    setEditingItem(item)
    setForm({ cliente_id: item.cliente_id || '', fecha: item.fecha, estado: item.estado, notas: item.notas || '' })
    setAuditInfo({ creador: null, modificador: null })
    setShowModal(true)
    if (item.creado_por) resolveUserName(item.creado_por).then(n => setAuditInfo(a => ({ ...a, creador: n })))
    if (item.modificado_por) resolveUserName(item.modificado_por).then(n => setAuditInfo(a => ({ ...a, modificador: n })))
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
    if (!window.confirm('¿Eliminar esta cotización?')) return
    const { error } = await deleteCotizacion(id)
    if (error) notify(error.message, 'error')
    else { notify('Cotización eliminada'); fetchData() }
  }

  async function handleRestore(id) {
    const { error } = await restoreCotizacion(id)
    if (error) notify(error.message, 'error')
    else { notify('Cotización restaurada'); fetchData() }
  }

  const filtered = items.filter(c => {
    const matchSearch = (c.clientes?.nombre || '').toLowerCase().includes(search.toLowerCase())
    const matchEstado = filterEstado === 'todos' || c.estado === filterEstado
    return matchSearch && matchEstado
  })

  return (
    <div className="space-y-6">
      <Notification n={notification} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Cotizaciones</h2>
          <p className="text-sm text-gray-500">{items.filter(c => c.activo !== false).length} cotizaciones activas</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
          <Plus className="w-4 h-4" /> Nueva Cotización
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
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
              {e === 'todos' ? 'Todos' : fmt(e)}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm text-gray-500 cursor-pointer select-none whitespace-nowrap self-center">
          <input type="checkbox" checked={mostrarEliminados} onChange={e => handleToggle(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
          Mostrar eliminados
        </label>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="text-center py-12"><div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No se encontraron cotizaciones</div>
        ) : filtered.map(c => (
          <div key={c.id} className={`rounded-xl border p-4 shadow-sm space-y-2 ${c.activo === false ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={`font-medium ${c.activo === false ? 'line-through text-gray-400' : 'text-gray-900'}`}>{c.clientes?.nombre || 'Sin cliente'}</p>
                <p className="text-sm text-gray-500">{c.fecha}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${estadoColors[c.estado] || 'bg-gray-100 text-gray-600'}`}>{fmt(c.estado)}</span>
            </div>
            <p className="text-base font-semibold text-gray-900">
              S/ {Number(c.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </p>
            {c.activo === false ? (
              <button onClick={() => handleRestore(c.id)} className="w-full flex items-center justify-center gap-1.5 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition border border-green-200">
                <RotateCcw className="w-4 h-4" /> Restaurar
              </button>
            ) : (
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
            )}
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
                <tr key={c.id}
                  className={`${c.activo === false ? 'bg-red-50' : 'hover:bg-gray-50 transition cursor-pointer'}`}
                  onClick={c.activo !== false ? () => navigate(`/cotizaciones/${c.id}`) : undefined}>
                  <td className={`px-6 py-4 font-medium ${c.activo === false ? 'line-through text-gray-400' : 'text-gray-900'}`}>{c.clientes?.nombre || <span className="text-gray-400">Sin cliente</span>}</td>
                  <td className="px-6 py-4 text-gray-600">{c.fecha}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${estadoColors[c.estado] || 'bg-gray-100 text-gray-600'}`}>{fmt(c.estado)}</span>
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900">
                    S/ {Number(c.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                    {c.activo === false ? (
                      <button onClick={() => handleRestore(c.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-600 border border-green-200 hover:bg-green-50 rounded-lg transition font-medium ml-auto">
                        <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                      </button>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/cotizaciones/${c.id}`)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Ver detalle"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => openEdit(c)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition" title="Editar"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-end justify-center sm:items-center sm:p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{editingItem ? 'Editar Cotización' : 'Nueva Cotización'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente <span className="text-red-500">*</span></label>
                <ClienteCombobox clientes={clientes} value={form.cliente_id} onChange={val => setForm({ ...form, cliente_id: val })} />
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
                  {['pendiente', 'aprobada', 'rechazada', 'vencida'].map(s => <option key={s} value={s}>{fmt(s)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea rows={3} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              {editingItem?.creado_en && (
                <div className="border-t border-gray-100 pt-3 space-y-1.5">
                  <p className="text-xs text-gray-400">
                    Creado por <span className="text-gray-600 font-medium">{auditInfo.creador || '…'}</span>{' el '}{fmtDate(editingItem.creado_en)}
                  </p>
                  {editingItem.modificado_en && (
                    <p className="text-xs text-gray-400">
                      Modificado por <span className="text-gray-600 font-medium">{auditInfo.modificador || '…'}</span>{' el '}{fmtDate(editingItem.modificado_en)}
                    </p>
                  )}
                </div>
              )}
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
