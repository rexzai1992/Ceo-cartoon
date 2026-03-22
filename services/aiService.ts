import { GoogleGenAI } from "@google/genai";
import { CartoonRequest, ImageFile, AppSettings, AspectRatio } from "../types";

export const DEFAULT_PROMPT_TEMPLATE = `You are an expert illustrator. I have provided two images: a "Selfie Image" of a {{gender}} named {{personName}}, and an "Artwork Image" which is a kid's drawing of their dream shop.

Task:
1. Use the "Artwork Image" (the kid's drawing) as the BACKGROUND/BACKDROP of the final image. Enhance it into a fully realized, highly detailed environment for a {{businessType}} named "{{businessName}}", and make the enhancements match the chosen style "{{style}}". Keep the original imaginative concept, composition, and key visual elements of the kid's drawing alive. Do not replace it with a generic background.
2. Take the person from the "Selfie Image" ({{personName}}) and place them in this world. CRITICAL INSTRUCTION FOR THE FACE: The person's face MUST NOT be a generic cartoon. It must be a highly accurate, realistic portrait that perfectly preserves their exact facial features, identity, and expression from the selfie. Do not overly cartoonify the face—it must look exactly like the real person, while their clothing and body can match the Ghibli-inspired {{style}} aesthetic.
3. Place {{personName}} proudly in the FOREGROUND in front of their enhanced shop background ("{{businessName}}"). They are the CEO/owner of this shop.

Ensure the final image is cohesive, with consistent lighting and shadows between the realistic character face and the magical Ghibli-style shop background. The final result should look like a high-quality concept art piece where the kid's dream shop has come to life!`;

// Helper to construct the prompt from template
const buildPrompt = (request: CartoonRequest, template: string) => {
  let prompt = template || DEFAULT_PROMPT_TEMPLATE;
  
  // Replace variables
  prompt = prompt.replace(/{{personName}}/g, request.personName || '');
  prompt = prompt.replace(/{{gender}}/g, request.gender || '');
  prompt = prompt.replace(/{{businessName}}/g, request.businessName || '');
  prompt = prompt.replace(/{{businessType}}/g, request.businessType || '');
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
  const prompt = buildPrompt(request, promptTemplate);

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

  // Enhance prompt with visual description if reference image exists
  if (referenceImage) {
    prompt = prompt.replace(
      /CRITICAL INSTRUCTION FOR THE FACE:.*?realistic portrait/s,
      `CRITICAL INSTRUCTION FOR THE FACE: The person's face MUST match the reference selfie provided - maintain accurate facial features, skin tone, eye color, and distinctive characteristics. Create a highly accurate, realistic portrait that preserves their exact identity. Do NOT cartoonify the face - integrate it seamlessly into the Ghibli-inspired scene`
    );
    prompt += "\n[REFERENCE IMAGE CONTEXT: A selfie/reference photo has been provided to guide the character's facial features and appearance.]";
  }

  // Add artwork context if provided
  if (artworkImage) {
    prompt += "\n[ARTWORK REFERENCE: A kid's drawing has been provided and must be used as the background/backdrop. Enhance it based on business type and selected style while preserving the original drawing concept.]";
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
    return parseOpenAIImage(data);
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
