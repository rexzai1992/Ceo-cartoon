# OpenAI Integration Guide

This guide explains how to integrate OpenAI's DALL-E 3 image generation with the CEO Cartoonizer app.

## Prerequisites

- OpenAI API account with billing enabled
- An OpenAI API key (from https://platform.openai.com/api-keys)

## Setup Methods

### Method 1: Environment Variables (Recommended for Development)

1. Edit the `.env` file in the project root:

```bash
# Uncomment and add your OpenAI API key
VITE_OPENAI_API_KEY=sk_your_actual_key_here
VITE_AI_PROVIDER=openai
VITE_OPENAI_MODEL=dall-e-3
```

2. Restart the development server:

```bash
npm run dev
```

### Method 2: App Settings (Recommended for Production)

1. Click the **Settings** icon (⚙️) in the top-right corner of the app
2. Set **AI Provider** to `openai`
3. Paste your OpenAI API key in the **API Key** field
4. Configure options:
   - **Model**: `dall-e-3` (recommended) or `dall-e-2`
   - **Aspect Ratio**: Choose your preferred aspect ratio
   - **Quality**: HD quality is now supported
5. Click **Save Settings**

## Features

### What's Supported

- ✅ Text-to-image generation with DALL-E 3
- ✅ Reference image integration (via enhanced prompts)
- ✅ Artwork reference support
- ✅ Multiple aspect ratios (1:1, 16:9, 9:16, 4:3, 3:4)
- ✅ High-quality rendering (HD mode)
- ✅ Custom prompt templates
- ✅ Base64 image encoding for database storage

### How Facial Likeness Works

Since DALL-E 3 doesn't support direct image-to-image transformations, the app uses an **enhanced prompt technique**:

1. Your reference selfie is analyzed in the prompt description
2. The system instructs DALL-E 3 to preserve facial features and distinctive characteristics
3. The prompt emphasizes maintaining realistic face details while adding the studio-style environment

**Note**: DALL-E 3's facial preservation may vary from Gemini. For best results:
- Use a clear, well-lit selfie
- Include distinctive facial features in your persona name or description
- Use the default or custom prompt that emphasizes facial accuracy

## API Costs

DALL-E pricing (as of 2024):
- **DALL-E 3 Standard (1024x1024)**: $0.04 per image
- **DALL-E 3 HD (1024x1024)**: $0.10 per image
- **DALL-E 2 (1024x1024)**: $0.02 per image
- **Larger sizes**: Proportionally more expensive

## Configuration Options

In App Settings or `.env`:

| Setting | Options | Default |
|---------|---------|---------|
| Provider | `openai` | `gemini` |
| Model | `dall-e-3`, `dall-e-2` | `dall-e-3` |
| Aspect Ratio | `1:1`, `16:9`, `9:16`, `4:3`, `3:4` | `1:1` |
| Prompt Template | Custom prompt text | Default template |

## Troubleshooting

### "API Key is required for OpenAI"
- Check that your API key is correctly entered in Settings or .env
- Verify the key starts with `sk_`
- Ensure the key has valid API credits

### "OpenAI Error: Rate limit exceeded"
- You're making too many requests. Wait a moment before trying again
- Check your API usage at https://platform.openai.com/account/api-keys

### "Invalid response format from OpenAI"
- The API might have changed. Try switching to a different model
- Clear browser cache and restart the dev server

### "Image generation fails silently"
- Check browser console (F12) for error messages
- Verify your OpenAI account has active billing
- Test your API key at https://platform.openai.com/account/api-keys

## Switching Between Providers

The app supports three AI providers:

1. **Gemini** (Google) - Best for facial accuracy
2. **OpenAI** (DALL-E) - Best for artistic variation
3. **Replicate** (Flux) - Fast and affordable

To switch:
1. Go to Settings
2. Change "AI Provider" dropdown
3. Enter the appropriate API key for that provider
4. Save

## Advanced: Custom Prompts

You can create custom prompts to guide DALL-E:

1. Settings → **Prompt Template**
2. Use variables: `{{personName}}`, `{{businessName}}`, `{{businessType}}`, `{{gender}}`, `{{style}}`
3. Click **Use Default** to restore the original prompt

Example custom prompt:
```
Create a whimsical cartoon of {{personName}} running their {{businessType}} called {{businessName}} 
in a [YOUR_STYLE_HERE] style. Make it professional yet fun, with {{personName}} as the main focus.
```

## Switching Back to Gemini

If you want to use Gemini instead:

1. Settings → **AI Provider** → Select `gemini`
2. Enter your Gemini API key
3. Save

## Support

For issues with OpenAI API:
- Check OpenAI documentation: https://platform.openai.com/docs/guides/images
- Contact OpenAI support: support@openai.com

For app-specific issues:
- Check the browser console for detailed error messages
- Verify all settings are correctly saved
