import { GoogleGenAI, Type } from '@google/genai';
import { CarData } from '../types';

const productSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    brand_name: { type: Type.STRING, description: "Must be 'Ravenol', 'Motul', 'BARDAHL', 'Liqui Moly', or 'Moly Green'" },
    product_name: { type: Type.STRING },
    category: { type: Type.STRING },
    viscosity: { type: Type.STRING },
    approvals: { type: Type.ARRAY, items: { type: Type.STRING } },
    description: { type: Type.STRING, description: "Описание продукта на РУССКОМ языке" }
  },
  required: ["id", "brand_name", "product_name", "category", "viscosity", "approvals"]
};

const recommendationSchema = {
  type: Type.OBJECT,
  properties: {
    unit: { type: Type.STRING, description: "Название узла на РУССКОМ языке (например: 'Двигатель', 'АКПП', 'Раздаточная коробка', 'Передний мост', 'Задний мост', 'ГУР', 'Антифриз')" },
    fluid_type: { type: Type.STRING },
    viscosity: { type: Type.STRING },
    specification: { type: Type.STRING },
    approval: { type: Type.STRING },
    volume_liters: { type: Type.NUMBER },
    replacement_interval: { type: Type.STRING, description: "Интервал замены на РУССКОМ языке" },
    products: { type: Type.ARRAY, items: productSchema }
  },
  required: ["unit", "fluid_type", "viscosity", "specification", "approval", "volume_liters", "replacement_interval", "products"]
};

const carDataSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    brand: { type: Type.STRING },
    model: { type: Type.STRING },
    year_from: { type: Type.INTEGER },
    year_to: { type: Type.INTEGER },
    generation: { type: Type.STRING },
    engine: { type: Type.STRING },
    engine_code: { type: Type.STRING },
    engine_type: { type: Type.STRING, description: "'petrol', 'diesel', 'hybrid', or 'gas'" },
    drive: { type: Type.STRING, description: "'fwd', 'rwd', or 'awd'" },
    transmission_type: { type: Type.STRING, description: "'mt', 'at', 'cvt', or 'dsg'" },
    recommendations: { type: Type.ARRAY, items: recommendationSchema }
  },
  required: ["id", "brand", "model", "year_from", "year_to", "generation", "engine", "engine_code", "engine_type", "drive", "transmission_type", "recommendations"]
};

function getApiKey() {
  let apiKey = '';
  try { apiKey = process.env.GEMINI_API_KEY as string; } catch (e) {}
  if (!apiKey) {
    try { apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY; } catch (e) {}
  }
  if (!apiKey) {
    throw new Error('API ключ не найден. Если вы задеплоили приложение на Vercel, добавьте VITE_GEMINI_API_KEY в настройки Environment Variables.');
  }
  return apiKey;
}


async function callGeminiWithRetry(ai: any, params: any, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      if (i === retries - 1) throw error;
      const isQuotaError = error.message?.includes('429') || error.message?.includes('quota');
      if (isQuotaError) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
        continue;
      }
      throw error;
    }
  }
}

