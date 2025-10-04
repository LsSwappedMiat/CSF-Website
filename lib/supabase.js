import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Client for frontend operations
export const supabase = createClient(supabaseUrl, supabaseKey)

// Admin client for backend operations (bypasses RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Helper function to get user from JWT token
export async function getUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return null
  
  const { data: { user }, error } = await supabase.auth.getUser(token)
  return error ? null : user
}

export default supabase