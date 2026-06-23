import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, X, TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react'
import { getMovimientos, createMovimiento, updateMovimiento, deleteMovimiento } from '../services/movimientos'
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

const tipoColors = {
  Ingreso: 'bg-green-100 text-green-700',
  Salida: 'bg-red-100 text-red-700',
}

const emptyForm = {
  tipo: 'Ingreso', concepto: '', monto: '',
  fecha: new Date().toISOString().split('T')[0], referencia: '', instalacion_id: ''
}

export default function Movimientos() {
  const [items, setItems] = useState([])
  const [instalaciones, setInstalaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState('Todos')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const { notification, notify } = useNotification()

  useEffect(() => { fetchData(); fetchInstalaciones() }, [])

  async function fetchData() {
    setLoading(true)
    const { data } = await getMovimientos()
    setItems(data || [])
    setLoading(false)
  }

  async function fetchInstalaciones() {
    const { data } = await getInstalacionesSelect()
    setInstalaciones(data || [])
  }

  function openAdd() { setEditingItem(null); setForm(emptyForm); setShowModal(true) }

  function openEdit(item) {
    setEditingItem(item)
    setForm({
      tipo: item.tipo, concepto: item.concepto, monto: item.monto,
      fecha: item.fecha, referencia: item.referencia || '', instalacion_id: item.instalacion_id || ''
    })
    setShowModal(true)
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

  const filtered = items.filter(i => {
    const matchSearch = i.concepto.toLowerCase().includes(search.toLowerCase()) ||
      (i.referencia || '').toLowerCase().includes(search.toLowerCase())
    const matchTipo = filterTipo === 'Todos' || i.tipo === filterTipo
    return matchSearch && matchTipo
  })

  const totalIngresos = items.filter(i => i.tipo === 'Ingreso').reduce((s, i) => s + Number(i.monto), 0)
  const totalSalidas = items.filter(i => i.tipo === 'Salida').reduce((s, i) => s + Number(i.monto), 0)
  const balance = totalIngresos - totalSalidas

  return (
    <div className="space-y-6">
      <Notification n={notification} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Movimientos</h2>
          <p className="text-sm text-gray-500">{items.length} movimientos registrados</p>
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
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar por concepto o referencia..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex gap-1">
          {['Todos', 'Ingreso', 'Salida'].map(t => (
            <button key={t} onClick={() => setFilterTipo(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filterTipo === t ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
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
          <div className="text-center py-12 text-gray-400">No se encontraron movimientos</div>
        ) : filtered.map(i => (
          <div key={i.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-gray-900">{i.concepto}</p>
                <p className="text-sm text-gray-500">{i.fecha}{i.referencia ? ` · ${i.referencia}` : ''}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${tipoColors[i.tipo]}`}>{i.tipo}</span>
            </div>
            <p className={`text-base font-semibold ${i.tipo === 'Ingreso' ? 'text-green-600' : 'text-red-600'}`}>
              {i.tipo === 'Ingreso' ? '+' : '-'} S/ {Number(i.monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </p>
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
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Concepto</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Monto</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Referencia</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12"><div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">No se encontraron movimientos</td></tr>
              ) : filtered.map(i => (
                <tr key={i.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${tipoColors[i.tipo]}`}>{i.tipo}</span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">{i.concepto}</td>
                  <td className={`px-6 py-4 text-right font-semibold ${i.tipo === 'Ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                    {i.tipo === 'Ingreso' ? '+' : '-'} S/ {Number(i.monto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{i.fecha}</td>
                  <td className="px-6 py-4 text-gray-500">{i.referencia || <span className="text-gray-300">—</span>}</td>
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
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{editingItem ? 'Editar Movimiento' : 'Nuevo Movimiento'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo <span className="text-red-500">*</span></label>
                <div className="flex gap-3">
                  {['Ingreso', 'Salida'].map(t => (
                    <button key={t} type="button" onClick={() => setForm({ ...form, tipo: t })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition ${form.tipo === t ? (t === 'Ingreso' ? 'border-green-500 bg-green-50 text-green-700' : 'border-red-500 bg-red-50 text-red-700') : 'border-gray-300 text-gray-600'}`}>
                      {t === 'Ingreso' ? '↑ ' : '↓ '}{t}
                    </button>
                  ))}
                </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Referencia</label>
                <input type="text" value={form.referencia} onChange={e => setForm({ ...form, referencia: e.target.value })}
                  placeholder="N° factura, recibo, etc."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instalación Relacionada</label>
                <select value={form.instalacion_id} onChange={e => setForm({ ...form, instalacion_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Sin instalación</option>
                  {instalaciones.map(i => <option key={i.id} value={i.id}>{i.clientes?.nombre || 'Sin cliente'} — {i.fecha_instalacion || 'Sin fecha'}</option>)}
                </select>
              </div>
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
