import { supabase } from '../lib/supabase.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.status(200).json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}