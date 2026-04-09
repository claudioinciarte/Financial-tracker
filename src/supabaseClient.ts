import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kkbnmcsxpdyaqkilrttk.supabase.co'
const supabaseAnonKey = 'sb_publishable_Jx7bCMnktgXsA10zaIjp6A_OmNK4PWX'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
