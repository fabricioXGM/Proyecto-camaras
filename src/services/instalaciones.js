import { supabase } from '../lib/supabase'

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

export const getInstalaciones = async () => {
  const { data, error } = await supabase
    .from('instalaciones')
    .select('id_instalacion, id_cotizacion, id_tecnico, fecha_instalacion, estado, direccion, total_camaras, meses_garantia, garantia_hasta, notas_tecnicas, creado_en, cotizaciones(id_cotizacion, clientes(nombre, id_cliente))')
    .eq('activo', true)
    .order('creado_en', { ascending: false })
  return { data: data?.map(tr) ?? null, error }
}

export const getInstalacionesSelect = async () => {
  const { data, error } = await supabase
    .from('instalaciones')
    .select('id_instalacion, fecha_instalacion, cotizaciones(clientes(nombre))')
    .eq('activo', true)
    .order('creado_en', { ascending: false })
  return {
    data: data?.map(i => ({
      ...i,
      id: i.id_instalacion,
      clientes: i.cotizaciones?.clientes || null,
    })) ?? null,
    error,
  }
}

export const createInstalacion = (data) =>
  supabase.from('instalaciones').insert([{
    id_cotizacion: data.cotizacion_id || null,
    fecha_instalacion: data.fecha_instalacion || null,
    estado: data.estado,
    direccion: data.direccion || null,
    notas_tecnicas: data.notas || null,
    activo: true,
  }])

export const updateInstalacion = (id, data) =>
  supabase.from('instalaciones').update({
    id_cotizacion: data.cotizacion_id || null,
    fecha_instalacion: data.fecha_instalacion || null,
    estado: data.estado,
    direccion: data.direccion || null,
    notas_tecnicas: data.notas || null,
  }).eq('id_instalacion', id)

// Borrado lógico
export const deleteInstalacion = (id) =>
  supabase.from('instalaciones').update({ activo: false }).eq('id_instalacion', id)
