# OpenAI Image Generation - Complete Reference

This document provides a comprehensive reference for all OpenAI image generation options available in the CEO Cartoonizer app.

## Available Models

### DALL-E 3 (Recommended)
- **Model ID**: `dall-e-3`
- **Quality**: Highest quality, best for professional use
- **Features**: Advanced understanding, better prompt adherence
- **Sizes**: 1024x1024, 1024x1792, 1792x1024
- **Supported Options**: Quality, Style
- **Cost**: $0.04 (standard) / $0.10 (HD) per image
- **Best For**: Professional cartoons, detailed artwork

### DALL-E 2
- **Model ID**: `dall-e-2`
- **Quality**: Good, faster generation
- **Features**: Proven model, compatible across workflows
- **Sizes**: 1024x1024, 512x512, 256x256
- **Supported Options**: None (no quality/style)
- **Cost**: $0.020 per image
- **Best For**: Quick iterations, budget-conscious workflows

## Quality Settings (DALL-E 3 only)

### Standard Quality
- **Setting**: `openaiQuality: 'standard'`
- **Cost**: $0.04 per image
- **Generation Time**: ~20-30 seconds
- **Use When**: Quick previews, iterating on prompts
- **Visual**: Clear, good detail

### HD Quality
- **Setting**: `openaiQuality: 'hd'`
- **Cost**: $0.10 per image (2.5x more expensive)
- **Generation Time**: ~15-25 seconds
- **Use When**: Final output, professional use, high detail needed
- **Visual**: Enhanced detail, sharper edges, more refined

## Style Settings (DALL-E 3 only)

### Natural Style
- **Setting**: `openaiStyle: 'natural'`
- **Effect**: Realistic, less stylized
- **Best For**: Business portraits, professional environments
- **Example**: CEO in realistic office with actual business signage

### Vivid Style
- **Setting**: `openaiStyle: 'vivid'`
- **Effect**: More artistic, saturated colors, stylized
- **Best For**: Creative cartoons, fantasy environments
- **Example**: Fantastical cartoon version of a gaming lounge

## Size / Aspect Ratio Options

### Available Resolutions
All resolutions are in pixels. Select based on use case:

| Ratio | DALL-E 3 Resolution | DALL-E 2 Resolutions | Use Case |
|-------|-------------------|---------------------|----------|
| 1:1 (Square) | 1024x1024 | 1024x1024, 512x512, 256x256 | **Recommended** - Card layouts, avatars |
| 16:9 (Landscape) | 1792x1024 | N/A | Wide displays, presentation slides |
| 9:16 (Portrait) | 1024x1792 | N/A | Mobile apps, vertical cards |
| 4:3 (Standard) | 1152x768 | N/A | Desktop displays |
| 3:4 (Tall) | 768x1152 | N/A | Narrow layouts, banners |

## Complete Configuration Examples

### Example 1: Professional HD Cartoon
```json
{
  "provider": "openai",
  "apiKey": "sk_...",
  "model": "dall-e-3",
  "aspectRatio": "1:1",
  "openaiQuality": "hd",
  "openaiStyle": "natural"
}
```
**Cost**: $0.10 per image
**Result**: High-polish professional cartoon

### Example 2: Artistic Vivid Cartoon
```json
{
  "provider": "openai",
  "apiKey": "sk_...",
  "model": "dall-e-3",
  "aspectRatio": "1:1",
  "openaiQuality": "hd",
  "openaiStyle": "vivid"
}
```
**Cost**: $0.10 per image
**Result**: Colorful, artistic cartoon with vibrant colors

### Example 3: Budget-Friendly
```json
{
  "provider": "openai",
  "apiKey": "sk_...",
  "model": "dall-e-2",
  "aspectRatio": "1:1"
}
```
**Cost**: $0.02 per image
**Result**: Good quality cartoon, lowest cost

### Example 4: Fast Standard Quality
```json
{
  "provider": "openai",
  "apiKey": "sk_...",
  "model": "dall-e-3",
  "aspectRatio": "1:1",
  "openaiQuality": "standard",
  "openaiStyle": "natural"
}
```
**Cost**: $0.04 per image
**Result**: Good quality, faster iterations

## How to Configure in App

