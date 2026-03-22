import { GoogleGenAI } from "@google/genai";
import { CartoonRequest, ImageFile } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateCartoonImage = async (
  request: CartoonRequest,
  referenceImage: ImageFile
): Promise<string> => {
  const prompt = `Create a high-quality, semi-realistic 3D illustration of a confident business owner / CEO named ${request.personName}, standing professionally near their business ${request.businessName}, which is a ${request.businessType}. 
  
Facial Likeness: Use the attached selfie ONLY as a reference for the face. Do NOT copy the pose, expression, or body from the selfie. 
Pose & Posture: The person is upright with a confident, leadership posture. Hands can be relaxed at sides or lightly crossed. Convey a successful entrepreneur vibe. 
Positioning: IMPORTANT - The person must stand slightly to the side so they do NOT block the business signboard. The business name "${request.businessName}" on the sign must be fully visible and readable.
Appearance & Outfit: Well-groomed, smart casual or professional business attire suitable for a CEO. No phone or other distracting props. 
Background & Environment: Modern, clean, and welcoming storefront or business workspace. Bright, balanced lighting, realistic commercial area feel. 
Art Style: High-end 3D animated movie style with realistic textures, lighting, and materials. A blend of stylized character design with realistic rendering. Sharp focus, high detail, vibrant yet professional colors. Professional, premium branding aesthetic. 
Rules & Restrictions: Facial likeness only; do NOT copy selfie pose Do NOT include a phone Do NOT block the business sign No blur, distortion, watermark, or extra text Make it a fully finished, professional illustration suitable for business branding`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: prompt,
          },
          {
            inlineData: {
              data: referenceImage.base64,
              mimeType: referenceImage.mimeType,
            },
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
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