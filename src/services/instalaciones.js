import { supabase } from '../lib/supabase'

export const getInstalaciones = () =>
  supabase
    .from('instalaciones')
    .select('*, clientes(nombre), cotizaciones(id, total)')
    .order('created_at', { ascending: false })

export const getInstalacionesSelect = () =>
  supabase
    .from('instalaciones')
    .select('id, clientes(nombre), fecha_instalacion')
    .order('created_at', { ascending: false })

export const createInstalacion = (data) =>
  supabase.from('instalaciones').insert([data])

export const updateInstalacion = (id, data) =>
  supabase.from('instalaciones').update(data).eq('id', id)

export const deleteInstalacion = (id) =>
  supabase.from('instalaciones').delete().eq('id', id)
