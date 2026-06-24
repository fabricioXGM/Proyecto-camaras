import { supabase } from '../lib/supabase'

const tr = (c) => c ? { ...c, id: c.id_cliente } : c

export const getClientes = async () => {
  const { data, error } = await supabase
    .from('clientes')
    .select('id_cliente, nombre, email, telefono, direccion, distrito, tipo_cliente, activo')
    .eq('activo', true)
    .order('nombre')
  return { data: data?.map(tr) ?? null, error }
}

export const getClientesSelect = async () => {
  const { data, error } = await supabase
    .from('clientes')
    .select('id_cliente, nombre')
    .eq('activo', true)
    .order('nombre')
  return { data: data?.map(tr) ?? null, error }
}

export const createCliente = (data) =>
  supabase.from('clientes').insert([{
    nombre: data.nombre,
    email: data.email || null,
    telefono: data.telefono || null,
    direccion: data.direccion || null,
    distrito: data.distrito,
    tipo_cliente: data.tipo_cliente,
    activo: true,
  }])

export const updateCliente = (id, data) =>
  supabase.from('clientes').update({
    nombre: data.nombre,
    email: data.email || null,
    telefono: data.telefono || null,
    direccion: data.direccion || null,
    distrito: data.distrito,
    tipo_cliente: data.tipo_cliente,
  }).eq('id_cliente', id)

// Borrado lógico — nunca DELETE físico
export const deleteCliente = (id) =>
  supabase.from('clientes').update({ activo: false }).eq('id_cliente', id)
