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

function getGigaChatApiKey() {
  let apiKey = '';
  try { apiKey = process.env.GIGACHAT_API_KEY as string; } catch (e) {}
  if (!apiKey) {
    try { apiKey = (import.meta as any).env.VITE_GIGACHAT_API_KEY; } catch (e) {}
  }
  return apiKey;
}

let gigaChatToken = '';
let gigaChatTokenExpiresAt = 0;

async function getGigaChatAccessToken(authKey: string): Promise<string> {
  if (gigaChatToken && Date.now() < gigaChatTokenExpiresAt) {
    return gigaChatToken;
  }
  
  const response = await fetch("https://ngw.devices.sberbank.ru:9443/api/v2/oauth", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
      "RqUID": crypto.randomUUID(),
      "Authorization": `Basic ${authKey}`
    },
    body: "scope=GIGACHAT_API_PERS"
  });
  
  if (!response.ok) {
    throw new Error(`GigaChat auth error: ${response.status}`);
  }
  
  const data = await response.json();
  gigaChatToken = data.access_token;
  gigaChatTokenExpiresAt = data.expires_at;
  return gigaChatToken;
}

async function fallbackToGigaChat(prompt: string, isArray: boolean = false): Promise<string> {
  const authKey = getGigaChatApiKey();
  if (!authKey) {
    throw new Error('GigaChat API key not found. Please add VITE_GIGACHAT_API_KEY to your environment variables.');
  }

  const token = await getGigaChatAccessToken(authKey);

  const systemPrompt = isArray 
    ? "You are a helpful automotive expert. You must output ONLY a valid JSON array of strings. Do not include any markdown formatting like ```json, just the raw array."
    : "You are a helpful automotive expert. You must output ONLY a valid JSON object. Do not include any markdown formatting like ```json, just the raw object.";

  const response = await fetch("https://gigachat.devices.sberbank.ru/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      model: "GigaChat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GigaChat API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  let text = data.choices[0].message.content.trim();
  
  if (text.startsWith('```json')) {
    text = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  } else if (text.startsWith('```')) {
    text = text.replace(/^```\n?/, '').replace(/\n?```$/, '');
  }
  
  return text.trim();
}

export async function suggestCarBodies(brand: string, model: string, year: string): Promise<string[]> {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `List the known body codes (кузова/поколения) for ${brand} ${model} from the year ${year}. 
Return ONLY a JSON array of strings. Example: ["XV70", "XV50", "ASV70"].`;

  try {
    const response = await ai.models.generateContent({
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
    console.warn("Gemini failed, falling back to GigaChat...", error);
    try {
      const text = await fallbackToGigaChat(prompt, true);
      return JSON.parse(text) as string[];
    } catch (gcError) {
      console.error("GigaChat also failed", gcError);
      return [];
    }
  }
}

export async function suggestCarModels(brand: string): Promise<string[]> {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `List the most popular car models for the brand ${brand}.
Return ONLY a JSON array of strings. Example: ["Camry", "Corolla", "RAV4"].`;

  try {
    const response = await ai.models.generateContent({
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
    console.warn("Gemini failed, falling back to GigaChat...", error);
    try {
      const text = await fallbackToGigaChat(prompt, true);
      return JSON.parse(text) as string[];
    } catch (gcError) {
      console.error("GigaChat also failed", gcError);
      return [];
    }
  }
}

export async function suggestCarEngines(brand: string, model: string, year: string, body: string): Promise<string[]> {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `List the known engine codes and volumes (двигатели) for ${brand} ${model} ${year} (${body}).
Return ONLY a JSON array of strings. Example: ["2.5 2AR-FE", "3.5 2GR-FKS", "2.0 M20A-FKS"].`;

  try {
    const response = await ai.models.generateContent({
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
    console.warn("Gemini failed, falling back to GigaChat...", error);
    try {
      const text = await fallbackToGigaChat(prompt, true);
      return JSON.parse(text) as string[];
    } catch (gcError) {
      console.error("GigaChat also failed", gcError);
      return [];
    }
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
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
    console.warn("Gemini failed, falling back to GigaChat...", error);
    
    const gigaChatPrompt = prompt + `\n\nReturn ONLY a JSON object matching this exact schema:\n${JSON.stringify({
      type: "object",
      properties: {
        id: { type: "string" },
        brand: { type: "string" },
        model: { type: "string" },
        year_from: { type: "integer" },
        year_to: { type: "integer" },
        generation: { type: "string" },
        engine: { type: "string" },
        engine_code: { type: "string" },
        engine_type: { type: "string", description: "'petrol', 'diesel', 'hybrid', or 'gas'" },
        drive: { type: "string", description: "'fwd', 'rwd', or 'awd'" },
        transmission_type: { type: "string", description: "'mt', 'at', 'cvt', or 'dsg'" },
        recommendations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              unit: { type: "string", description: "Название узла на РУССКОМ языке" },
              fluid_type: { type: "string" },
              viscosity: { type: "string" },
              specification: { type: "string" },
              approval: { type: "string" },
              volume_liters: { type: "number" },
              replacement_interval: { type: "string", description: "Интервал замены на РУССКОМ языке" },
              products: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    brand_name: { type: "string", description: "Must be 'Ravenol', 'Motul', 'BARDAHL', 'Liqui Moly', or 'Moly Green'" },
                    product_name: { type: "string" },
                    category: { type: "string" },
                    viscosity: { type: "string" },
                    approvals: { type: "array", items: { type: "string" } },
                    description: { type: "string", description: "Описание продукта на РУССКОМ языке" }
                  },
                  required: ["id", "brand_name", "product_name", "category", "viscosity", "approvals"]
                }
              }
            },
            required: ["unit", "fluid_type", "viscosity", "specification", "approval", "volume_liters", "replacement_interval", "products"]
          }
        }
      },
      required: ["id", "brand", "model", "year_from", "year_to", "generation", "engine", "engine_code", "engine_type", "drive", "transmission_type", "recommendations"]
    }, null, 2)}`;

    const text = await fallbackToGigaChat(gigaChatPrompt, false);
    return JSON.parse(text) as CarData;
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
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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
    console.warn("Gemini failed, falling back to GigaChat...", error);
    
    const gigaChatPrompt = prompt + `\n\nReturn ONLY a JSON object matching this exact schema:\n${JSON.stringify({
      type: "object",
      properties: {
        id: { type: "string" },
        brand: { type: "string" },
        model: { type: "string" },
        year_from: { type: "integer" },
        year_to: { type: "integer" },
        generation: { type: "string" },
        engine: { type: "string" },
        engine_code: { type: "string" },
        engine_type: { type: "string", description: "'petrol', 'diesel', 'hybrid', or 'gas'" },
        drive: { type: "string", description: "'fwd', 'rwd', or 'awd'" },
        transmission_type: { type: "string", description: "'mt', 'at', 'cvt', or 'dsg'" },
        recommendations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              unit: { type: "string", description: "Название узла на РУССКОМ языке" },
              fluid_type: { type: "string" },
              viscosity: { type: "string" },
              specification: { type: "string" },
              approval: { type: "string" },
              volume_liters: { type: "number" },
              replacement_interval: { type: "string", description: "Интервал замены на РУССКОМ языке" },
              products: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    brand_name: { type: "string", description: "Must be 'Ravenol', 'Motul', 'BARDAHL', 'Liqui Moly', or 'Moly Green'" },
                    product_name: { type: "string" },
                    category: { type: "string" },
                    viscosity: { type: "string" },
                    approvals: { type: "array", items: { type: "string" } },
                    description: { type: "string", description: "Описание продукта на РУССКОМ языке" }
                  },
                  required: ["id", "brand_name", "product_name", "category", "viscosity", "approvals"]
                }
              }
            },
            required: ["unit", "fluid_type", "viscosity", "specification", "approval", "volume_liters", "replacement_interval", "products"]
          }
        }
      },
      required: ["id", "brand", "model", "year_from", "year_to", "generation", "engine", "engine_code", "engine_type", "drive", "transmission_type", "recommendations"]
    }, null, 2)}`;

    const text = await fallbackToGigaChat(gigaChatPrompt, false);
    return JSON.parse(text) as CarData;
  }
}
