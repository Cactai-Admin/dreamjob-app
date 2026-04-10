# Stripe Setup

Stripe is ready to implement but **not yet active**. This guide covers how to set it up when you're ready to add payments.

## Current State

- The `stripe` package is installed as a dependency
- Environment variable placeholders are in `.env.example`
- No payment flows, webhook handlers, or pricing pages exist yet

## When You're Ready to Implement

### Step 1: Create a Stripe Account

1. Go to [stripe.com](https://stripe.com) and sign up
2. Complete the onboarding process
3. Start in **Test mode** (toggle in the dashboard)

### Step 2: Get API Keys

1. Go to **Developers** → **API keys**
2. Copy the **Publishable key** (starts with `pk_test_`)
3. Copy the **Secret key** (starts with `sk_test_`)

### Step 3: Configure Environment

Add to `.env.local`:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### Step 4: Create Products and Prices

In the Stripe Dashboard:

1. Go to **Products** → **Add product**
2. Create your pricing tiers (e.g., Free, Pro, Enterprise)
3. Note the **Price IDs** (starts with `price_`)

### Step 5: Set Up Webhooks

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. URL: `https://your-domain.com/api/stripe/webhook`
4. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_`)

Add to `.env.local`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Step 6: Implement Payment Flows

Create these files:

1. **`src/app/api/stripe/checkout/route.ts`** — Create Checkout Sessions
2. **`src/app/api/stripe/webhook/route.ts`** — Handle Stripe webhooks
3. **`src/app/api/stripe/portal/route.ts`** — Create Customer Portal sessions
4. **`src/app/(dashboard)/pricing/page.tsx`** — Pricing page with plan selection

Example webhook handler:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed':
      // Handle successful checkout
      break
    case 'customer.subscription.deleted':
      // Handle cancellation
      break
  }

  return NextResponse.json({ received: true })
}
```

### Step 7: Add Database Columns

Add these columns to the `accounts` table:

```sql
ALTER TABLE accounts ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE accounts ADD COLUMN subscription_status TEXT DEFAULT 'free';
ALTER TABLE accounts ADD COLUMN subscription_plan TEXT;
ALTER TABLE accounts ADD COLUMN subscription_expires_at TIMESTAMPTZ;
```

### Step 8: Test

1. Use Stripe's test cards: `4242 4242 4242 4242`
2. Test the full flow: sign up → select plan → checkout → verify subscription
3. Test webhook delivery in the Stripe Dashboard → Webhooks → Send test event

### Step 9: Go Live

1. Toggle to **Live mode** in the Stripe Dashboard
2. Replace test keys with live keys in production `.env`
3. Update the webhook URL to your production domain
4. Test with a real card (you can refund immediately)

## Test Cards

| Card | Scenario |
|------|----------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 3220` | 3D Secure required |
| `4000 0000 0000 0002` | Declined |
| `4000 0000 0000 9995` | Insufficient funds |

Use any future expiry date and any CVC.
