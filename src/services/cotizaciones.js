import { supabase } from '../lib/supabase'

const tr = (c) => c ? {
  ...c,
  id: c.id_cotizacion,
  cliente_id: c.id_cliente,
  notas: c.observaciones,
} : c

const toDb = (data) => ({
  id_cliente: data.cliente_id || null,
  fecha: data.fecha,
  estado: data.estado,
  observaciones: data.notas || null,
})

// ── Cotizaciones ──────────────────────────────────────────────

export const getCotizaciones = async () => {
  const { data, error } = await supabase
    .from('cotizaciones')
    .select('id_cotizacion, id_cliente, fecha, estado, observaciones, creado_en, clientes(nombre), detalle_cotizacion(subtotal, activo)')
    .eq('activo', true)
    .order('creado_en', { ascending: false })
  return {
    data: data?.map(c => ({
      ...tr(c),
      // Calcula total desde las líneas activas, independiente del trigger de Supabase
      total: (c.detalle_cotizacion || [])
        .filter(l => l.activo !== false)
        .reduce((s, l) => s + Number(l.subtotal || 0), 0),
    })) ?? null,
    error,
  }
}

export const getCotizacionesSelect = async () => {
  const { data, error } = await supabase
    .from('cotizaciones')
    .select('id_cotizacion, id_cliente, clientes(nombre), detalle_cotizacion(subtotal, activo)')
    .eq('activo', true)
    .order('creado_en', { ascending: false })
  return {
    data: data?.map(c => ({
      ...tr(c),
      total: (c.detalle_cotizacion || [])
        .filter(l => l.activo !== false)
        .reduce((s, l) => s + Number(l.subtotal || 0), 0),
    })) ?? null,
    error,
  }
}

export const getCotizacion = async (id) => {
  const { data, error } = await supabase
    .from('cotizaciones')
    .select('id_cotizacion, id_cliente, fecha, estado, total, observaciones, creado_en, clientes(nombre)')
    .eq('id_cotizacion', id)
    .single()
  return { data: tr(data), error }
}

export const createCotizacion = async (data) => {
  const { data: created, error } = await supabase
    .from('cotizaciones')
    .insert([{ ...toDb(data), activo: true }])
    .select()
    .single()
  return { data: tr(created), error }
}

export const updateCotizacion = (id, data) =>
  supabase.from('cotizaciones').update(toDb(data)).eq('id_cotizacion', id)

// Borrado lógico
export const deleteCotizacion = (id) =>
  supabase.from('cotizaciones').update({ activo: false }).eq('id_cotizacion', id)

// ── Líneas de detalle (tabla: detalle_cotizacion) ─────────────

const trLinea = (l) => l ? {
  ...l,
  id: l.id_detalle,
  cotizacion_id: l.id_cotizacion,
} : l

export const getLineas = async (cotizacionId) => {
  const { data, error } = await supabase
    .from('detalle_cotizacion')
    .select('id_detalle, id_cotizacion, tipo_item, descripcion, cantidad, precio_unitario, subtotal, activo')
    .eq('id_cotizacion', cotizacionId)
    .eq('activo', true)
    .order('id_detalle')
  return { data: data?.map(trLinea) ?? null, error }
}

export const createLinea = (data) =>
  supabase.from('detalle_cotizacion').insert([{
    id_cotizacion: data.cotizacion_id,
    tipo_item: data.tipo_item || 'otro',
    descripcion: data.descripcion,
    cantidad: data.cantidad,
    precio_unitario: data.precio_unitario,
    subtotal: Number(data.cantidad) * Number(data.precio_unitario),
    activo: true,
  }])

export const updateLinea = (id, data) =>
  supabase.from('detalle_cotizacion').update({
    tipo_item: data.tipo_item || 'otro',
    descripcion: data.descripcion,
    cantidad: data.cantidad,
    precio_unitario: data.precio_unitario,
    subtotal: Number(data.cantidad) * Number(data.precio_unitario),
  }).eq('id_detalle', id)

// Borrado lógico
export const deleteLinea = (id) =>
  supabase.from('detalle_cotizacion').update({ activo: false }).eq('id_detalle', id)

// Trigger en Supabase actualiza el total automáticamente.
// Esta función es un respaldo por si el trigger no está activo.
export const recalcularTotal = async (cotizacionId) => {
  const { data: lineas } = await getLineas(cotizacionId)
  const total = (lineas || []).reduce((sum, l) => sum + Number(l.subtotal || 0), 0)
  return supabase.from('cotizaciones').update({ total }).eq('id_cotizacion', cotizacionId)
}
