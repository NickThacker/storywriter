// Server-only Stripe singleton.
// This file must NOT be imported from client components.
//
// The `stripe` export may be null when STRIPE_SECRET_KEY is not set
// (graceful for BYOK-only deployments where billing is invisible to users).

import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  // Allow builds to succeed without Stripe key.
  // Runtime calls will fail gracefully when stripe is null.
  console.warn('STRIPE_SECRET_KEY not set — billing features will be unavailable')
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover',
    })
  : null
