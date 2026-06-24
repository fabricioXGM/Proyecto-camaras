import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, X, TrendingUp, TrendingDown, DollarSign, AlertCircle, RotateCcw, ChevronDown } from 'lucide-react'
import { getMovimientos, createMovimiento, updateMovimiento, deleteMovimiento, restoreMovimiento } from '../services/movimientos'
import { getInstalacionesSelect } from '../services/instalaciones'
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

const TIPO_LABEL = { I: 'Ingreso', S: 'Salida' }
const tipoColors = {
  I: 'bg-green-100 text-green-700',
  S: 'bg-red-100 text-red-700',
}

const CATEGORIAS = {
  I: ['cobro_instalacion', 'adelanto', 'saldo', 'cobro_mantenimiento', 'otro_ingreso'],
  S: ['equipos', 'herramientas', 'combustible', 'publicidad', 'servicios', 'alquiler', 'otro_gasto'],
}
const METODOS_PAGO = ['efectivo', 'yape', 'plin', 'transferencia']

function InstalacionCombobox({ instalaciones, value, onChange, isNew = false, placeholder = 'Sin instalación (gasto general)' }) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const disponibles = isNew ? instalaciones.filter(i => i.estado !== 'completada') : instalaciones
  const seleccionada = instalaciones.find(i => i.id === value)
  const labelSeleccionada = seleccionada
    ? `${seleccionada.clientes?.nombre || 'Sin cliente'} — ${seleccionada.fecha_instalacion || 'Sin fecha'}`
    : ''
  const filtradas = disponibles.filter(i => {
    const label = `${i.clientes?.nombre || ''} ${i.fecha_instalacion || ''}`
    return label.toLowerCase().includes(search.toLowerCase())
  })
  return (
    <div className="relative">
      <div className="relative">
        <input type="text"
          value={open ? search : labelSeleccionada}
          onFocus={() => { setOpen(true); setSearch('') }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={e => setSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>
      {open && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          <div onMouseDown={() => { onChange(''); setOpen(false) }}
            className="px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm text-gray-400 border-b border-gray-100">
            {placeholder}
          </div>
          {filtradas.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">
              {isNew && disponibles.length === 0 ? 'No hay instalaciones activas disponibles' : 'Sin resultados'}
            </div>
          ) : filtradas.map(i => (
            <div key={i.id} onMouseDown={() => { onChange(i.id); setOpen(false) }}
              className={`px-3 py-2 cursor-pointer hover:bg-indigo-50 text-sm ${value === i.id ? 'bg-indigo-50 font-medium text-indigo-700' : 'text-gray-800'}`}>
              <span className="font-medium">{i.clientes?.nombre || 'Sin cliente'}</span>
              <span className="text-gray-500 ml-2">{i.fecha_instalacion || 'Sin fecha'}</span>
            </div>
          ))}
        </div>
      )}
      {isNew && instalaciones.some(i => i.estado === 'completada') && (
        <p className="mt-1 text-xs text-gray-400">Las instalaciones completadas no admiten nuevos movimientos</p>
      )}
    </div>
  )
}

const emptyForm = {
  tipo: 'I', categoria: '', concepto: '', monto: '',
  fecha: new Date().toISOString().split('T')[0],
  metodo_pago: '', referencia: '', instalacion_id: '',
}

