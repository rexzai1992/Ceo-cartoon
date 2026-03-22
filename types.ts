export type Outlet = 'Melaka' | 'Kuala Terengganu';

export interface CartoonRequest {
  personName: string;
  gender: string;
  businessName: string;
  businessType: string;
  style: string;
  outlet?: Outlet;
}

export interface ImageFile {
  base64: string;
  mimeType: string;
  previewUrl: string;
}

export interface Generation {
  id: string;
  created_at: string;
  person_name: string;
  gender: string;
  business_name: string;
  business_type: string;
  image_url: string;
  status: string;
  outlet: string;
  before_image_url?: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export type AiProvider = 'gemini' | 'openai' | 'replicate';

export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

export type OpenAIModel =
  | 'gpt-image-1'
  | 'gpt-image-1.5'
  | 'gpt-image-1-mini'
  | 'dall-e-3'
  | 'dall-e-2';
export type OpenAIQuality = 'auto' | 'low' | 'medium' | 'high' | 'standard' | 'hd';
export type OpenAIStyle = 'natural' | 'vivid';

export interface AppSettings {
  provider: AiProvider;
  apiKey: string;
  model: string;
  aspectRatio: AspectRatio;
  useCorsProxy: boolean;
  promptTemplate: string;
  // OpenAI specific settings
  openaiQuality?: OpenAIQuality;
  openaiStyle?: OpenAIStyle;
  whatsappApiKey: string;
  whatsappSender: string;
  whatsappMessageTemplate: string;
  classTimeSlots: Record<Outlet, string>;
  registrationLimits: Record<Outlet, number>;
}

export type AppView = 'LANDING' | 'APP' | 'GALLERY' | 'REGISTRATION' | 'ADMIN_GENERATE';
