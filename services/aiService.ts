import { GoogleGenAI } from "@google/genai";
import { CartoonRequest, ImageFile, AppSettings, AspectRatio } from "../types";

export const DEFAULT_PROMPT_TEMPLATE = `You are an expert AI artist for a kids entrepreneurship photo experience.

You will receive:
1) A selfie photo of {{personName}} ({{gender}})
2) An artwork photo (kid's drawing) of their business idea

GOAL
Create one final image where:
- The person is clearly the same person from the selfie
- The artwork is enhanced into a polished business scene
- The result feels premium, slightly cartoon, and believable (not over-cartoon)

CRITICAL RULES
1. FACE & IDENTITY (HIGHEST PRIORITY)
- Keep strong likeness to the selfie: same facial structure, eyes, nose, lips, hairstyle/hairline, skin tone, and expression.
- Mild cartoon style is allowed, but do NOT over-cartoonify or drift into a different face.
- Keep accessories accurate: if selfie has glasses/mask/hat keep them; if not, do not add them.

2. ARTWORK ENHANCEMENT
- Use the artwork image as the actual background base.
- Enhance it according to business type {{businessType}} and style {{style}}.
- Preserve the original drawing concept and key composition.
- Improve texture, lighting, depth, and signage clarity without replacing the core drawing.

3. COMPOSITION
- Place {{personName}} in the foreground as the young business owner of "{{businessName}}".
- Keep cohesive lighting and shadows between person and enhanced artwork background.

Output a single image.`;

const FACE_LOCK_INSTRUCTIONS = `
[FACE IDENTITY LOCK - HIGHEST PRIORITY]
- Use the selfie as the single source of truth for identity.
- Keep the same facial structure, eyes, nose, lips, skin tone, hairstyle/hairline, and age appearance.
- Preserve likeness strongly so the result is immediately recognizable as the same person.
- Do NOT alter ethnicity, age group, or distinctive facial traits.
- Do NOT produce a generic anime/cartoon face.
- You may stylize clothing/body/background, but facial identity must remain faithful to the selfie.
- Keep realistic skin pores/texture and natural face lighting (avoid waxy/plastic skin).
- Keep eye size, nose size, and mouth proportions realistic (no oversized anime-style features).
- Apply style mainly to environment/clothing; do NOT restyle facial structure.
- If any style/background instruction conflicts with face fidelity, prioritize face fidelity.
- Keep face semi-realistic with subtle stylization (not hyper-real, not overly cartoon).
- Preserve strong likeness from selfie so the person is clearly recognizable.
- Expression should be friendly and positive with a natural smile.
`;

const OUTFIT_LOCK_INSTRUCTIONS = `
[OUTFIT LOCK]
- Dress the person in formal business attire suitable for a young CEO.
- Preferred outfit: suit or blazer (smart, professional look).
- Keep clothing neat, premium, and entrepreneur-like.
`;

const REALISM_LOCK_INSTRUCTIONS = `
[REALISM LOCK]
- Final render should be semi-realistic with soft stylization for the person.
- Avoid typical AI artifacts: over-sharpened edges, unnatural skin blur, distorted fingers, asymmetrical eyes, and fake glossy skin.
- Keep natural body proportions from selfie (do not widen face/body, do not make subject look heavier).
- Keep natural color tones, realistic shadows, and camera-like depth.
- Avoid dreamy/fantasy color wash, heavy bloom, pastel haze, or over-saturated cinematic tint.
- Negative constraints for face: no heavy anime face, no doll-like face, no plastic skin, no face simplification.
`;

const ARTWORK_LOCK_INSTRUCTIONS = `
[ARTWORK BACKGROUND LOCK]
- Use the kid's artwork as the actual scene foundation/background.
- Enhance details and polish based on both business type and selected style, while preserving core layout, concept, and major elements from the drawing.
- Improve artwork quality with cleaner shapes, richer textures, better lighting, deeper depth, clearer shop signage, and more professional visual finish.
- Do not replace with an unrelated or generic background.
`;

// Helper to construct the prompt from template
const buildPrompt = (request: CartoonRequest, template: string) => {
  let prompt = template || DEFAULT_PROMPT_TEMPLATE;
  const safePersonName = request.personName || '';
  const safeBusinessType = request.businessType || 'business';
  const safeBusinessName = request.businessName || 'N/A';
  
  // Replace variables
  prompt = prompt.replace(/{{personName}}/g, safePersonName);
  prompt = prompt.replace(/{{gender}}/g, request.gender || '');
  prompt = prompt.replace(/{{businessName}}/g, safeBusinessName);
  prompt = prompt.replace(/{{businessType}}/g, safeBusinessType);
  prompt = prompt.replace(/{{style}}/g, request.style || '');
  
  return prompt;
};

