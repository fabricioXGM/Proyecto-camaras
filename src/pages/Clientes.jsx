import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, X, AlertCircle, RotateCcw } from 'lucide-react'
import { getClientes, createCliente, updateCliente, deleteCliente, restoreCliente } from '../services/clientes'
import { resolveUserName, fmtDate } from '../lib/audit'
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

const fmt = (s) => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—'

const TIPOS = ['residencial', 'negocio', 'empresa']

const tipoColors = {
  residencial: 'bg-green-100 text-green-700',
  negocio:     'bg-blue-100 text-blue-700',
  empresa:     'bg-indigo-100 text-indigo-700',
}

const COMO_NOS_CONOCIO = ['recomendacion', 'redes', 'publicidad', 'otro']

const conocioColors = {
  recomendacion: 'bg-purple-100 text-purple-700',
  redes:         'bg-pink-100 text-pink-700',
  publicidad:    'bg-orange-100 text-orange-700',
  otro:          'bg-gray-100 text-gray-600',
}

const emptyForm = {
  nombre: '',
  email: '',
  telefono: '',
  tipo_cliente: 'residencial',
  documento_tipo: 'DNI',
  documento_numero: '',
  razon_social: '',
  contacto_nombre: '',
  distrito: '',
  direccion: '',
  referencia_ubicacion: '',
  como_nos_conocio: '',
}

