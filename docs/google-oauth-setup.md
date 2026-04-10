# Google OAuth Setup

Google OAuth enables external users to sign in with their Google accounts. This guide walks through configuring Google OAuth with Supabase Auth.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **Select a project** → **New Project**
3. Name it "DreamJob" (or similar)
4. Click **Create**

## Step 2: Configure the OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Select **External** (or Internal if using Google Workspace)
3. Fill in:
   - App name: `DreamJob`
   - User support email: your email
   - Developer contact: your email
4. Click **Save and Continue**
5. Add scopes: `email`, `profile`, `openid`
6. Click **Save and Continue** through remaining steps

## Step 3: Create OAuth Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `DreamJob Web`
5. Authorized JavaScript origins:
   - `http://localhost:3000` (development)
   - `https://your-domain.com` (production)
6. Authorized redirect URIs:
   - `https://your-supabase-project.supabase.co/auth/v1/callback`
7. Click **Create**
8. Copy the **Client ID** and **Client Secret**

## Step 4: Configure Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Google** and enable it
4. Enter the **Client ID** and **Client Secret** from Step 3
5. Click **Save**

## Step 5: Update Environment Variables

Add to your `.env.local`:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
```

> Note: These env vars are for reference. The actual OAuth flow goes through Supabase, which stores the credentials.

## Step 6: Test

1. Start the dev server: `npm run dev`
2. Go to `http://localhost:3000/login`
3. Click the **User** tab
4. Click **Sign in with Google**
5. Complete the Google sign-in flow
6. You should be redirected to the dashboard

## How It Works

1. User clicks "Sign in with Google" on the login page
2. `supabase.auth.signInWithOAuth({ provider: 'google' })` redirects to Google
3. Google authenticates and redirects back to Supabase's callback URL
4. Supabase creates/updates the auth user and redirects to `/callback`
5. The callback page calls `POST /api/auth/callback` to ensure an account record exists
6. User is redirected to the dashboard

## Production Checklist

- [ ] Update authorized JavaScript origins with your production domain
- [ ] Update authorized redirect URIs with your production Supabase URL
- [ ] Submit the OAuth consent screen for verification (required for >100 users)
- [ ] Set the app to "Published" status in the consent screen settings
- [ ] Test the full flow in production

## Troubleshooting

### "redirect_uri_mismatch" error

The redirect URI in Google Cloud doesn't match Supabase's callback URL. Ensure you've added:
`https://your-project.supabase.co/auth/v1/callback`

### User signs in but isn't redirected to the app

Check that the Supabase Google provider is enabled and the credentials match.

### New users don't have an account record

The `/callback` page calls `POST /api/auth/callback` to create the account. Check the browser console and server logs for errors.
