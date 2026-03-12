// Server-only Stripe singleton.
// This file must NOT be imported from client components.

import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY not set — billing features will be unavailable')
}

const stripeKey = process.env.STRIPE_SECRET_KEY?.trim()

export const stripe = stripeKey
  ? new Stripe(stripeKey, {
      maxNetworkRetries: 3,
      timeout: 30_000,
    })
  : null
