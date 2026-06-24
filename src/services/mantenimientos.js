import { supabase } from '../lib/supabase'
import { getAuditUid } from '../lib/audit'

// Cliente via: mantenimientos → instalaciones → cotizaciones → clientes
const tr = (m) => {
  if (!m) return m
  return {
    ...m,
    id: m.id_mantenimiento,
    instalacion_id: m.id_instalacion,
    clientes: m.instalaciones?.cotizaciones?.clientes || null,
  }
}

export const getMantenimientos = async ({ incluirEliminados = false } = {}) => {
  let q = supabase
    .from('mantenimientos')
    .select('id_mantenimiento, id_instalacion, id_tecnico, fecha, tipo, descripcion, costo, estado, activo, creado_por, creado_en, instalaciones(id_instalacion, cotizaciones(id_cotizacion, clientes(nombre, id_cliente)))')
  if (!incluirEliminados) {
    q = q.eq('activo', true)
  } else {
    q = q.order('activo', { ascending: false })
  }
  const { data, error } = await q.order('fecha', { ascending: false })
  return { data: data?.map(tr) ?? null, error }
}

export const createMantenimiento = async (data) => {
  const uid = await getAuditUid()
  return supabase.from('mantenimientos').insert([{
    id_instalacion: data.instalacion_id || null,
    fecha: data.fecha,
    tipo: data.tipo,
    descripcion: data.descripcion || null,
    costo: data.costo ? Number(data.costo) : null,
    estado: data.estado,
    activo: true,
    creado_por: uid,
    creado_en: new Date().toISOString(),
  }])
}

export const updateMantenimiento = (id, data) =>
  supabase.from('mantenimientos').update({
    id_instalacion: data.instalacion_id || null,
    fecha: data.fecha,
    tipo: data.tipo,
    descripcion: data.descripcion || null,
    costo: data.costo ? Number(data.costo) : null,
    estado: data.estado,
  }).eq('id_mantenimiento', id)

export const deleteMantenimiento = (id) =>
  supabase.from('mantenimientos').update({ activo: false }).eq('id_mantenimiento', id)

export const restoreMantenimiento = (id) =>
  supabase.from('mantenimientos').update({ activo: true }).eq('id_mantenimiento', id)
