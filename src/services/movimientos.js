import { supabase } from '../lib/supabase'

// tipo en DB: 'I' = Ingreso, 'S' = Salida
// referencia en form → nro_comprobante en DB
const tr = (m) => m ? {
  ...m,
  id: m.id_movimiento,
  instalacion_id: m.id_instalacion,
  referencia: m.nro_comprobante,
} : m

export const getMovimientos = async () => {
  const { data, error } = await supabase
    .from('movimientos')
    .select('id_movimiento, tipo, categoria, concepto, monto, fecha, metodo_pago, nro_comprobante, id_instalacion, creado_en')
    .eq('activo', true)
    .order('fecha', { ascending: false })
  return { data: data?.map(tr) ?? null, error }
}

export const getMovimientosPorMes = (fechaInicio, fechaFin) =>
  supabase
    .from('movimientos')
    .select('tipo, monto')
    .eq('activo', true)
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin)

export const createMovimiento = (data) =>
  supabase.from('movimientos').insert([{
    tipo: data.tipo,
    categoria: data.categoria,
    concepto: data.concepto,
    monto: data.monto,
    fecha: data.fecha,
    metodo_pago: data.metodo_pago || null,
    nro_comprobante: data.referencia || null,
    id_instalacion: data.instalacion_id || null,
    activo: true,
  }])

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

// Borrado lógico
export const deleteMovimiento = (id) =>
  supabase.from('movimientos').update({ activo: false }).eq('id_movimiento', id)
