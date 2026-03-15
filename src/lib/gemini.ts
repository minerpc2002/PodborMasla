import { GoogleGenAI, Type } from '@google/genai';
import { CarData } from '../types';
import { decodeVin } from './vinApi';

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
    factory_viscosity: { type: Type.STRING, description: "Вязкость, рекомендованная заводом-изготовителем" },
    recommended_viscosity: { type: Type.STRING, description: "Вязкость, рекомендованная с учетом пробега и условий эксплуатации" },
    specification: { type: Type.STRING },
    approval: { type: Type.STRING },
    volume_liters: { type: Type.NUMBER },
    replacement_interval: { type: Type.STRING, description: "Интервал замены на РУССКОМ языке" },
    products: { type: Type.ARRAY, items: productSchema }
  },
  required: ["unit", "fluid_type", "factory_viscosity", "recommended_viscosity", "specification", "approval", "volume_liters", "replacement_interval", "products"]
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


const FREE_MODELS = [
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite-preview'
];

async function callGeminiWithRetry(ai: any, params: any, retries = 3): Promise<any> {
  let modelIndex = FREE_MODELS.indexOf(params.model);
  if (modelIndex === -1) modelIndex = 0;
  
  let attempt = 0;
  while (attempt < retries) {
    try {
      params.model = FREE_MODELS[modelIndex];
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const isQuotaError = error.message?.includes('429') || 
                          error.message?.includes('quota') || 
                          error.message?.includes('RESOURCE_EXHAUSTED');
      
      if (isQuotaError) {
        console.warn(`Quota exceeded for ${FREE_MODELS[modelIndex]}. Switching model...`);
        modelIndex = (modelIndex + 1) % FREE_MODELS.length;
        attempt++;
        
        if (attempt < retries) {
          // Small delay before retrying with next model
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
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
      model: 'gemini-3-flash-preview',
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
      model: 'gemini-3-flash-preview',
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
      model: 'gemini-3-flash-preview',
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

export async function searchByVin(vin: string, mileage?: string, conditions?: string, onStatusChange?: (status: string) => void): Promise<CarData> {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  onStatusChange?.('Декодирование VIN...');
  const vehicle = await decodeVin(vin);
  
  let prompt = `You are an expert automotive fluid specialist.`;
  
  if (vehicle) {
    prompt += `
Identify vehicle: ${vehicle.make} ${vehicle.model} ${vehicle.year}, Engine: ${vehicle.engine}.
Provide recommended fluids/oils (Engine, Transmission, Axles, Antifreeze, Brake fluid).
Use Google Search to verify specifications.
Strictly recommend: 'Ravenol', 'Motul', 'BARDAHL'. NO 'Liqui Moly'.
Return JSON matching schema.`;
  } else {
    prompt += `
Decode VIN: ${vin}. Identify exact vehicle.
Provide recommended fluids/oils (Engine, Transmission, Axles, Antifreeze, Brake fluid).
Use Google Search to verify specifications.
Strictly recommend: 'Ravenol', 'Motul', 'BARDAHL'. NO 'Liqui Moly'.
Return JSON matching schema.`;
  }

  if (mileage || conditions) {
    prompt += `\nConditions: ${mileage || ''} ${conditions || ''}. Adjust viscosity if needed.`;
  }

  onStatusChange?.('Поиск рекомендаций...');
  try {
    const response = await callGeminiWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: carDataSchema,
        temperature: 0.2,
        tools: [{ googleSearch: {} }],
      }
    });

    const text = response.text;
    if (!text) throw new Error('Пустой ответ от ИИ');
    const carData = JSON.parse(text) as CarData;
    if (carData.id === 'INVALID_VIN') {
      throw new Error('VIN-код не найден или недействителен');
    }
    return carData;
  } catch (error) {
    console.error("Gemini failed", error);
    throw error;
  }
}

export async function searchByCarDetails(brand: string, model: string, year?: string, body?: string, engine?: string, mileage?: string, conditions?: string, onStatusChange?: (status: string) => void): Promise<CarData> {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  let prompt = `You are an expert automotive fluid specialist.
Identify vehicle: ${brand} ${model} ${year || ''} ${body || ''} ${engine || ''}.
Provide recommended fluids/oils (Engine, Transmission, Axles, Antifreeze, Brake fluid).
Use Google Search to verify specifications.
Strictly recommend: 'Ravenol', 'Motul', 'BARDAHL'. NO 'Liqui Moly'.
Return JSON matching schema.`;

  if (mileage || conditions) {
    prompt += `\nConditions: ${mileage || ''} ${conditions || ''}. Adjust viscosity if needed.`;
  }

  onStatusChange?.('Поиск рекомендаций...');
  try {
    const response = await callGeminiWithRetry(ai, {
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: carDataSchema,
        temperature: 0.2,
        tools: [{ googleSearch: {} }],
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
