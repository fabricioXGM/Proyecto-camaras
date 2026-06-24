import { supabase } from '../lib/supabase'

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

export const getMantenimientos = async () => {
  const { data, error } = await supabase
    .from('mantenimientos')
    .select('id_mantenimiento, id_instalacion, id_tecnico, fecha, tipo, descripcion, costo, estado, creado_en, instalaciones(id_instalacion, cotizaciones(id_cotizacion, clientes(nombre, id_cliente)))')
    .eq('activo', true)
    .order('fecha', { ascending: false })
  return { data: data?.map(tr) ?? null, error }
}

export const createMantenimiento = (data) =>
  supabase.from('mantenimientos').insert([{
    id_instalacion: data.instalacion_id || null,
    fecha: data.fecha,
    tipo: data.tipo,
    descripcion: data.descripcion || null,
    costo: data.costo ? Number(data.costo) : null,
    estado: data.estado,
    activo: true,
  }])

export const updateMantenimiento = (id, data) =>
  supabase.from('mantenimientos').update({
    id_instalacion: data.instalacion_id || null,
    fecha: data.fecha,
    tipo: data.tipo,
    descripcion: data.descripcion || null,
    costo: data.costo ? Number(data.costo) : null,
    estado: data.estado,
  }).eq('id_mantenimiento', id)

// Borrado lógico
export const deleteMantenimiento = (id) =>
  supabase.from('mantenimientos').update({ activo: false }).eq('id_mantenimiento', id)
