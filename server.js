import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });

// POST /create-payment-intent { amount, name, email }
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, name, email } = req.body;
    if (!amount) return res.status(400).json({ error: 'Amount required' });
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      receipt_email: email,
      metadata: { name: name || '', email: email || '' }
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`Stripe backend running on port ${PORT}`);
});
