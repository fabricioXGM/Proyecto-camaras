import { supabase } from '../lib/supabase'
import { getAuditUid } from '../lib/audit'

// tipo en DB: 'I' = Ingreso, 'S' = Salida
const tr = (m) => m ? {
  ...m,
  id: m.id_movimiento,
  instalacion_id: m.id_instalacion,
  referencia: m.nro_comprobante,
} : m

export const getMovimientos = async ({ incluirEliminados = false } = {}) => {
  let q = supabase
    .from('movimientos')
    .select('id_movimiento, tipo, categoria, concepto, monto, fecha, metodo_pago, nro_comprobante, id_instalacion, activo, creado_por, creado_en')
  if (!incluirEliminados) {
    q = q.eq('activo', true)
  } else {
    q = q.order('activo', { ascending: false })
  }
  const { data, error } = await q.order('fecha', { ascending: false })
  return { data: data?.map(tr) ?? null, error }
}

export const getMovimientosPorMes = (fechaInicio, fechaFin) =>
  supabase
    .from('movimientos')
    .select('tipo, monto')
    .eq('activo', true)
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin)

export const createMovimiento = async (data) => {
  const uid = await getAuditUid()
  return supabase.from('movimientos').insert([{
    tipo: data.tipo,
    categoria: data.categoria,
    concepto: data.concepto,
    monto: data.monto,
    fecha: data.fecha,
    metodo_pago: data.metodo_pago || null,
    nro_comprobante: data.referencia || null,
    id_instalacion: data.instalacion_id || null,
    activo: true,
    creado_por: uid,
    creado_en: new Date().toISOString(),
  }])
}

export const updateMovimiento = (id, data) =>
  supabase.from('movimientos').update({
    tipo: data.tipo,
    categoria: data.categoria,
    concepto: data.concepto,
    monto: data.monto,
    fecha: data.fecha,
    metodo_pago: data.metodo_pago || null,
    nro_comprobante: data.referencia || null,
    id_instalacion: data.instalacion_id || null,
  }).eq('id_movimiento', id)

export const deleteMovimiento = (id) =>
  supabase.from('movimientos').update({ activo: false }).eq('id_movimiento', id)

export const restoreMovimiento = (id) =>
  supabase.from('movimientos').update({ activo: true }).eq('id_movimiento', id)
