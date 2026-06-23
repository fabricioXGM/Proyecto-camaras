import { supabase } from '../lib/supabase'

export const getMovimientos = () =>
  supabase
    .from('movimientos')
    .select('*, instalaciones(id, clientes(nombre))')
    .order('fecha', { ascending: false })

export const getMovimientosPorMes = (fechaInicio, fechaFin) =>
  supabase
    .from('movimientos')
    .select('tipo, monto')
    .gte('fecha', fechaInicio)
    .lte('fecha', fechaFin)

export const createMovimiento = (data) =>
  supabase.from('movimientos').insert([data])

export const updateMovimiento = (id, data) =>
  supabase.from('movimientos').update(data).eq('id', id)

export const deleteMovimiento = (id) =>
  supabase.from('movimientos').delete().eq('id', id)
