import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Edit2, Trash2, X, Save, AlertCircle } from 'lucide-react'
import {
  getCotizacion, updateCotizacion,
  getLineas, createLinea, updateLinea, deleteLinea, recalcularTotal,
} from '../services/cotizaciones'
import { getClientesSelect } from '../services/clientes'
import { useNotification } from '../hooks/useNotification'

const fmt = (s) => s ? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—'

const estadoColors = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  aprobada: 'bg-green-100 text-green-700',
  rechazada: 'bg-red-100 text-red-700',
  vencida: 'bg-orange-100 text-orange-700',
}

const TIPOS_ITEM = ['camara', 'dvr', 'nvr', 'cable', 'canaleta', 'fuente', 'disco', 'monitor', 'mano_obra', 'otro']

function Notification({ n }) {
  if (!n) return null
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium ${n.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
      {n.type === 'error' && <AlertCircle className="w-4 h-4" />}{n.message}
    </div>
  )
}

const emptyLine = { tipo_item: 'otro', descripcion: '', cantidad: 1, precio_unitario: 0 }

export default function CotizacionDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cotizacion, setCotizacion] = useState(null)
  const [clientes, setClientes] = useState([])
  const [lineas, setLineas] = useState([])
  const [loading, setLoading] = useState(true)
  const [editHeader, setEditHeader] = useState(false)
  const [headerForm, setHeaderForm] = useState({})
  const [showLineModal, setShowLineModal] = useState(false)
  const [editingLine, setEditingLine] = useState(null)
  const [lineForm, setLineForm] = useState(emptyLine)
  const [saving, setSaving] = useState(false)
  const { notification, notify } = useNotification()

  useEffect(() => { fetchAll() }, [id])

  async function fetchAll() {
    setLoading(true)
    const [{ data: cot }, { data: lines }, { data: cls }] = await Promise.all([
      getCotizacion(id),
      getLineas(id),
      getClientesSelect(),
    ])
    if (cot) {
      setCotizacion(cot)
      setHeaderForm({ cliente_id: cot.cliente_id || '', fecha: cot.fecha, estado: cot.estado, notas: cot.notas || '' })
    }
    setLineas(lines || [])
    setClientes(cls || [])
    setLoading(false)
  }

  async function saveHeader(e) {
    e.preventDefault()
    setSaving(true)
    const { error } = await updateCotizacion(id, headerForm)
    if (error) notify(error.message, 'error')
    else { notify('Cotización actualizada'); setEditHeader(false); fetchAll() }
    setSaving(false)
  }

  function openAddLine() {
    setEditingLine(null)
    setLineForm(emptyLine)
    setShowLineModal(true)
  }

  function openEditLine(line) {
    setEditingLine(line)
    setLineForm({
      tipo_item: line.tipo_item || 'otro',
      descripcion: line.descripcion,
      cantidad: line.cantidad,
      precio_unitario: line.precio_unitario,
    })
    setShowLineModal(true)
  }

  async function handleLineSubmit(e) {
    e.preventDefault()
    const payload = { ...lineForm, cotizacion_id: id }
    setSaving(true)
    try {
      if (editingLine) {
        const { error } = await updateLinea(editingLine.id, payload)
        if (error) throw error
        notify('Línea actualizada')
      } else {
        const { error } = await createLinea(payload)
        if (error) throw error
        notify('Línea agregada')
      }
      setShowLineModal(false)
      const { data: newLineas } = await getLineas(id)
      setLineas(newLineas || [])
      await recalcularTotal(id)
      const { data: updatedCot } = await getCotizacion(id)
      setCotizacion(updatedCot)
    } catch (err) {
      notify(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteLine(lineId) {
    if (!window.confirm('¿Eliminar esta línea?')) return
    const { error } = await deleteLinea(lineId)
    if (error) { notify(error.message, 'error'); return }
    const { data: newLineas } = await getLineas(id)
    setLineas(newLineas || [])
    await recalcularTotal(id)
    const { data: updatedCot } = await getCotizacion(id)
    setCotizacion(updatedCot)
    notify('Línea eliminada')
  }

  const total = lineas.reduce((s, l) => s + Number(l.subtotal || 0), 0)

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
  if (!cotizacion) return <div className="text-center py-12 text-gray-400">Cotización no encontrada</div>

  return (
    <div className="space-y-6 max-w-5xl">
      <Notification n={notification} />

      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/cotizaciones')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition">
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
      </div>

      {/* Cotización Header Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-900">Información de la Cotización</h3>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${estadoColors[cotizacion.estado] || 'bg-gray-100 text-gray-600'}`}>
              {fmt(cotizacion.estado)}
            </span>
          </div>
          {!editHeader && (
            <button onClick={() => setEditHeader(true)} className="flex items-center gap-2 text-sm text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition">
              <Edit2 className="w-3.5 h-3.5" /> Editar
            </button>
          )}
        </div>

        {editHeader ? (
          <form onSubmit={saveHeader} className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <select value={headerForm.cliente_id} onChange={e => setHeaderForm({ ...headerForm, cliente_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Sin cliente</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input type="date" value={headerForm.fecha} onChange={e => setHeaderForm({ ...headerForm, fecha: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select value={headerForm.estado} onChange={e => setHeaderForm({ ...headerForm, estado: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {['pendiente', 'aprobada', 'rechazada', 'vencida'].map(s => (
                  <option key={s} value={s}>{fmt(s)}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <textarea rows={2} value={headerForm.notas} onChange={e => setHeaderForm({ ...headerForm, notas: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="button" onClick={() => setEditHeader(false)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition">Cancelar</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition disabled:opacity-50 font-medium">
                <Save className="w-4 h-4" />{saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        ) : (
          <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs mb-1">Cliente</p>
              <p className="font-medium text-gray-900">{cotizacion.clientes?.nombre || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Fecha</p>
              <p className="font-medium text-gray-900">{cotizacion.fecha}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Total</p>
              <p className="font-bold text-lg text-indigo-600">S/ {Number(cotizacion.total || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</p>
            </div>
            {cotizacion.notas && (
              <div className="col-span-2 sm:col-span-4">
                <p className="text-gray-500 text-xs mb-1">Notas</p>
                <p className="text-gray-700">{cotizacion.notas}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Líneas de Detalle</h3>
          <button onClick={openAddLine} className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-indigo-700 transition font-medium">
            <Plus className="w-4 h-4" /> Agregar Línea
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Descripción</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cantidad</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">P. Unitario</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subtotal</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lineas.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-sm">No hay líneas. Agregue items a esta cotización.</td></tr>
              ) : lineas.map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">{fmt(l.tipo_item || 'otro')}</span>
                  </td>
                  <td className="px-6 py-3 text-gray-800">{l.descripcion}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{Number(l.cantidad).toLocaleString('es-PE')}</td>
                  <td className="px-4 py-3 text-right text-gray-600">S/ {Number(l.precio_unitario).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">S/ {Number(l.subtotal).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEditLine(l)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteLine(l.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {lineas.length > 0 && (
              <tfoot className="bg-indigo-50 border-t-2 border-indigo-200">
                <tr>
                  <td colSpan={4} className="px-6 py-3 text-right font-semibold text-gray-700">TOTAL</td>
                  <td className="px-4 py-3 text-right font-bold text-lg text-indigo-700">
                    S/ {total.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Line Modal */}
      {showLineModal && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" onClick={() => setShowLineModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">{editingLine ? 'Editar Línea' : 'Nueva Línea'}</h2>
              <button onClick={() => setShowLineModal(false)} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleLineSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Item</label>
                <select value={lineForm.tipo_item} onChange={e => setLineForm({ ...lineForm, tipo_item: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {TIPOS_ITEM.map(t => (
                    <option key={t} value={t}>{fmt(t)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción <span className="text-red-500">*</span></label>
                <input type="text" required value={lineForm.descripcion} onChange={e => setLineForm({ ...lineForm, descripcion: e.target.value })}
                  placeholder="Ej: Cámara IP 4MP Hikvision, Cable UTP Cat6..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                  <input type="number" min="0.01" step="0.01" required value={lineForm.cantidad}
                    onChange={e => setLineForm({ ...lineForm, cantidad: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio Unitario</label>
                  <input type="number" min="0" step="0.01" required value={lineForm.precio_unitario}
                    onChange={e => setLineForm({ ...lineForm, precio_unitario: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="bg-indigo-50 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Subtotal:</span>
                <span className="text-lg font-bold text-indigo-700">
                  S/ {(Number(lineForm.cantidad) * Number(lineForm.precio_unitario)).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowLineModal(false)} className="flex-1 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition">Cancelar</button>
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
