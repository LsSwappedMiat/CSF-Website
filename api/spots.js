import { supabaseAdmin } from '../lib/supabase.js'

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Get all spots
      const { data: spots, error } = await supabaseAdmin
        .from('spots')
        .select('*')
        .order('id')

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      res.status(200).json(spots)
    } 
    else if (req.method === 'POST') {
      // Create or update spot
      const spotData = req.body

      const { data, error } = await supabaseAdmin
        .from('spots')
        .upsert(spotData)
        .select()

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      res.status(201).json(data[0])
    }
    else if (req.method === 'PUT') {
      // Bulk update spots (for admin editing)
      const spots = req.body

      const { data, error } = await supabaseAdmin
        .from('spots')
        .upsert(spots)
        .select()

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      res.status(200).json(data)
    }
    else {
      res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Spots API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}