export default function Clientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [mostrarEliminados, setMostrarEliminados] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [auditInfo, setAuditInfo] = useState({ creador: null, modificador: null })
  const { notification, notify } = useNotification()

  useEffect(() => { fetchData(false) }, [])

  async function fetchData(incl = mostrarEliminados) {
    setLoading(true)
    const { data } = await getClientes({ incluirEliminados: incl })
    setClientes(data || [])
    setLoading(false)
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
      nombre: item.nombre,
      email: item.email || '',
      telefono: item.telefono || '',
      tipo_cliente: item.tipo_cliente || 'residencial',
      documento_tipo: item.documento_tipo || 'DNI',
      documento_numero: item.documento_numero || '',
      razon_social: item.razon_social || '',
      contacto_nombre: item.contacto_nombre || '',
      distrito: item.distrito || '',
      direccion: item.direccion || '',
      referencia_ubicacion: item.referencia_ubicacion || '',
      como_nos_conocio: item.como_nos_conocio || '',
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
      const payload = {
        ...form,
        razon_social: ['negocio', 'empresa'].includes(form.tipo_cliente) ? form.razon_social : '',
      }
      if (editingItem) {
        const { error } = await updateCliente(editingItem.id, payload)
        if (error) throw error
        notify('Cliente actualizado correctamente')
      } else {
        const { error } = await createCliente(payload)
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
    if (!window.confirm('¿Eliminar este cliente?')) return
    const { error } = await deleteCliente(id)
    if (error) notify(error.message, 'error')
    else { notify('Cliente eliminado'); fetchData() }
  }

  async function handleRestore(id) {
    const { error } = await restoreCliente(id)
    if (error) notify(error.message, 'error')
    else { notify('Cliente restaurado'); fetchData() }
  }

  const filtered = clientes.filter(c =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.telefono || '').includes(search) ||
    (c.documento_numero || '').includes(search) ||
    (c.razon_social || '').toLowerCase().includes(search.toLowerCase())
  )

  const conRazonSocial = ['negocio', 'empresa'].includes(form.tipo_cliente)

  return (
    <div className="space-y-6">
      <Notification notification={notification} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Listado de Clientes</h2>
          <p className="text-sm text-gray-500">{clientes.filter(c => c.activo !== false).length} clientes activos</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
          <Plus className="w-4 h-4" /> Nuevo Cliente
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar por nombre, documento, email o teléfono..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <label className="flex items-center gap-1.5 text-sm text-gray-500 cursor-pointer select-none whitespace-nowrap">
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
          <div className="text-center py-12 text-gray-400">{search ? 'No se encontraron resultados' : 'No hay clientes registrados'}</div>
        ) : filtered.map(c => (
          <div key={c.id} className={`rounded-xl border p-4 shadow-sm space-y-2 ${c.activo === false ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={`font-medium ${c.activo === false ? 'line-through text-gray-400' : 'text-gray-900'}`}>{c.nombre}</p>
                {c.razon_social && <p className="text-xs text-gray-500">{c.razon_social}</p>}
                <p className="text-sm text-gray-500">{c.distrito || '—'}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {c.tipo_cliente && (
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${tipoColors[c.tipo_cliente] || 'bg-gray-100 text-gray-600'}`}>
                    {c.tipo_cliente}
                  </span>
                )}
                {c.como_nos_conocio && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${conocioColors[c.como_nos_conocio] || 'bg-gray-100 text-gray-600'}`}>
                    {fmt(c.como_nos_conocio)}
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm text-gray-500 space-y-0.5">
              {c.documento_tipo && c.documento_numero && (
                <p>{c.documento_tipo}: {c.documento_numero}</p>
              )}
              {c.email && <p>{c.email}</p>}
              {c.telefono && <p>{c.telefono}</p>}
              {c.contacto_nombre && <p className="text-xs">Contacto: {c.contacto_nombre}</p>}
            </div>
            {c.activo === false ? (
              <button onClick={() => handleRestore(c.id)} className="w-full flex items-center justify-center gap-1.5 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition border border-green-200">
                <RotateCcw className="w-4 h-4" /> Restaurar
              </button>
            ) : (
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button onClick={() => openEdit(c)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                  <Edit2 className="w-4 h-4" /> Editar
                </button>
                <button onClick={() => handleDelete(c.id)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg transition">
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
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Documento</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Distrito</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email / Teléfono</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nos conoció por</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12"><div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">{search ? 'No se encontraron resultados' : 'No hay clientes registrados'}</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className={c.activo === false ? 'bg-red-50' : 'hover:bg-gray-50 transition'}>
                  <td className="px-6 py-4">
                    <p className={`font-medium ${c.activo === false ? 'line-through text-gray-400' : 'text-gray-900'}`}>{c.nombre}</p>
                    {c.razon_social && <p className="text-xs text-gray-500 mt-0.5">{c.razon_social}</p>}
                    {c.contacto_nombre && <p className="text-xs text-gray-400 mt-0.5">Contacto: {c.contacto_nombre}</p>}
                  </td>
                  <td className="px-6 py-4">
                    {c.tipo_cliente
                      ? <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${tipoColors[c.tipo_cliente] || 'bg-gray-100 text-gray-600'}`}>{c.tipo_cliente}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {c.documento_tipo && c.documento_numero
                      ? <><span className="text-xs font-medium text-gray-500 mr-1">{c.documento_tipo}</span>{c.documento_numero}</>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{c.distrito || <span className="text-gray-300">—</span>}</td>
                  <td className="px-6 py-4">
                    <p className="text-gray-600">{c.email || <span className="text-gray-300">—</span>}</p>
                    {c.telefono && <p className="text-gray-500 text-xs mt-0.5">{c.telefono}</p>}
                  </td>
                  <td className="px-6 py-4">
                    {c.como_nos_conocio
                      ? <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${conocioColors[c.como_nos_conocio] || 'bg-gray-100 text-gray-600'}`}>{fmt(c.como_nos_conocio)}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {c.activo === false ? (
                      <button onClick={() => handleRestore(c.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-600 border border-green-200 hover:bg-green-50 rounded-lg transition font-medium ml-auto">
                        <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                      </button>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Editar"><Edit2 className="w-4 h-4" /></button>
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
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{editingItem ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg transition"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
                <input type="text" required value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              {/* Tipo de Cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cliente <span className="text-red-500">*</span></label>
                <select required value={form.tipo_cliente}
                  onChange={e => setForm({ ...form, tipo_cliente: e.target.value, razon_social: '' })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>

              {/* Razón Social — solo negocio/empresa */}
              {conRazonSocial && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social</label>
                  <input type="text" value={form.razon_social} onChange={e => setForm({ ...form, razon_social: e.target.value })}
                    placeholder="Nombre legal de la empresa..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              )}

              {/* Documento */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Doc. tipo</label>
                  <select value={form.documento_tipo} onChange={e => setForm({ ...form, documento_tipo: e.target.value, documento_numero: '' })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="DNI">DNI</option>
                    <option value="RUC">RUC</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">N° Documento</label>
                  <input type="text" value={form.documento_numero}
                    onChange={e => setForm({ ...form, documento_numero: e.target.value })}
                    placeholder={form.documento_tipo === 'DNI' ? '12345678 (8 dígitos)' : '12345678901 (11 dígitos)'}
                    maxLength={form.documento_tipo === 'DNI' ? 8 : 11}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              {/* Contacto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Persona de Contacto</label>
                <input type="text" value={form.contacto_nombre} onChange={e => setForm({ ...form, contacto_nombre: e.target.value })}
                  placeholder="Nombre de quien coordinar..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              {/* Email y Teléfono */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              </div>

              {/* Distrito */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Distrito <span className="text-red-500">*</span></label>
                <input type="text" required value={form.distrito} onChange={e => setForm({ ...form, distrito: e.target.value })}
                  placeholder="Ej: Miraflores, San Isidro, Surco..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              {/* Dirección */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input type="text" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })}
                  placeholder="Av./Jr./Calle, número..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              {/* Referencia de ubicación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referencia de ubicación</label>
                <textarea rows={2} value={form.referencia_ubicacion} onChange={e => setForm({ ...form, referencia_ubicacion: e.target.value })}
                  placeholder="Ej: Frente al parque, cerca al banco..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>

              {/* Cómo nos conoció */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">¿Cómo nos conoció?</label>
                <select value={form.como_nos_conocio} onChange={e => setForm({ ...form, como_nos_conocio: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Sin especificar</option>
                  {COMO_NOS_CONOCIO.map(v => <option key={v} value={v}>{fmt(v)}</option>)}
                </select>
              </div>

              {/* Auditoría */}
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
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition">Cancelar</button>
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
