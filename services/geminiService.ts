import { GoogleGenAI } from "@google/genai";
import { BatchConfig, QualityMetrics, ShadowConfig, StylistSuggestion, ViewAngle } from '../types';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

// Convert File to Base64
export const fileToGenerativePart = async (file: File): Promise<{ inlineData: { mimeType: string; data: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve({
        inlineData: {
          mimeType: file.type || 'image/jpeg',
          data: base64Data,
        }
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// --- Stylist Service ---

export const getStylistSuggestions = async (imageFile: File): Promise<StylistSuggestion[]> => {
  const ai = getClient();
  const model = 'gemini-2.5-flash-image';

  try {
    const imagePart = await fileToGenerativePart(imageFile);
    
    const prompt = `
      You are an expert high-end Fashion Stylist and Art Director.
      Analyze the attached fashion product image.
      
      1. Identify the garment color (e.g. Electric Blue), fabric type (e.g. Silk), and style (e.g. Gen-Z Partywear).
      2. Suggest 3 distinct, professional background concepts that complement the garment.
         - Avoid colors that clash with the garment.
         - Ensure good contrast.
         - Consider current trends (Summer 2025, Minimalist Luxury, Urban).
      
      Return the result as a JSON array with this structure:
      [
        {
          "theme": "Title of theme",
          "reasoning": "Why this works",
          "prompt": "Full descriptive image generation prompt",
          "colorPalette": ["#Hex1", "#Hex2"]
        }
      ]
      
      Do not include markdown formatting like \`\`\`json. Just return the raw JSON string.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [imagePart, { text: prompt }]
      },
      config: {
        temperature: 0.5,
      }
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No suggestions generated");

    // Clean potential markdown code blocks
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const suggestions = JSON.parse(cleanText) as StylistSuggestion[];
    // Add IDs
    return suggestions.map((s, i) => ({ ...s, id: `sugg-${Date.now()}-${i}` }));

  } catch (error) {
    console.error("Stylist API Error:", error);
    throw error;
  }
};

// --- Generation Service ---

interface EditOptions {
  prompt: string;
  shadows: ShadowConfig;
  consistencySeed: number;
  fabricProtection: boolean;
  platformRules?: { forceWhite: boolean };
  viewAngle?: ViewAngle;
}

export const editImageBackground = async (
  imageFile: File, 
  options: EditOptions
): Promise<{ resultUrl: string; qualityMetrics: QualityMetrics }> => {
  const ai = getClient();
  const model = 'gemini-2.5-flash-image';

  try {
    const imagePart = await fileToGenerativePart(imageFile);

    // 1. Shadow Logic
    let shadowInstruction = "";
    if (options.shadows.enabled) {
      shadowInstruction = `
        - SHADOWS: Generate a ${options.shadows.mode} contact shadow grounding the subject. 
        - Shadow Opacity: ${options.shadows.opacity}%.
        - Light Direction: Incoming from angle ${options.shadows.angle} degrees.
        - Ensure the shadow interacts realistically with the floor plane.
      `;
    } else {
      shadowInstruction = `- SHADOWS: REMOVE all cast shadows. The subject should float or sit on a pure flat surface with no shadow spill.`;
    }

    // 2. Platform & Background Logic
    let bgInstruction = `Background: "${options.prompt}".`;
    if (options.platformRules?.forceWhite) {
      bgInstruction = `Background: PURE SOLID WHITE (Hex #FFFFFF). No textures, no gradients, no wall details.`;
    }

    // 3. Fabric Protection Logic
    let protectionInstruction = "";
    if (options.fabricProtection) {
      protectionInstruction = `
        - CRITICAL PRIORITY: FABRIC & TEXTURE LOCK.
        - Do NOT smooth garment textures. Preserve ribbing, mesh, lace, and print details pixel-for-pixel.
        - Do NOT alter garment colors. Maintain original Hex codes of the subject.
        - Do NOT hallucinate new accessories or change the model's pose.
      `;
    }

    // 4. View Angle & Geometric Consistency
    let viewInstruction = "";
    if (options.viewAngle) {
      viewInstruction = `
        - SUBJECT ANGLE: This is the ${options.viewAngle.toUpperCase()} view of the product.
        - PERSPECTIVE: Maintain a camera height of 90cm relative to the floor.
        - HORIZON LINE: Keep the floor-to-wall horizon line at exactly 15% from the bottom edge to ensure consistency with other angles in the batch.
        - LIGHTING TEMP: 5500K (Daylight Balanced) constant.
      `;
    }

    const fullPrompt = `
      Task: High-End Fashion E-Commerce Background Replacement.
      
      ${bgInstruction}
      
      Directives:
      1. SEGMENTATION: Use semantic segmentation to isolate the subject (person/garment) with hair-strand precision.
      ${protectionInstruction}
      ${shadowInstruction}
      ${viewInstruction}
      4. LIGHTING: Adjust subject lighting subtly ONLY to match the background environment (Global Illumination), but preserve skin tones.
      5. OUTPUT: Photorealistic, 4k resolution, catalog-ready image.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
            imagePart,
            { text: fullPrompt }
        ]
      },
      config: {
        // Use the seed for batch consistency
        seed: options.consistencySeed,
        // Temperature low for more deterministic adherence to constraints
        temperature: 0.4, 
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
        throw new Error("No content generated");
    }

    let base64Image = "";
    for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
            base64Image = part.inlineData.data;
            break;
        }
    }

    if (!base64Image) {
        const textOutput = parts.find(p => p.text)?.text;
        if (textOutput) {
             throw new Error("Model refused generation: " + textOutput);
        }
        throw new Error("No image data found in response");
    }

    const resultUrl = `data:image/png;base64,${base64Image}`;
    
    // Simulate Intelligent Quality Scoring
    const randomScore = (min: number, max: number) => Math.random() * (max - min) + min;
    
    const edgeQuality = randomScore(88, 99);
    const realism = randomScore(85, 98);
    const colorAccuracy = options.fabricProtection ? randomScore(95, 100) : randomScore(85, 95);
    const deltaE = (100 - colorAccuracy) / 5; 

    const qualityMetrics: QualityMetrics = {
        overall: (edgeQuality + colorAccuracy + realism) / 300,
        edgeQuality,
        colorAccuracy,
        realism,
        deltaE
    };

    return { resultUrl, qualityMetrics };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};