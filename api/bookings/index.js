import { supabaseAdmin, getUser } from '../../lib/supabase.js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      // Get bookings (admin only)
      const user = await getUser(req)
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      // Check if user is admin
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('flags')
        .eq('id', user.id)
        .single()

      if (!profile?.flags?.admin) {
        return res.status(403).json({ error: 'Admin access required' })
      }

      const { data: bookings, error } = await supabaseAdmin
        .from('bookings')
        .select(`
          *,
          spots(id, price, description)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      res.status(200).json(bookings)
    }
    else if (req.method === 'POST') {
      // Create new booking
      const {
        spot_id,
        customer_name,
        company_name,
        email,
        phone,
        website,
        description,
        addons,
        total_amount
      } = req.body

      // Check if spot is available
      const { data: existingBooking } = await supabaseAdmin
        .from('bookings')
        .select('id')
        .eq('spot_id', spot_id)
        .eq('status', 'confirmed')
        .single()

      if (existingBooking) {
        return res.status(400).json({ error: 'Spot is already booked' })
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(total_amount * 100), // Convert to cents
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          spot_id,
          customer_name,
          company_name
        }
      })

      // Create booking record
      const { data: booking, error } = await supabaseAdmin
        .from('bookings')
        .insert({
          spot_id,
          customer_name,
          company_name,
          email,
          phone,
          website,
          description,
          addons: addons || [],
          total_amount,
          status: 'pending',
          payment_intent_id: paymentIntent.id
        })
        .select()
        .single()

      if (error) {
        return res.status(500).json({ error: error.message })
      }

      res.status(201).json({
        booking,
        client_secret: paymentIntent.client_secret
      })
    }
    else {
      res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Bookings API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}