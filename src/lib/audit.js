import { supabase } from './supabase'

const userCache = {}
let cachedUid = null

// usuarios.id_usuario puede ser INTEGER — busca por email del usuario auth
export async function getAuditUid() {
  if (cachedUid !== null) return cachedUid
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase
      .from('usuarios')
      .select('id_usuario')
      .eq('email', user.email)
      .single()
    cachedUid = data?.id_usuario ?? null
    return cachedUid
  } catch {
    return null
  }
}

export async function resolveUserName(uid) {
  if (uid === null || uid === undefined) return null
  if (userCache[uid]) return userCache[uid]
  try {
    const { data } = await supabase
      .from('usuarios')
      .select('nombre')
      .eq('id_usuario', uid)
      .single()
    if (data?.nombre) {
      userCache[uid] = data.nombre
      return data.nombre
    }
  } catch {}
  const fallback = String(uid)
  userCache[uid] = fallback
  return fallback
}

export function fmtDate(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  const p = n => n.toString().padStart(2, '0')
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`
}
