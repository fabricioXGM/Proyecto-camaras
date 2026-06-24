import { supabase } from '../lib/supabase'
import { getAuditUid } from '../lib/audit'

const tr = (c) => c ? { ...c, id: c.id_cliente } : c

const toDb = (data) => ({
  nombre: data.nombre,
  email: data.email || null,
  telefono: data.telefono || null,
  direccion: data.direccion || null,
  distrito: data.distrito,
  tipo_cliente: data.tipo_cliente,
  documento_tipo: data.documento_tipo || null,
  documento_numero: data.documento_numero || null,
  razon_social: data.razon_social || null,
  contacto_nombre: data.contacto_nombre || null,
  referencia_ubicacion: data.referencia_ubicacion || null,
  como_nos_conocio: data.como_nos_conocio || null,
})

export const getClientes = async ({ incluirEliminados = false } = {}) => {
  let q = supabase
    .from('clientes')
    .select('id_cliente, nombre, email, telefono, direccion, distrito, tipo_cliente, documento_tipo, documento_numero, razon_social, contacto_nombre, referencia_ubicacion, como_nos_conocio, activo, creado_por, creado_en, modificado_por, modificado_en')
  if (!incluirEliminados) {
    q = q.eq('activo', true)
  } else {
    q = q.order('activo', { ascending: false })
  }
  const { data, error } = await q.order('nombre')
  return { data: data?.map(tr) ?? null, error }
}

export const getClientesSelect = async () => {
  const { data, error } = await supabase
    .from('clientes')
    .select('id_cliente, nombre')
    .eq('activo', true)
    .order('nombre')
  return { data: data?.map(c => ({ id: c.id_cliente, nombre: c.nombre })) ?? null, error }
}

export const createCliente = async (data) => {
  const uid = await getAuditUid()
  const { data: created, error } = await supabase
    .from('clientes')
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

export const updateCliente = async (id, data) => {
  const uid = await getAuditUid()
  return supabase.from('clientes').update({
    ...toDb(data),
    modificado_por: uid,
    modificado_en: new Date().toISOString(),
  }).eq('id_cliente', id)
}

export const deleteCliente = async (id) => {
  const uid = await getAuditUid()
  return supabase.from('clientes').update({
    activo: false,
    modificado_por: uid,
    modificado_en: new Date().toISOString(),
  }).eq('id_cliente', id)
}

export const restoreCliente = async (id) => {
  const uid = await getAuditUid()
  return supabase.from('clientes').update({
    activo: true,
    modificado_por: uid,
    modificado_en: new Date().toISOString(),
  }).eq('id_cliente', id)
}