const isGptImageModel = (model: string): boolean => model.startsWith('gpt-image');

// Helper to map app ratios to model-supported OpenAI sizes.
const getOpenAIResolution = (ratio: AspectRatio, model: string): string => {
  if (isGptImageModel(model)) {
    switch (ratio) {
      case '1:1': return "1024x1024";
      case '16:9':
      case '4:3':
        return "1536x1024";
      case '9:16':
      case '3:4':
        return "1024x1536";
      default:
        return "1024x1024";
    }
  }

  switch (ratio) {
    case '1:1': return "1024x1024";
    case '16:9': return "1792x1024";
    case '9:16': return "1024x1792";
    default: return "1024x1024";
  }
};

const mapOpenAIQuality = (quality: string | undefined, model: string): string | undefined => {
  if (!quality) {
    return isGptImageModel(model) ? 'auto' : undefined;
  }

  if (isGptImageModel(model)) {
    if (quality === 'hd') return 'high';
    if (quality === 'standard') return 'medium';
    if (quality === 'low' || quality === 'medium' || quality === 'high' || quality === 'auto') return quality;
    return 'auto';
  }

  // DALL-E 3 supports standard/hd only.
  if (quality === 'hd' || quality === 'standard') return quality;
  if (quality === 'high') return 'hd';
  return 'standard';
};

const toImageBlob = async (image: ImageFile): Promise<Blob> => {
  const response = await fetch(`data:${image.mimeType};base64,${image.base64}`);
  return response.blob();
};

const toBlobFromGeneratedSource = async (src: string): Promise<Blob> => {
  try {
    const response = await fetch(src);
    if (!response.ok) throw new Error(`Failed to fetch generated image: ${response.status}`);
    return response.blob();
  } catch {
    if (/^https?:\/\//i.test(src)) {
      const proxied = `${PROXY_URL}${encodeURIComponent(src)}`;
      const response = await fetch(proxied);
      if (!response.ok) throw new Error(`Failed to fetch generated image via proxy: ${response.status}`);
      return response.blob();
    }
    throw new Error('Failed to load generated image for face refinement');
  }
};

const parseOpenAIImage = (data: any): string => {
  const firstImage = data?.data?.[0];
  if (!firstImage) {
    throw new Error("Invalid response format from OpenAI - no image data received");
  }

  if (firstImage.b64_json) {
    return `data:image/png;base64,${firstImage.b64_json}`;
  }

  if (firstImage.url) {
    return firstImage.url;
  }

  throw new Error("Invalid response format from OpenAI - unsupported image payload");
};

const PROXY_URL = "https://corsproxy.io/?";

const fetchWithProxy = async (url: string, options: RequestInit, useProxy: boolean = false) => {
  const finalUrl = useProxy ? `${PROXY_URL}${url}` : url;
  return fetch(finalUrl, options);
};

const runOpenAIFaceRefinement = async ({
  apiKey,
  model,
  size,
  quality,
  baseImageSrc,
  selfieImage,
}: {
  apiKey: string;
  model: string;
  size: string;
  quality?: string;
  baseImageSrc: string;
  selfieImage: ImageFile;
}): Promise<string> => {
  const formData = new FormData();
  formData.append('model', model);
  formData.append(
    'prompt',
    `Face correction pass:
- Keep the generated scene, background, outfit, pose, framing, and colors unchanged.
- Only correct the person's face to strongly match the selfie identity.
- Preserve recognizable facial structure, eyes, nose, lips, skin tone, and expression.
- Keep a soft cartoon style but avoid changing identity.
- Keep natural body/face proportions from selfie (no fattening/widening).
- Avoid dreamy color cast or hazy pastel grading.
- Keep a natural friendly smile on the face.`
  );
  formData.append('size', size);
  if (quality) {
    formData.append('quality', quality);
  }

  formData.append('image[]', await toBlobFromGeneratedSource(baseImageSrc), 'base.png');
  formData.append('image[]', await toImageBlob(selfieImage), 'selfie.jpg');

  const refineResponse = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!refineResponse.ok) {
    const errorData = await refineResponse.json().catch(() => ({}));
    const errorMsg = errorData.error?.message || refineResponse.statusText;
    throw new Error(`OpenAI Face Refinement Error: ${errorMsg}`);
  }

  const refineData = await refineResponse.json();
  return parseOpenAIImage(refineData);
};

