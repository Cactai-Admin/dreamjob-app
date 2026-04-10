# AI Providers Setup

DreamJob supports two AI providers: **Anthropic Claude** (primary) and **OpenAI GPT** (secondary). At least one must be configured for AI features to work.

## Which Provider to Choose

| Feature | Anthropic Claude | OpenAI GPT-4o |
|---------|-----------------|---------------|
| Model | claude-sonnet-4-20250514 | gpt-4o |
| Resume quality | Excellent | Very Good |
| Q&A guidance | Excellent | Very Good |
| Speed | Fast | Fast |
| Cost | ~$3/1M input tokens | ~$5/1M input tokens |

**Recommendation**: Use Anthropic as primary. Set up OpenAI as a fallback.

## Anthropic Setup (Primary)

### 1. Create an Account

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or sign in
3. Add a payment method under Billing

### 2. Generate an API Key

1. Navigate to **API Keys**
2. Click **Create Key**
3. Name it (e.g., "DreamJob")
4. Copy the key — you won't see it again

### 3. Add to Environment

```env
ANTHROPIC_API_KEY=sk-ant-api03-...
```

### 4. Verify

Start the dev server and try generating a document in a workflow. Check the console for any API errors.

## OpenAI Setup (Secondary)

### 1. Create an Account

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or sign in
3. Add a payment method under Billing → Payment methods

### 2. Generate an API Key

1. Navigate to **API Keys** (or Settings → API Keys)
2. Click **Create new secret key**
3. Name it (e.g., "DreamJob")
4. Copy the key

### 3. Add to Environment

```env
OPENAI_API_KEY=sk-...
```

## Provider Selection Logic

The app automatically selects a provider based on available keys:

1. If `ANTHROPIC_API_KEY` is set → uses Anthropic Claude
2. If only `OPENAI_API_KEY` is set → uses OpenAI GPT
3. If neither is set → returns a helpful error message

This logic is in `src/lib/ai/provider.ts`.

## Changing the Default Model

### Anthropic

Edit `src/lib/ai/anthropic.ts`:

```typescript
private model = 'claude-sonnet-4-20250514' // Change this
```

Available models: `claude-sonnet-4-20250514`, `claude-opus-4-20250514`, `claude-haiku-4-5-20251001`

### OpenAI

Edit `src/lib/ai/openai.ts`:

```typescript
private model = 'gpt-4o' // Change this
```

Available models: `gpt-4o`, `gpt-4o-mini`, `gpt-4-turbo`

## Adding a New Provider

1. Create `src/lib/ai/your-provider.ts`
2. Implement the `AIProvider` interface:

```typescript
import type { AIProvider, AIGenerateOptions } from './provider'

export class YourProvider implements AIProvider {
  name = 'your-provider'

  async generate(options: AIGenerateOptions): Promise<string> {
    // Call your provider's API
    // Return the generated text
  }

  isConfigured(): boolean {
    return !!process.env.YOUR_API_KEY
  }
}
```

3. Update `src/lib/ai/provider.ts` to include your provider in the selection chain:

```typescript
if (process.env.YOUR_API_KEY) {
  const { YourProvider } = require('./your-provider')
  return new YourProvider()
}
```

## Cost Management

- **Set spending limits** in both Anthropic and OpenAI dashboards
- Each document generation uses ~2,000–4,000 tokens
- Q&A conversations accumulate tokens over the session
- Monitor usage in your provider dashboard

## Troubleshooting

### "No AI provider configured"

Add at least one API key to `.env.local` and restart the dev server.

### "Authentication error" from provider

Verify the API key is correct and has not expired. Check your provider dashboard for any account issues (billing, rate limits).

### Slow or timeout responses

The default model may be under heavy load. Try switching to a faster model (e.g., `claude-haiku-4-5-20251001` or `gpt-4o-mini`) or increasing the timeout.
