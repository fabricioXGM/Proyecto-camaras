import { supabase } from '../lib/supabase'

export const getMantenimientos = () =>
  supabase
    .from('mantenimientos')
    .select('*, clientes(nombre), instalaciones(id, fecha_instalacion)')
    .order('fecha', { ascending: false })

export const createMantenimiento = (data) =>
  supabase.from('mantenimientos').insert([data])

export const updateMantenimiento = (id, data) =>
  supabase.from('mantenimientos').update(data).eq('id', id)

export const deleteMantenimiento = (id) =>
  supabase.from('mantenimientos').delete().eq('id', id)