export default function Movimientos() {
  const [items, setItems] = useState([])
  const [instalaciones, setInstalaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState('Todos')
  const [mostrarEliminados, setMostrarEliminados] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [auditInfo, setAuditInfo] = useState({ creador: null, modificador: null })
  const { notification, notify } = useNotification()

  useEffect(() => { fetchData(false); fetchInstalaciones() }, [])

  async function fetchData(incl = mostrarEliminados) {
    setLoading(true)
    const { data } = await getMovimientos({ incluirEliminados: incl })
    setItems(data || [])
    setLoading(false)
  }

  async function fetchInstalaciones() {
    const { data } = await getInstalacionesSelect()
    setInstalaciones(data || [])
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
      tipo: item.tipo,
      categoria: item.categoria || '',
      concepto: item.concepto,
      monto: item.monto,
      fecha: item.fecha,
      metodo_pago: item.metodo_pago || '',
      referencia: item.referencia || '',
      instalacion_id: item.instalacion_id || '',
    })
    setAuditInfo({ creador: null, modificador: null })
    setShowModal(true)
    if (item.creado_por) resolveUserName(item.creado_por).then(n => setAuditInfo(a => ({ ...a, creador: n })))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = { ...form, monto: Number(form.monto), instalacion_id: form.instalacion_id || null }
    setSaving(true)
    try {
      if (editingItem) {
        const { error } = await updateMovimiento(editingItem.id, payload)
        if (error) throw error
        notify('Movimiento actualizado')
      } else {
        const { error } = await createMovimiento(payload)
        if (error) throw error
        notify('Movimiento registrado')
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
    if (!window.confirm('¿Eliminar este movimiento?')) return
    const { error } = await deleteMovimiento(id)
    if (error) notify(error.message, 'error')
    else { notify('Movimiento eliminado'); fetchData() }
  }

  async function handleRestore(id) {
    const { error } = await restoreMovimiento(id)
    if (error) notify(error.message, 'error')
    else { notify('Movimiento restaurado'); fetchData() }
  }

  const filtered = items.filter(i => {
    const matchSearch =
      i.concepto.toLowerCase().includes(search.toLowerCase()) ||
      (i.referencia || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.categoria || '').toLowerCase().includes(search.toLowerCase())
    const matchTipo = filterTipo === 'Todos' || i.tipo === filterTipo
    return matchSearch && matchTipo
  })

  const activeItems = items.filter(i => i.activo !== false)
  const totalIngresos = activeItems.filter(i => i.tipo === 'I').reduce((s, i) => s + Number(i.monto), 0)
  const totalSalidas = activeItems.filter(i => i.tipo === 'S').reduce((s, i) => s + Number(i.monto), 0)
  const balance = totalIngresos - totalSalidas

  return (
    <div className="space-y-6">
      <Notification n={notification} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Movimientos</h2>
          <p className="text-sm text-gray-500">{activeItems.length} movimientos activos</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
          <Plus className="w-4 h-4" /> Nuevo Movimiento
        </button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Ingresos</p>
            <p className="text-lg font-bold text-green-600">S/ {totalIngresos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Salidas</p>
            <p className="text-lg font-bold text-red-600">S/ {totalSalidas.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${balance >= 0 ? 'bg-indigo-50' : 'bg-red-50'}`}>
            <DollarSign className={`w-5 h-5 ${balance >= 0 ? 'text-indigo-600' : 'text-red-600'}`} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Balance</p>
            <p className={`text-lg font-bold ${balance >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
              S/ {balance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar por concepto, categoría o referencia..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex gap-1">
          {[{ key: 'Todos', label: 'Todos' }, { key: 'I', label: 'Ingresos' }, { key: 'S', label: 'Salidas' }].map(t => (
            <button key={t.key} onClick={() => setFilterTipo(t.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filterTipo === t.key ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
              {t.label}
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
          <div className="text-center py-12 text-gray-400">No se encontraron movimientos</div>
        ) : filtered.map(i => (
          <div key={i.id} className={`rounded-xl border p-4 shadow-sm space-y-2 ${i.activo === false ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={`font-medium ${i.activo === false ? 'line-through text-gray-400' : 'text-gray-900'}`}>{i.concepto}</p>
                <p className="text-sm text-gray-500">
                  {i.fecha}
                  {i.categoria ? ` · ${fmt(i.categoria)}` : ''}
                  {i.referencia ? ` · ${i.referencia}` : ''}
                </p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${tipoColors[i.tipo]}`}>{TIPO_LABEL[i.tipo]}</span>
            </div>
            <p className={`text-base font-semibold ${i.tipo === 'I' ? 'text-green-600' : 'text-red-600'}`}>
              {i.tipo === 'I' ? '+' : '-'} S/ {Number(i.monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </p>
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
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Concepto</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoría</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Monto</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Método</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12"><div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No se encontraron movimientos</td></tr>
              ) : filtered.map(i => (
                <tr key={i.id} className={i.activo === false ? 'bg-red-50' : 'hover:bg-gray-50 transition'}>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${tipoColors[i.tipo]}`}>{TIPO_LABEL[i.tipo]}</span>
                  </td>
                  <td className={`px-6 py-4 font-medium ${i.activo === false ? 'line-through text-gray-400' : 'text-gray-900'}`}>{i.concepto}</td>
                  <td className="px-6 py-4 text-gray-500">{i.categoria ? fmt(i.categoria) : <span className="text-gray-300">—</span>}</td>
                  <td className={`px-6 py-4 text-right font-semibold ${i.tipo === 'I' ? 'text-green-600' : 'text-red-600'}`}>
                    {i.tipo === 'I' ? '+' : '-'} S/ {Number(i.monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{i.fecha}</td>
                  <td className="px-6 py-4 text-gray-500">{i.metodo_pago ? fmt(i.metodo_pago) : <span className="text-gray-300">—</span>}</td>
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
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{editingItem ? 'Editar Movimiento' : 'Nuevo Movimiento'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo <span className="text-red-500">*</span></label>
                <div className="flex gap-3">
                  {[{ key: 'I', label: 'Ingreso', icon: '↑' }, { key: 'S', label: 'Salida', icon: '↓' }].map(t => (
                    <button key={t.key} type="button"
                      onClick={() => setForm({ ...form, tipo: t.key, categoria: '' })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition ${
                        form.tipo === t.key
                          ? (t.key === 'I' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700')
                          : 'border-gray-300 text-gray-600'
                      }`}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría <span className="text-red-500">*</span></label>
                <select required value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Seleccionar categoría...</option>
                  {CATEGORIAS[form.tipo].map(c => <option key={c} value={c}>{fmt(c)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concepto <span className="text-red-500">*</span></label>
                <input type="text" required value={form.concepto} onChange={e => setForm({ ...form, concepto: e.target.value })}
                  placeholder="Ej: Pago instalación, Compra de cámaras..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto (S/) <span className="text-red-500">*</span></label>
                  <input type="number" min="0.01" step="0.01" required value={form.monto}
                    onChange={e => setForm({ ...form, monto: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                  <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                <select value={form.metodo_pago} onChange={e => setForm({ ...form, metodo_pago: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Sin especificar</option>
                  {METODOS_PAGO.map(m => <option key={m} value={m}>{fmt(m)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">N° Comprobante</label>
                <input type="text" value={form.referencia} onChange={e => setForm({ ...form, referencia: e.target.value })}
                  placeholder="N° factura, recibo, etc."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instalación Relacionada</label>
                <InstalacionCombobox
                  instalaciones={instalaciones}
                  value={form.instalacion_id}
                  isNew={!editingItem}
                  onChange={val => {
                    const inst = instalaciones.find(i => i.id === val)
                    setForm(f => ({
                      ...f,
                      instalacion_id: val,
                      monto: val && inst?.total_cotizacion ? String(inst.total_cotizacion) : f.monto,
                    }))
                  }}
                />
              </div>
              {editingItem?.creado_en && (
                <div className="border-t border-gray-100 pt-3 space-y-1.5">
                  <p className="text-xs text-gray-400">
                    Creado por <span className="text-gray-600 font-medium">{auditInfo.creador || '…'}</span>{' el '}{fmtDate(editingItem.creado_en)}
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-1 pb-2">
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