export async function suggestCarBodies(brand: string, model: string, year: string): Promise<string[]> {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `List the known body codes (кузова/поколения) for ${brand} ${model} from the year ${year}. 
Return ONLY a JSON array of strings. Example: ["XV70", "XV50", "ASV70"].`;

  try {
    const response = await callGeminiWithRetry(ai, {
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        temperature: 0.1,
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("Gemini failed", error);
    return [];
  }
}

export async function suggestCarModels(brand: string): Promise<string[]> {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `List the most popular car models for the brand ${brand}.
Return ONLY a JSON array of strings. Example: ["Camry", "Corolla", "RAV4"].`;

  try {
    const response = await callGeminiWithRetry(ai, {
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        temperature: 0.1,
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("Gemini failed", error);
    return [];
  }
}

export async function suggestCarEngines(brand: string, model: string, year: string, body: string): Promise<string[]> {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `List the known engine codes and volumes (двигатели) for ${brand} ${model} ${year} (${body}).
Return ONLY a JSON array of strings. Example: ["2.5 2AR-FE", "3.5 2GR-FKS", "2.0 M20A-FKS"].`;

  try {
    const response = await callGeminiWithRetry(ai, {
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        temperature: 0.1,
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("Gemini failed", error);
    return [];
  }
}

export async function searchByVin(vin: string, mileage?: string, conditions?: string): Promise<CarData> {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  let prompt = `You are an expert automotive fluid specialist.
Decode the following VIN: ${vin}.
Identify the exact make, model, year, engine, and transmission.
Then, provide a complete list of recommended fluids and oils for this specific vehicle.
Include recommendations for the Engine, Transmission (AT/MT/CVT/DSG), Axles/Differentials (Мосты - front and rear if applicable), Power Steering Fluid (ГУР), Antifreeze/Coolant (Антифриз - must specify color), and Brake fluid.
For each unit, provide 1-3 specific product recommendations strictly from these brands: 'Ravenol', 'Motul', 'BARDAHL', 'Liqui Moly', 'Moly Green'.
Return the response as a JSON object matching the provided schema.
Generate a unique random string for the 'id' field of the car and each product.

IMPORTANT: ALL output text, including descriptions, notes, unit names, and categories MUST be in Russian language.`;

  if (mileage || conditions) {
    prompt += `\n\nConsider the following vehicle conditions for your oil viscosity and product recommendations:`;
    if (mileage) prompt += `\n- Mileage: ${mileage}`;
    if (conditions) prompt += `\n- Driving Conditions: ${conditions}`;
    prompt += `\nAdjust the recommended viscosity (e.g., thicker oil for high mileage if applicable) and replacement intervals based on these conditions.`;
  }

  try {
    const response = await callGeminiWithRetry(ai, {
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: carDataSchema,
        temperature: 0.2,
      }
    });

    const text = response.text;
    if (!text) throw new Error('Пустой ответ от ИИ');
    return JSON.parse(text) as CarData;
  } catch (error) {
    console.error("Gemini failed", error);
    throw error;
  }
}

export async function searchByCarDetails(brand: string, model: string, year?: string, body?: string, engine?: string, mileage?: string, conditions?: string): Promise<CarData> {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  let prompt = `You are an expert automotive fluid specialist.
Identify the exact vehicle based on the following details:
Make: ${brand}
Model: ${model}`;
  
  if (year) prompt += `\nYear: ${year}`;
  if (body) prompt += `\nBody/Generation: ${body}`;
  if (engine) prompt += `\nEngine: ${engine}`;

  prompt += `\n\nProvide a complete list of recommended fluids and oils for this specific vehicle.
Include recommendations for the Engine, Transmission (AT/MT/CVT/DSG), Axles/Differentials (Мосты - front and rear if applicable), Power Steering Fluid (ГУР), Antifreeze/Coolant (Антифриз - must specify color), and Brake fluid.
For each unit, provide 1-3 specific product recommendations strictly from these brands: 'Ravenol', 'Motul', 'BARDAHL', 'Liqui Moly', 'Moly Green'.
Return the response as a JSON object matching the provided schema.
Generate a unique random string for the 'id' field of the car and each product.

IMPORTANT: ALL output text, including descriptions, notes, unit names, and categories MUST be in Russian language.`;

  if (mileage || conditions) {
    prompt += `\n\nConsider the following vehicle conditions for your oil viscosity and product recommendations:`;
    if (mileage) prompt += `\n- Mileage: ${mileage}`;
    if (conditions) prompt += `\n- Driving Conditions: ${conditions}`;
    prompt += `\nAdjust the recommended viscosity (e.g., thicker oil for high mileage if applicable) and replacement intervals based on these conditions.`;
  }

  try {
    const response = await callGeminiWithRetry(ai, {
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: carDataSchema,
        temperature: 0.2,
      }
    });

    const text = response.text;
    if (!text) throw new Error('Пустой ответ от ИИ');
    return JSON.parse(text) as CarData;
  } catch (error) {
    console.error("Gemini failed", error);
    throw error;
  }
}
