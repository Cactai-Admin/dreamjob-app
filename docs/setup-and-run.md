# Setup & Run Guide

## Prerequisites

- Node.js 18+ (recommended: 20+)
- npm 9+
- A Supabase project (free tier works)
- (Optional) Anthropic API key or OpenAI API key for AI features
- (Optional) Google Cloud project for OAuth

## Step 1: Install Dependencies

```bash
npm install --legacy-peer-deps
```

> The `--legacy-peer-deps` flag is needed because `openai` requires `zod@^3` as a peer dependency while we use `zod@4`.

## Step 2: Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase project credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
```

Find these in your Supabase Dashboard → Settings → API.

See [environment-variables.md](environment-variables.md) for all available variables.

## Step 3: Set Up Database

### Option A: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/001_initial_schema.sql`
3. Copy the entire contents and paste into the SQL Editor
4. Click **Run**

### Option B: Supabase CLI

```bash
npx supabase db reset
```

### Option C: Reset Script

```bash
npm run db:reset
```

> Note: The reset script requires the `exec_sql` RPC function to be available in your Supabase project. If it's not, use Option A.

## Step 4: Seed Super Admin

```bash
npm run seed
```

This creates the Super Admin account:
- Email: `admin@dreamjob.app`
- Password: `test1234`

## Step 5: Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Step 6: Sign In

1. Navigate to `http://localhost:3000/login`
2. Click the **Internal** tab
3. Sign in with `admin@dreamjob.app` / `test1234`

## Optional Setup

### AI Providers

To enable AI-powered document generation and Q&A, configure at least one AI provider. See [ai-providers-setup.md](ai-providers-setup.md).

### Google OAuth

To enable Google sign-in for external users, configure Google OAuth. See [google-oauth-setup.md](google-oauth-setup.md).

### LinkedIn Integration

To enable company research and connection discovery, set up Playwright. See [linkedin-integration.md](linkedin-integration.md).

### Stripe

To enable payments (not yet active), see [stripe-setup.md](stripe-setup.md).

## Production Build

```bash
npm run build
npm run start
```

## Troubleshooting

### Build fails with peer dependency errors

Run `npm install --legacy-peer-deps` instead of `npm install`.

### "No AI provider configured" error

Add `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` to your `.env.local`. See [ai-providers-setup.md](ai-providers-setup.md).

### Login fails for Super Admin

1. Verify the seed script ran successfully: `npm run seed`
2. Check that the Supabase Auth user was created in your Supabase Dashboard → Authentication → Users
3. Verify `SUPABASE_SERVICE_KEY` in `.env.local` is the **service role** key (not the anon key)

### Database tables not found

Run the migration SQL in Supabase Dashboard → SQL Editor. See Step 3 above.
