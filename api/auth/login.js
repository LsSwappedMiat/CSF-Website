import { supabase } from '../../lib/supabase.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      return res.status(401).json({ error: error.message })
    }

    // Get user profile with flags
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    if (profileError) {
      console.warn('Profile not found:', profileError.message)
    }

    const user = {
      id: data.user.id,
      email: data.user.email,
      name: profile?.full_name || data.user.user_metadata?.name || 'User',
      flags: profile?.flags || {},
      session: data.session
    }

    res.status(200).json({ user, session: data.session })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}