import { supabase } from '../lib/supabase'
import { getAuditUid } from '../lib/audit'

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

export const getCotizaciones = async ({ incluirEliminados = false } = {}) => {
  let q = supabase
    .from('cotizaciones')
    .select('id_cotizacion, id_cliente, fecha, estado, observaciones, activo, creado_por, creado_en, modificado_por, modificado_en, clientes(nombre), detalle_cotizacion(subtotal, activo)')
  if (!incluirEliminados) {
    q = q.eq('activo', true)
  } else {
    q = q.order('activo', { ascending: false })
  }
  const { data, error } = await q.order('creado_en', { ascending: false })
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

export const getCotizacionesSelect = async () => {
  const [{ data: cotData, error }, { data: instData }] = await Promise.all([
    supabase
      .from('cotizaciones')
      .select('id_cotizacion, id_cliente, estado, clientes(nombre, direccion), detalle_cotizacion(subtotal, activo)')
      .eq('activo', true)
      .order('creado_en', { ascending: false }),
    supabase
      .from('instalaciones')
      .select('id_cotizacion')
      .eq('activo', true),
  ])
  if (error) return { data: null, error }
  const usadas = new Set((instData || []).map(i => i.id_cotizacion))
  return {
    data: cotData?.map(c => ({
      ...tr(c),
      total: (c.detalle_cotizacion || [])
        .filter(l => l.activo !== false)
        .reduce((s, l) => s + Number(l.subtotal || 0), 0),
      yaUsada: usadas.has(c.id_cotizacion),
    })) ?? null,
    error: null,
  }
}

export const getCotizacion = async (id) => {
  const { data, error } = await supabase
    .from('cotizaciones')
    .select('id_cotizacion, id_cliente, fecha, estado, total, observaciones, creado_por, creado_en, modificado_por, modificado_en, clientes(nombre)')
    .eq('id_cotizacion', id)
    .single()
  return { data: tr(data), error }
}

export const createCotizacion = async (data) => {
  const uid = await getAuditUid()
  const { data: created, error } = await supabase
    .from('cotizaciones')
    .insert([{
      ...toDb(data),
      activo: true,
      creado_por: uid,
      creado_en: new Date().toISOString(),
    }])
    .select()
    .single()
  return { data: tr(created), error }
}

export const updateCotizacion = async (id, data) => {
  const uid = await getAuditUid()
  return supabase.from('cotizaciones').update({
    ...toDb(data),
    modificado_por: uid,
    modificado_en: new Date().toISOString(),
  }).eq('id_cotizacion', id)
}

export const deleteCotizacion = async (id) => {
  const uid = await getAuditUid()
  return supabase.from('cotizaciones').update({
    activo: false,
    modificado_por: uid,
    modificado_en: new Date().toISOString(),
  }).eq('id_cotizacion', id)
}

export const restoreCotizacion = async (id) => {
  const uid = await getAuditUid()
  return supabase.from('cotizaciones').update({
    activo: true,
    modificado_por: uid,
    modificado_en: new Date().toISOString(),
  }).eq('id_cotizacion', id)
}

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

export const deleteLinea = (id) =>
  supabase.from('detalle_cotizacion').update({ activo: false }).eq('id_detalle', id)

// Respaldo por si el trigger de Supabase no está activo
export const recalcularTotal = async (cotizacionId) => {
  const { data: lineas } = await getLineas(cotizacionId)
  const total = (lineas || []).reduce((sum, l) => sum + Number(l.subtotal || 0), 0)
  return supabase.from('cotizaciones').update({ total }).eq('id_cotizacion', cotizacionId)
}