export const generateCartoonImage = async (
  request: CartoonRequest,
  referenceImage: ImageFile,
  artworkImage: ImageFile | null,
  settings: AppSettings
): Promise<string> => {
  switch (settings.provider) {
    case 'gemini':
      return generateWithGemini(request, referenceImage, artworkImage, settings);
    case 'openai':
      return generateWithOpenAI(request, referenceImage, artworkImage, settings);
    case 'replicate':
      return generateWithReplicate(request, referenceImage, settings);
    default:
      throw new Error(`Unsupported provider: ${settings.provider}`);
  }
};

const generateWithGemini = async (
  request: CartoonRequest,
  referenceImage: ImageFile,
  artworkImage: ImageFile | null,
  settings: AppSettings
): Promise<string> => {
  // Use user provided key or fallback to env
  const apiKey = settings.apiKey || process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing for Gemini");

  const ai = new GoogleGenAI({ apiKey });
  const modelName = settings.model || 'gemini-2.5-flash-image';
  const aspectRatio = settings.aspectRatio || "1:1";
  
  // Use custom template or fallback
  const promptTemplate = settings.promptTemplate || DEFAULT_PROMPT_TEMPLATE;
  let prompt = buildPrompt(request, promptTemplate);
  prompt += `\n${FACE_LOCK_INSTRUCTIONS}\n${OUTFIT_LOCK_INSTRUCTIONS}\n${REALISM_LOCK_INSTRUCTIONS}\n${ARTWORK_LOCK_INSTRUCTIONS}`;

  try {
    const parts: any[] = [
      { text: prompt },
      { text: "Selfie Image:" },
      {
        inlineData: {
          data: referenceImage.base64,
          mimeType: referenceImage.mimeType,
        },
      },
    ];

    if (artworkImage) {
      parts.push({ text: "Artwork Image:" });
      parts.push({
        inlineData: {
          data: artworkImage.base64,
          mimeType: artworkImage.mimeType,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: parts,
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
        }
      }
    });

    let imageUrl = '';
    if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          imageUrl = `data:image/png;base64,${base64EncodeString}`;
          break;
        }
      }
    }

    if (!imageUrl) {
      throw new Error("No image generated. The model might have returned text instead.");
    }

    return imageUrl;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

