import { supabase } from '../lib/supabase'
import { getAuditUid } from '../lib/audit'

// Cliente se obtiene via: instalaciones → cotizaciones → clientes
const tr = (i) => {
  if (!i) return i
  return {
    ...i,
    id: i.id_instalacion,
    cotizacion_id: i.id_cotizacion,
    clientes: i.cotizaciones?.clientes || null,
    notas: i.notas_tecnicas,
  }
}

export const getInstalaciones = async ({ incluirEliminados = false } = {}) => {
  let q = supabase
    .from('instalaciones')
    .select('id_instalacion, id_cotizacion, id_tecnico, fecha_instalacion, estado, direccion, total_camaras, meses_garantia, garantia_hasta, notas_tecnicas, activo, creado_por, creado_en, modificado_por, modificado_en, cotizaciones(id_cotizacion, clientes(nombre, id_cliente))')
  if (!incluirEliminados) {
    q = q.eq('activo', true)
  } else {
    q = q.order('activo', { ascending: false })
  }
  const { data, error } = await q.order('creado_en', { ascending: false })
  return { data: data?.map(tr) ?? null, error }
}

export const getInstalacionesSelect = async () => {
  const { data, error } = await supabase
    .from('instalaciones')
    .select('id_instalacion, fecha_instalacion, estado, cotizaciones(clientes(nombre), detalle_cotizacion(subtotal, activo))')
    .eq('activo', true)
    .order('creado_en', { ascending: false })
  return {
    data: data?.map(i => ({
      ...i,
      id: i.id_instalacion,
      clientes: i.cotizaciones?.clientes || null,
      total_cotizacion: (i.cotizaciones?.detalle_cotizacion || [])
        .filter(l => l.activo !== false)
        .reduce((s, l) => s + Number(l.subtotal || 0), 0),
    })) ?? null,
    error,
  }
}

export const createInstalacion = async (data) => {
  const uid = await getAuditUid()
  return supabase.from('instalaciones').insert([{
    id_cotizacion: data.cotizacion_id || null,
    fecha_instalacion: data.fecha_instalacion || null,
    estado: data.estado,
    direccion: data.direccion || null,
    notas_tecnicas: data.notas || null,
    activo: true,
    creado_por: uid,
    creado_en: new Date().toISOString(),
  }])
}

export const updateInstalacion = async (id, data) => {
  const uid = await getAuditUid()
  return supabase.from('instalaciones').update({
    id_cotizacion: data.cotizacion_id || null,
    fecha_instalacion: data.fecha_instalacion || null,
    estado: data.estado,
    direccion: data.direccion || null,
    notas_tecnicas: data.notas || null,
    modificado_por: uid,
    modificado_en: new Date().toISOString(),
  }).eq('id_instalacion', id)
}

export const deleteInstalacion = async (id) => {
  const uid = await getAuditUid()
  return supabase.from('instalaciones').update({
    activo: false,
    modificado_por: uid,
    modificado_en: new Date().toISOString(),
  }).eq('id_instalacion', id)
}

export const restoreInstalacion = async (id) => {
  const uid = await getAuditUid()
  return supabase.from('instalaciones').update({
    activo: true,
    modificado_por: uid,
    modificado_en: new Date().toISOString(),
  }).eq('id_instalacion', id)
}
