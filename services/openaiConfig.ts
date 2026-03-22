/**
 * OpenAI Image Generation Configuration Options
 * Complete reference for all available settings and parameters
 */

export const OPENAI_MODELS = {
  DALLE3: 'dall-e-3',
  DALLE2: 'dall-e-2'
} as const;

export const OPENAI_QUALITY = {
  STANDARD: 'standard',  // $0.04 per image
  HD: 'hd'              // $0.10 per image
} as const;

export const OPENAI_STYLE = {
  NATURAL: 'natural',   // Realistic, less stylized
  VIVID: 'vivid'        // Artistic, saturated colors
} as const;

export const ASPECT_RATIOS = {
  SQUARE: '1:1',        // 1024x1024
  LANDSCAPE: '16:9',    // 1792x1024
  PORTRAIT: '9:16',     // 1024x1792
  STANDARD: '4:3',      // 1152x768
  TALL: '3:4'           // 768x1152
} as const;

// Resolution mappings for each model
export const RESOLUTIONS = {
  'dall-e-3': {
    '1:1': '1024x1024',
    '16:9': '1792x1024',
    '9:16': '1024x1792',
    '4:3': '1152x768',
    '3:4': '768x1152'
  },
  'dall-e-2': {
    '1:1': '1024x1024',
    '16:9': '1024x1024',  // Not official, will use 1:1
    '9:16': '1024x1024',  // Not official, will use 1:1
    '4:3': '1024x1024',   // Not official, will use 1:1
    '3:4': '1024x1024'    // Not official, will use 1:1
  }
} as const;

// Cost per image in USD
export const PRICING = {
  'dall-e-3': {
    'standard': 0.04,
    'hd': 0.10
  },
  'dall-e-2': 0.02  // No quality options
} as const;

// Generation time estimates in seconds
export const GENERATION_TIMES = {
  'dall-e-3': {
    'standard': '20-30s',
    'hd': '15-25s'
  },
  'dall-e-2': '20-30s'
} as const;

// Preset configurations
export const PRESETS = {
  PROFESSIONAL: {
    name: 'Professional',
    description: 'High-quality HD output for final results',
    model: 'dall-e-3',
    quality: 'hd',
    style: 'natural',
    cost: '$0.10 per image'
  },
  CREATIVE: {
    name: 'Creative',
    description: 'Artistic HD output with vibrant colors',
    model: 'dall-e-3',
    quality: 'hd',
    style: 'vivid',
    cost: '$0.10 per image'
  },
  FAST_ITERATION: {
    name: 'Fast Iteration',
    description: 'Quick generation for testing prompts',
    model: 'dall-e-3',
    quality: 'standard',
    style: 'natural',
    cost: '$0.04 per image'
  },
  BUDGET: {
    name: 'Budget',
    description: 'Most economical option',
    model: 'dall-e-2',
    cost: '$0.02 per image'
  }
} as const;

// Feature support matrix
export const FEATURE_SUPPORT = {
  'dall-e-3': {
    models: ['dall-e-3'],
    qualities: ['standard', 'hd'],
    styles: ['natural', 'vivid'],
    aspectRatios: ['1:1', '16:9', '9:16', '4:3', '3:4'],
    maxPromptLength: 4000,
    supportedResponseFormats: ['b64_json', 'url']
  },
  'dall-e-2': {
    models: ['dall-e-2'],
    qualities: [], // No quality options
    styles: [],    // No style options
    aspectRatios: ['1:1', '512x512', '256x256'],
    maxPromptLength: 1000,
    supportedResponseFormats: ['b64_json', 'url']
  }
} as const;

// Example prompts optimized for each style
export const PROMPT_STYLES = {
  NATURAL: {
    style: 'natural',
    description: 'Realistic, professional, business-oriented',
    enhancedInstructions: [
      'Create a realistic portrait',
      'Professional business attire',
      'Moderate lighting',
      'Clean, professional environment',
      'Accurate facial features'
    ]
  },
  VIVID: {
    style: 'vivid',
    description: 'Artistic, creative, colorful',
    enhancedInstructions: [
      'Create an artistic illustration',
      'Vibrant, saturated colors',
      'Fantasy or stylized environment',
      'Dynamic composition',
      'Creative interpretation'
    ]
  }
} as const;

// Validation helper
export const validateConfig = (config: any): boolean => {
  // Validate model
  if (config.model && !Object.values(OPENAI_MODELS).includes(config.model)) {
    console.warn(`Invalid model: ${config.model}`);
    return false;
  }

  // Validate quality (only for DALL-E 3)
  if (config.quality && config.model === OPENAI_MODELS.DALLE3) {
    if (!Object.values(OPENAI_QUALITY).includes(config.quality)) {
      console.warn(`Invalid quality: ${config.quality}`);
      return false;
    }
  }

  // Validate style (only for DALL-E 3)
  if (config.style && config.model === OPENAI_MODELS.DALLE3) {
    if (!Object.values(OPENAI_STYLE).includes(config.style)) {
      console.warn(`Invalid style: ${config.style}`);
      return false;
    }
  }

  // Validate aspect ratio
  if (config.aspectRatio && !Object.values(ASPECT_RATIOS).includes(config.aspectRatio)) {
    console.warn(`Invalid aspect ratio: ${config.aspectRatio}`);
    return false;
  }

  return true;
};

// Helper to calculate estimated cost
export const calculateCost = (
  model: string,
  quality?: string,
  imageCount: number = 1
): number => {
  const pricing = PRICING[model as keyof typeof PRICING];
  
  if (typeof pricing === 'number') {
    return pricing * imageCount; // DALL-E 2
  } else if (quality && quality in pricing) {
    return pricing[quality as keyof typeof pricing] * imageCount;
  }
  
  return 0;
};

// Helper to get recommended settings for use case
export const getRecommendedSettings = (useCase: 'professional' | 'creative' | 'budget' | 'fast') => {
  switch (useCase) {
    case 'professional':
      return {
        model: 'dall-e-3',
        quality: 'hd',
        style: 'natural',
        description: 'Best for final professional output'
      };
    case 'creative':
      return {
        model: 'dall-e-3',
        quality: 'hd',
        style: 'vivid',
        description: 'Best for artistic creative work'
      };
    case 'budget':
      return {
        model: 'dall-e-2',
        description: 'Most cost-effective option'
      };
    case 'fast':
      return {
        model: 'dall-e-3',
        quality: 'standard',
        style: 'natural',
        description: 'Best for quick iterations'
      };
  }
};