const generateWithOpenAI = async (
  request: CartoonRequest,
  referenceImage?: ImageFile,
  artworkImage?: ImageFile | null,
  settings?: AppSettings
): Promise<string> => {
  // Handle backward compatibility - settings might be passed as 3rd or 4th parameter
  let finalSettings: AppSettings;
  if (typeof settings === 'object' && settings.apiKey) {
    finalSettings = settings;
  } else if (typeof referenceImage === 'object' && 'apiKey' in referenceImage) {
    finalSettings = referenceImage as any;
    referenceImage = undefined;
  } else {
    throw new Error("API Settings required for OpenAI");
  }

  const apiKey = finalSettings.apiKey || (import.meta as any).env?.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API Key is required");

  const promptTemplate = finalSettings.promptTemplate || DEFAULT_PROMPT_TEMPLATE;
  let prompt = buildPrompt(request, promptTemplate);

  // Always enforce identity preservation when selfie is provided.
  if (referenceImage) {
    prompt += `\n${FACE_LOCK_INSTRUCTIONS}`;
    prompt += "\n[REFERENCE IMAGE CONTEXT: The selfie image is provided and must drive facial identity.]";
  }
  prompt += `\n${OUTFIT_LOCK_INSTRUCTIONS}`;
  prompt += `\n${REALISM_LOCK_INSTRUCTIONS}`;

  // Always enforce artwork-as-background when artwork image is provided.
  if (artworkImage) {
    prompt += `\n${ARTWORK_LOCK_INSTRUCTIONS}`;
    prompt += "\n[ARTWORK REFERENCE CONTEXT: The kid's artwork image is provided as the background source. Enhance it according to business type and selected style.]";
  }

  const model = finalSettings.model || 'gpt-image-1';
  const size = getOpenAIResolution(finalSettings.aspectRatio || '1:1', model);
  const quality = mapOpenAIQuality(finalSettings.openaiQuality, model);
  const style = finalSettings.openaiStyle || 'natural';
  const isDalle3 = model.includes('dall-e-3');
  const shouldUseEditsEndpoint = isGptImageModel(model) && Boolean(referenceImage || artworkImage);

  try {
    const response = shouldUseEditsEndpoint
      ? await (async () => {
          const formData = new FormData();
          formData.append('model', model);
          formData.append('prompt', prompt);
          formData.append('size', size);

          if (quality) {
            formData.append('quality', quality);
          }

          if (referenceImage) {
            formData.append('image[]', await toImageBlob(referenceImage), 'selfie.jpg');
          }
          if (artworkImage) {
            formData.append('image[]', await toImageBlob(artworkImage), 'artwork.jpg');
          }

          return fetch('https://api.openai.com/v1/images/edits', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
            },
            body: formData,
          });
        })()
      : await (async () => {
          const requestBody: any = {
            model: model,
            prompt: prompt,
            n: 1,
            size: size,
          };

          if (isGptImageModel(model)) {
            requestBody.output_format = 'png';
            if (quality) {
              requestBody.quality = quality;
            }
          } else {
            requestBody.response_format = "b64_json";
          }

          if (isDalle3) {
            requestBody.quality = quality || 'standard';
            requestBody.style = style;
          }

          return fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(requestBody),
          });
        })();

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData.error?.message || response.statusText;
      throw new Error(`OpenAI Error: ${errorMsg}`);
    }

    const data = await response.json();
    const firstPassImage = parseOpenAIImage(data);

    // Second pass face-correction for stronger selfie likeness.
    if (isGptImageModel(model) && referenceImage) {
      try {
        return await runOpenAIFaceRefinement({
          apiKey,
          model,
          size,
          quality,
          baseImageSrc: firstPassImage,
          selfieImage: referenceImage,
        });
      } catch (refineError) {
        console.warn('Face refinement pass failed, falling back to first pass result:', refineError);
      }
    }

    return firstPassImage;
  } catch (error) {
    console.error("OpenAI Image Generation Error:", error);
    throw error;
  }
};

const generateWithReplicate = async (
  request: CartoonRequest,
  referenceImage: ImageFile,
  settings: AppSettings
): Promise<string> => {
  const apiKey = settings.apiKey;
  if (!apiKey) throw new Error("API Key is required for Replicate");

  const model = settings.model || "black-forest-labs/flux-schnell";
  const aspectRatio = settings.aspectRatio || "1:1";
  const useProxy = settings.useCorsProxy ?? true; // Default to true if undefined
  
  const promptTemplate = settings.promptTemplate || DEFAULT_PROMPT_TEMPLATE;
  const prompt = buildPrompt(request, promptTemplate);

  // 1. Create Prediction
  const startResponse = await fetchWithProxy("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "Authorization": `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: model.includes(':') ? model.split(':')[1] : undefined,
      input: {
        prompt: prompt,
        aspect_ratio: aspectRatio,
      },
    }),
  }, useProxy);

  if (!startResponse.ok) {
     const errorData = await startResponse.json().catch(() => ({ detail: startResponse.statusText }));
     throw new Error(`Replicate Error: ${errorData.detail || startResponse.statusText}`);
  }

  let prediction = await startResponse.json();
  // Ensure we get a valid polling URL. Replicate usually returns `urls.get`.
  const pollUrl = prediction.urls?.get;

  if (!pollUrl) {
      throw new Error("Replicate did not return a polling URL");
  }

  // 2. Poll for result
  while (prediction.status !== "succeeded" && prediction.status !== "failed" && prediction.status !== "canceled") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const pollResponse = await fetchWithProxy(pollUrl, {
      headers: {
        "Authorization": `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
    }, useProxy);
    
    if (!pollResponse.ok) {
       // If polling fails, try to continue or throw?
       // Sometimes proxies timeout. Let's throw for now.
       throw new Error(`Polling failed: ${pollResponse.statusText}`);
    }

    prediction = await pollResponse.json();
  }

  if (prediction.status === "failed") {
    throw new Error(`Replicate generation failed: ${prediction.error}`);
  }

  // Replicate returns a URL.
  // Note: If using proxy, the image URL might also be CORS restricted if used in a canvas, 
  // but for <img src> it's usually fine unless specific headers are needed.
  return prediction.output[0];
};
