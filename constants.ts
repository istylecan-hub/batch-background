import { BackgroundPreset, PlatformPreset, ViewAngle } from './types';

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: 'studio-white',
    name: 'White Studio',
    prompt: 'Clean pure white studio background, seamless infinite curve, soft commercial lighting, e-commerce standard, no shadows.',
    category: 'Studio',
  },
  {
    id: 'studio-grey',
    name: 'Luxury Grey',
    prompt: 'Professional dark grey studio backdrop, textured concrete wall, dramatic rim lighting, high fashion editorial look.',
    category: 'Studio',
  },
  {
    id: 'lifestyle-pastel',
    name: 'Pastel Living',
    prompt: 'Soft pastel peach and cream blurred living room background, morning sunlight, cozy atmosphere, minimal interior design.',
    category: 'Lifestyle',
  },
  {
    id: 'outdoor-garden',
    name: 'Garden Sunlight',
    prompt: 'Blurred lush green garden background, bokeh effect, dappled sunlight filtering through trees, natural summer vibe.',
    category: 'Outdoor',
  },
  {
    id: 'festive-diwali',
    name: 'Festive Gold',
    prompt: 'Warm golden festive background, blurred diyas and marigold flowers, bokeh lights, rich luxury indian ethnic vibe.',
    category: 'Creative',
  },
  {
    id: 'urban-street',
    name: 'Urban Street',
    prompt: 'Out of focus city street, modern architecture, daytime, clean concrete and glass, fashion street style.',
    category: 'Outdoor',
  },
];

export const PLATFORM_PRESETS: PlatformPreset[] = [
  {
    id: 'amazon',
    name: 'Amazon / Marketplace',
    aspectRatio: '1:1',
    forceWhiteBackground: true,
    allowShadows: false, // Amazon prefers pure white, usually handled by checking "no shadows" or minimal grounding
    exportFormat: 'jpg',
    description: 'Strict pure white (RGB 255,255,255), 1:1 ratio.'
  },
  {
    id: 'myntra',
    name: 'Myntra / Ajio',
    aspectRatio: '3:4',
    forceWhiteBackground: false,
    allowShadows: true,
    exportFormat: 'jpg',
    description: '3:4 Portrait, natural shadows allowed, lifestyle focus.'
  },
  {
    id: 'instagram',
    name: 'Instagram / Social',
    aspectRatio: '4:5',
    forceWhiteBackground: false,
    allowShadows: true,
    exportFormat: 'png',
    description: '4:5 Vertical, aesthetic lighting, depth of field.'
  },
  {
    id: 'custom',
    name: 'Custom / Manual',
    aspectRatio: '1:1',
    forceWhiteBackground: false,
    allowShadows: true,
    exportFormat: 'png',
    description: 'Full manual control over ratio and shadows.'
  }
];

export const ASPECT_RATIOS = [
  { label: '1:1 (Square)', value: '1:1' },
  { label: '3:4 (Portrait)', value: '3:4' },
  { label: '4:5 (Social)', value: '4:5' },
  { label: '16:9 (Landscape)', value: '16:9' },
];

export const VIEW_ANGLES: { value: ViewAngle; label: string }[] = [
  { value: 'front', label: 'Front View' },
  { value: 'side', label: 'Side View' },
  { value: 'back', label: 'Back View' },
  { value: 'detail', label: 'Detail / Zoom' },
  { value: 'flatlay', label: 'Flatlay' },
];