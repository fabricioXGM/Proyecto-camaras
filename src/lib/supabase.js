import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://oyojlrelukoqthrmsrip.supabase.co'
const supabaseKey = 'sb_publishable_WPJVwd2N2Q3IkKANW3bnRw_UUWBGrb5'

export const supabase = createClient(supabaseUrl, supabaseKey)
