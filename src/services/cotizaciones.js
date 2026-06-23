import { supabase } from '../lib/supabase'

// ── Cotizaciones ──────────────────────────────────────────────

export const getCotizaciones = () =>
  supabase
    .from('cotizaciones')
    .select('*, clientes(nombre)')
    .order('created_at', { ascending: false })

export const getCotizacionesSelect = () =>
  supabase
    .from('cotizaciones')
    .select('id, cliente_id, clientes(nombre), total')
    .order('created_at', { ascending: false })

export const getCotizacion = (id) =>
  supabase
    .from('cotizaciones')
    .select('*, clientes(nombre)')
    .eq('id', id)
    .single()

export const createCotizacion = (data) =>
  supabase.from('cotizaciones').insert([data]).select().single()

export const updateCotizacion = (id, data) =>
  supabase.from('cotizaciones').update(data).eq('id', id)

export const deleteCotizacion = (id) =>
  supabase.from('cotizaciones').delete().eq('id', id)

// ── Líneas de detalle ─────────────────────────────────────────

export const getLineas = (cotizacionId) =>
  supabase
    .from('cotizacion_detalle')
    .select('*')
    .eq('cotizacion_id', cotizacionId)
    .order('created_at')

export const createLinea = (data) =>
  supabase.from('cotizacion_detalle').insert([data])

export const updateLinea = (id, data) =>
  supabase.from('cotizacion_detalle').update(data).eq('id', id)

export const deleteLinea = (id) =>
  supabase.from('cotizacion_detalle').delete().eq('id', id)

export const recalcularTotal = async (cotizacionId) => {
  const { data: lineas } = await getLineas(cotizacionId)
  const total = (lineas || []).reduce((sum, l) => sum + Number(l.subtotal || 0), 0)
  return supabase.from('cotizaciones').update({ total }).eq('id', cotizacionId)
}
