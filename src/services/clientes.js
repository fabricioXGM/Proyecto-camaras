import { supabase } from '../lib/supabase'

export const getClientes = () =>
  supabase.from('clientes').select('*').order('nombre')

export const getClientesSelect = () =>
  supabase.from('clientes').select('id, nombre').order('nombre')

export const createCliente = (data) =>
  supabase.from('clientes').insert([data])

export const updateCliente = (id, data) =>
  supabase.from('clientes').update(data).eq('id', id)

export const deleteCliente = (id) =>
  supabase.from('clientes').delete().eq('id', id)
