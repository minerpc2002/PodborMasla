import { GoogleGenAI, Type } from '@google/genai';
import { fetchRavenolData } from './ravenol';
import { CarData } from '../types';
import { decodeVin } from './vinApi';

const productSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    brand_name: { type: Type.STRING, description: "Must be 'Ravenol', 'Motul', 'BARDAHL', or 'Moly Green'" },
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
  'gemini-3.1-pro-preview',
  'gemini-3-flash-preview',
  'gemini-2.5-flash'
];

async function callGeminiWithRetry(ai: any, params: any, retries = 3): Promise<any> {
  let modelIndex = 0;
  let attempt = 0;
  
  while (attempt < retries * FREE_MODELS.length) {
    try {
      params.model = FREE_MODELS[modelIndex];
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const isQuotaError = error.message?.includes('429') || 
                          error.message?.includes('quota') || 
                          error.message?.includes('RESOURCE_EXHAUSTED');
      
      if (isQuotaError) {
        console.warn(`Лимит исчерпан для ${FREE_MODELS[modelIndex]}. Переключение на следующую модель...`);
        modelIndex = (modelIndex + 1) % FREE_MODELS.length;
        attempt++;
        
        // Небольшая задержка перед повтором
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Все доступные модели перегружены. Пожалуйста, попробуйте позже.');
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

  onStatusChange?.('Поиск в базе данных...');
  const vehicle = await decodeVin(vin);
  const hint = vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : undefined;
  
  const ravenolData = await fetchRavenolData(vin, hint);
  
  let prompt = `Expert Oil Selector. EXCLUSIVE SOURCE: podbor.ravenol.ru (Ravenol Russia).
1. Identify: VIN ${vin}. ${vehicle ? `NHTSA hint: ${vehicle.make} ${vehicle.model} ${vehicle.year}.` : ''}
2. SOURCE OF TRUTH: Use the following extracted data from podbor.ravenol.ru. This data contains exact volumes, OEM specifications, and factory viscosities.
<ravenol_data>
${ravenolData || 'No data found on podbor.ravenol.ru for this VIN.'}
</ravenol_data>
3. TASK: 
   - First, confirm the car identity (Brand, Model, Year, Engine) using BOTH the VIN and the ravenol_data.
   - If ravenol_data contains multiple options, pick the one that matches the VIN/Hint best.
   - Extract exact volumes, OEM specifications, and factory viscosities.
4. BRANDS: Recommend Ravenol (primary), Motul, Bardahl.
5. NO Liqui Moly.
6. OUTPUT: Return JSON (Russian text). Ensure "factory_viscosity" and "volume_liters" are exactly as in the catalog.`;

  onStatusChange?.('Анализ данных...');
  try {
    const response = await callGeminiWithRetry(ai, {
      model: FREE_MODELS[0],
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: carDataSchema,
        temperature: 0.1,
      }
    });

    const text = response.text;
    if (!text) throw new Error('Пустой ответ от ИИ');
    
    let carData: CarData;
    try {
      carData = JSON.parse(text) as CarData;
    } catch (e) {
      console.error("Failed to parse JSON from Gemini:", text);
      throw new Error(`Ошибка парсинга ответа ИИ: ${text.substring(0, 50)}...`);
    }
    
    // Safety filter: ensure Liqui Moly is NEVER in the results
    if (carData.recommendations) {
      carData.recommendations.forEach(rec => {
        if (rec.products) {
          rec.products = rec.products.filter(p => 
            !p.brand_name.toLowerCase().includes('liqui') && 
            !p.brand_name.toLowerCase().includes('moly')
          );
        }
      });
    }

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

  const query = `${brand} ${model} ${year || ''} ${body || ''} ${engine || ''}`.trim();
  
  onStatusChange?.('Поиск в базе данных...');
  const ravenolData = await fetchRavenolData(query);

  let prompt = `Expert Oil Selector. EXCLUSIVE SOURCE: podbor.ravenol.ru (Ravenol Russia).
Vehicle: ${query}.
1. SOURCE OF TRUTH: Use the following extracted data from podbor.ravenol.ru for exact volumes, OEM specifications, and factory viscosities:
<ravenol_data>
${ravenolData ? ravenolData.substring(0, 100000) : 'No data found on podbor.ravenol.ru for this car.'}
</ravenol_data>
2. DATA: Extract exact volumes, OEM specifications, and factory viscosities from the provided ravenol_data.
3. BRANDS: Recommend Ravenol (primary), Motul, Bardahl.
4. Units: Engine, Transmission, Diffs, Steering, Coolant, Brake.
5. NO Liqui Moly.
6. Conditions: ${mileage || ''} ${conditions || ''}.
7. OUTPUT: Return JSON (Russian text). Ensure "factory_viscosity" and "volume_liters" are exactly as in the catalog.`;

  onStatusChange?.('Анализ данных...');
  try {
    const response = await callGeminiWithRetry(ai, {
      model: FREE_MODELS[0],
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: carDataSchema,
        temperature: 0.1,
      }
    });

    const text = response.text;
    if (!text) throw new Error('Пустой ответ от ИИ');
    
    let carData: CarData;
    try {
      carData = JSON.parse(text) as CarData;
    } catch (e) {
      console.error("Failed to parse JSON from Gemini:", text);
      throw new Error(`Ошибка парсинга ответа ИИ: ${text.substring(0, 50)}...`);
    }

    // Safety filter: ensure Liqui Moly is NEVER in the results
    if (carData.recommendations) {
      carData.recommendations.forEach(rec => {
        if (rec.products) {
          rec.products = rec.products.filter(p => 
            !p.brand_name.toLowerCase().includes('liqui') && 
            !p.brand_name.toLowerCase().includes('moly')
          );
        }
      });
    }

    return carData;
  } catch (error) {
    console.error("Gemini failed", error);
    throw error;
  }
}
