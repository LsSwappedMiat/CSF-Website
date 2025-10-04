# CSF Website Stripe Payment Backend

This is a minimal Node/Express backend for Stripe payment processing for the CSF Website booking form.

## Setup

1. Install dependencies:

```sh
npm install
```

2. Copy `.env.example` to `.env` and fill in your Stripe secret key:

```
cp .env.example .env
# Edit .env and set STRIPE_SECRET_KEY=sk_test_...
```

3. Start the server:

```sh
npm start
```

The server will run on port 4242 by default.

## Endpoint

### POST /create-payment-intent

Request body (JSON):
```
{
  "amount": 1234, // amount in cents
  "name": "Full Name",
  "email": "user@example.com"
}
```

Response:
```
{
  "clientSecret": "..."
}
```

## Frontend integration
- The booking form will POST to `/create-payment-intent` to get a clientSecret for Stripe Elements.
- Make sure your frontend is served from a domain allowed by CORS (this server allows all origins by default for dev).

## Security
- Never expose your Stripe secret key to the frontend.
- For production, restrict CORS and add HTTPS.