### Via Settings UI
1. Click **Settings** ⚙️
2. Select **Provider**: `openai`
3. Enter your **API Key**
4. Choose **Model**: `dall-e-3` or `dall-e-2`
5. Set **Aspect Ratio**: `1:1`, `16:9`, etc.
6. *(DALL-E 3 only)* Set **Quality**: `standard` or `hd`
7. *(DALL-E 3 only)* Set **Style**: `natural` or `vivid`
8. Click **Save Settings**

### Via Environment Variables
```bash
# .env file
VITE_OPENAI_API_KEY=sk_your_key_here
VITE_AI_PROVIDER=openai
VITE_OPENAI_MODEL=dall-e-3
VITE_OPENAI_QUALITY=hd
VITE_OPENAI_STYLE=natural
```

### Via Code
```typescript
import { AppSettings } from './types';

const settings: AppSettings = {
  provider: 'openai',
  apiKey: 'sk_...',
  model: 'dall-e-3',
  aspectRatio: '1:1',
  openaiQuality: 'hd',
  openaiStyle: 'natural',
  promptTemplate: '...',
  // ... other settings
};
```

## Recommended Presets

### Preset 1: "Professional"
- Model: DALL-E 3
- Quality: HD
- Style: Natural
- Aspect: 1:1
- Est. Cost: $0.10/image
- Best for: Final output, business use

### Preset 2: "Creative"
- Model: DALL-E 3
- Quality: HD
- Style: Vivid
- Aspect: 1:1
- Est. Cost: $0.10/image
- Best for: Artistic variations, portfolio

### Preset 3: "Fast Iteration"
- Model: DALL-E 3
- Quality: Standard
- Style: Natural
- Aspect: 1:1
- Est. Cost: $0.04/image
- Best for: Testing prompts, quick drafts

### Preset 4: "Budget"
- Model: DALL-E 2
- Quality: N/A
- Style: N/A
- Aspect: 1:1
- Est. Cost: $0.02/image
- Best for: High volume, budget constraint

## API Response Format

All configurations return images as **Base64 PNG** data URLs:

```
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==
```

Ready for immediate display in `<img>` tags or saving to database.

## Troubleshooting

### "Quality not supported"
- You're using DALL-E 2. Only DALL-E 3 supports quality/style settings.
- Switch to `dall-e-3` model.

### "Style not supported"
- Same as above. Ensure model is set to `dall-e-3`.

### Inconsistent results between Standard and HD
- This is normal. HD uses different rendering passes for higher detail.
- Quality differences are most visible in close-ups and fine details.

### DALL-E 3 is expensive
- Try **Standard** quality instead of HD (saves 75%)
- Or use **DALL-E 2** (saves 80%)

### Can't decide between Natural and Vivid?
- **Natural**: Better for photo-realistic business settings
- **Vivid**: Better for stylized, cartoon-like results

## Cost Calculator

Calculate your generation costs:

```
Formula: Cost per image = Base Rate
- DALL-E 3 Standard: 12 images/day × $0.04 = $0.48/day = $14.40/month
- DALL-E 3 HD: 12 images/day × $0.10 = $1.20/day = $36/month
- DALL-E 2: 12 images/day × $0.02 = $0.24/day = $7.20/month
```

## Limitations

- **Rate Limits**: OpenAI has rate limits based on plan
- **Prompt Length**: ~2000 characters recommended
- **Generation Times**: 15-30 seconds depending on settings
- **Aspect Ratios**: DALL-E 3 supports 3 sizes, DALL-E 2 supports 3 sizes
- **No Image-to-Image**: Only text-to-image generation

## Advanced: Custom Implementation

To use all OpenAI options programmatically:

```typescript
import { generateCartoonImage } from './services/aiService';
import { CartoonRequest, ImageFile, AppSettings } from './types';

const cartoonRequest: CartoonRequest = {
  personName: 'Ali',
  gender: 'Boy',
  businessName: 'Tech Hub',
  businessType: 'Gaming Lounge',
  style: 'Colorful & Vibrant'
};

const settings: AppSettings = {
  provider: 'openai',
  apiKey: process.env.VITE_OPENAI_API_KEY!,
  model: 'dall-e-3',
  aspectRatio: '1:1',
  openaiQuality: 'hd',
  openaiStyle: 'natural',
  // ... other required settings
};

const imageUrl = await generateCartoonImage(
  cartoonRequest,
  referenceImage,
  artworkImage,
  settings
);
```

## References

- OpenAI API Documentation: https://platform.openai.com/docs/guides/images
- Pricing: https://openai.com/pricing
- API Status: https://status.openai.com
