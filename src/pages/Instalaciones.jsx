import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, X, AlertCircle, ChevronDown, RotateCcw } from 'lucide-react'
import { getInstalaciones, createInstalacion, updateInstalacion, deleteInstalacion, restoreInstalacion } from '../services/instalaciones'
import { getCotizacionesSelect } from '../services/cotizaciones'
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
  programada: 'bg-indigo-100 text-indigo-700',
  en_proceso: 'bg-orange-100 text-orange-700',
  completada: 'bg-green-100 text-green-700',
  garantia: 'bg-purple-100 text-purple-700',
}

const estados = ['todos', 'programada', 'en_proceso', 'completada', 'garantia']
const emptyForm = {
  cotizacion_id: '',
  fecha_instalacion: new Date().toISOString().split('T')[0],
  estado: 'programada',
  direccion: '',
  notas: '',
}

function CotizacionCombobox({ cotizaciones, value, onChange, editingItemCotizacionId }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const opciones = cotizaciones.filter(c =>
    (c.estado === 'aprobada' && !c.yaUsada) || c.id === editingItemCotizacionId
  )
  const filtradas = opciones.filter(c => {
    const label = `${c.clientes?.nombre || ''} ${Number(c.total || 0).toFixed(2)}`
    return label.toLowerCase().includes(search.toLowerCase())
  })
  const seleccionada = cotizaciones.find(c => c.id === value)
  const labelSeleccionada = seleccionada
    ? `${seleccionada.clientes?.nombre || 'Sin cliente'} — S/ ${Number(seleccionada.total || 0).toFixed(2)}`
    : ''
  return (
    <div className="relative">
      <div className="relative">
        <input type="text"
          value={open ? search : labelSeleccionada}
          onFocus={() => { setOpen(true); setSearch('') }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar cotización aprobada..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
      {open && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          <div onMouseDown={() => { onChange(''); setOpen(false) }}
            className="px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm text-gray-400 border-b border-gray-100">
            Sin cotización
          </div>
          {filtradas.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">
              {opciones.length === 0 ? 'No hay cotizaciones aprobadas' : 'Sin resultados'}
            </div>
          ) : filtradas.map(c => (
            <div key={c.id} onMouseDown={() => { onChange(c.id); setOpen(false) }}
              className={`px-3 py-2 cursor-pointer hover:bg-indigo-50 text-sm ${value === c.id ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-gray-800'}`}>
              <span className="font-medium">{c.clientes?.nombre || 'Sin cliente'}</span>
              <span className="text-gray-500 ml-2">S/ {Number(c.total || 0).toFixed(2)}</span>
              {c.estado !== 'aprobada' && <span className="ml-2 text-xs text-orange-500">({fmt(c.estado)})</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Instalaciones() {
  const [items, setItems] = useState([])
  const [cotizaciones, setCotizaciones] = useState([])
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

  useEffect(() => { fetchData(false); fetchSelects() }, [])

  async function fetchData(incl = mostrarEliminados) {
    setLoading(true)
    const { data } = await getInstalaciones({ incluirEliminados: incl })
    setItems(data || [])
    setLoading(false)
  }

  async function fetchSelects() {
    const { data } = await getCotizacionesSelect()
    setCotizaciones(data || [])
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
    setForm({
      cotizacion_id: item.cotizacion_id || '',
      fecha_instalacion: item.fecha_instalacion || '',
      estado: item.estado,
      direccion: item.direccion || '',
      notas: item.notas || '',
    })
    setAuditInfo({ creador: null, modificador: null })
    setShowModal(true)
    if (item.creado_por) resolveUserName(item.creado_por).then(n => setAuditInfo(a => ({ ...a, creador: n })))
    if (item.modificado_por) resolveUserName(item.modificado_por).then(n => setAuditInfo(a => ({ ...a, modificador: n })))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editingItem) {
        const { error } = await updateInstalacion(editingItem.id, form)
        if (error) throw error
        notify('Instalación actualizada')
      } else {
        const { error } = await createInstalacion(form)
        if (error) throw error
        notify('Instalación creada')
      }
      setShowModal(false)
      fetchData()
    } catch (err) {
      const msg = err.message?.includes('uq_cotizacion_instalacion')
        ? 'Esta cotización ya tiene una instalación asignada. Selecciona otra cotización.'
        : err.message
      notify(msg, 'error')
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

  async function handleRestore(id) {
    const { error } = await restoreInstalacion(id)
    if (error) notify(error.message, 'error')
    else { notify('Instalación restaurada'); fetchData() }
  }

  const filtered = items.filter(i => {
    const matchSearch =
      (i.clientes?.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.direccion || '').toLowerCase().includes(search.toLowerCase())
    const matchEstado = filterEstado === 'todos' || i.estado === filterEstado
    return matchSearch && matchEstado
  })

  return (
    <div className="space-y-6">
      <Notification n={notification} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Instalaciones</h2>
          <p className="text-sm text-gray-500">{items.filter(i => i.activo !== false).length} instalaciones activas</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
          <Plus className="w-4 h-4" /> Nueva Instalación
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar por cliente o dirección..." value={search}
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
          <div className="text-center py-12 text-gray-400">No se encontraron instalaciones</div>
        ) : filtered.map(i => (
          <div key={i.id} className={`rounded-xl border p-4 shadow-sm space-y-2 ${i.activo === false ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={`font-medium ${i.activo === false ? 'line-through text-gray-400' : 'text-gray-900'}`}>{i.clientes?.nombre || <span className="text-gray-400">Sin cliente</span>}</p>
                <p className="text-sm text-gray-500">{i.fecha_instalacion || 'Sin fecha'}{i.direccion ? ` · ${i.direccion}` : ''}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${estadoColors[i.estado] || 'bg-gray-100 text-gray-600'}`}>{fmt(i.estado)}</span>
            </div>
            {i.notas && <p className="text-sm text-gray-500 truncate">{i.notas}</p>}
            {i.activo === false ? (
              <button onClick={() => handleRestore(i.id)} className="w-full flex items-center justify-center gap-1.5 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition border border-green-200">
                <RotateCcw className="w-4 h-4" /> Restaurar
              </button>
            ) : (
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button onClick={() => openEdit(i)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                  <Edit2 className="w-4 h-4" /> Editar
                </button>
                <button onClick={() => handleDelete(i.id)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg transition">
                  <Trash2 className="w-4 h-4" /> Eliminar
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
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Dirección</th>
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
                <tr key={i.id} className={i.activo === false ? 'bg-red-50' : 'hover:bg-gray-50 transition'}>
                  <td className={`px-6 py-4 font-medium ${i.activo === false ? 'line-through text-gray-400' : 'text-gray-900'}`}>{i.clientes?.nombre || <span className="text-gray-400">—</span>}</td>
                  <td className="px-6 py-4 text-gray-600">{i.fecha_instalacion || <span className="text-gray-400">—</span>}</td>
                  <td className="px-6 py-4 text-gray-600 max-w-xs truncate">{i.direccion || <span className="text-gray-300">—</span>}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${estadoColors[i.estado] || 'bg-gray-100 text-gray-600'}`}>{fmt(i.estado)}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-500 max-w-xs truncate">{i.notas || <span className="text-gray-300">—</span>}</td>
                  <td className="px-6 py-4 text-right">
                    {i.activo === false ? (
                      <button onClick={() => handleRestore(i.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-600 border border-green-200 hover:bg-green-50 rounded-lg transition font-medium ml-auto">
                        <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                      </button>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(i)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(i.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
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
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{editingItem ? 'Editar Instalación' : 'Nueva Instalación'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cotización Relacionada
                  <span className="ml-1 text-xs text-gray-400 font-normal">(solo aprobadas)</span>
                </label>
                <CotizacionCombobox
                  cotizaciones={cotizaciones}
                  value={form.cotizacion_id}
                  onChange={val => {
                    const cot = cotizaciones.find(c => c.id === val)
                    setForm(f => ({
                      ...f,
                      cotizacion_id: val,
                      direccion: cot?.clientes?.direccion || '',
                    }))
                  }}
                  editingItemCotizacionId={editingItem?.cotizacion_id}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Instalación</label>
                <input type="date" value={form.fecha_instalacion} onChange={e => setForm({ ...form, fecha_instalacion: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {['programada', 'en_proceso', 'completada', 'garantia'].map(s => <option key={s} value={s}>{fmt(s)}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input type="text" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })}
                  placeholder="Ej: Av. Los Álamos 123, Miraflores"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas técnicas</label>
                <textarea rows={2} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
              {editingItem?.creado_en && (
                <div className="sm:col-span-2 border-t border-gray-100 pt-3 space-y-1.5">
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
