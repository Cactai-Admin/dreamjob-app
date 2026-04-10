# Environment Variables

All environment variables are configured in `.env.local`. Copy `.env.example` as a starting point.

## Required

| Variable | Description | Where to find |
|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | Supabase Dashboard → Settings → API → anon/public |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (server-side only) | Supabase Dashboard → Settings → API → service_role |

## AI Providers (Optional — needed for AI features)

At least one is required for document generation and Q&A.

| Variable | Description | Where to find |
|----------|-------------|---------------|
| `ANTHROPIC_API_KEY` | Anthropic API key (primary provider) | [console.anthropic.com](https://console.anthropic.com) → API Keys |
| `OPENAI_API_KEY` | OpenAI API key (secondary provider) | [platform.openai.com](https://platform.openai.com) → API Keys |

If both are set, Anthropic is used as the primary provider.

## Google OAuth (Optional — needed for external user sign-in)

| Variable | Description | Where to find |
|----------|-------------|---------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Google Cloud Console → APIs & Services → Credentials |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Same location as above |

See [google-oauth-setup.md](google-oauth-setup.md) for full setup instructions.

## Stripe (Optional — not yet active)

| Variable | Description | Where to find |
|----------|-------------|---------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Stripe Dashboard → Developers → API Keys |
| `STRIPE_SECRET_KEY` | Stripe secret key | Same location |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Stripe Dashboard → Developers → Webhooks |

See [stripe-setup.md](stripe-setup.md) for setup instructions.

## General

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |

## Security Notes

- **Never commit `.env.local`** — it's in `.gitignore`
- `SUPABASE_SERVICE_KEY` bypasses Row Level Security — keep it server-side only
- `NEXT_PUBLIC_*` variables are exposed to the browser — only use them for public values
- Rotate keys immediately if they are accidentally committed
