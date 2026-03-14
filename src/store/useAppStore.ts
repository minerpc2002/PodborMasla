import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CarData } from '../types';

interface AppState {
  favorites: CarData[];
  history: CarData[];
  dynamicCars: CarData[];
  nickname: string | null;
  promoCode: string | null;
  promoCodeActivatedAt: number | null;
  searchTimestamps: number[];
  
  addFavorite: (car: CarData) => void;
  removeFavorite: (carId: string) => void;
  addToHistory: (car: CarData) => void;
  clearHistory: () => void;
  addDynamicCar: (car: CarData) => void;
  
  setNickname: (name: string) => void;
  setPromoCode: (code: string) => void;
  recordSearch: () => void;
  canSearch: () => { allowed: boolean; remainingMinutes: number };
  getSearchStatus: () => { remainingAttempts: number; totalAttempts: number; minutesUntilReset: number };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      favorites: [],
      history: [],
      dynamicCars: [],
      nickname: null,
      promoCode: null,
      promoCodeActivatedAt: null,
      searchTimestamps: [],
      
      addFavorite: (car) => set((state) => ({ 
        favorites: state.favorites.some(f => f.id === car.id) 
          ? state.favorites 
          : [...state.favorites, car] 
      })),
      removeFavorite: (carId) => set((state) => ({ 
        favorites: state.favorites.filter(f => f.id !== carId) 
      })),
      addToHistory: (car) => set((state) => {
        const newHistory = state.history.filter(h => h.id !== car.id);
        return { history: [car, ...newHistory].slice(0, 10) };
      }),
      clearHistory: () => set({ history: [] }),
      addDynamicCar: (car) => set((state) => {
        const newDynamic = state.dynamicCars.filter(c => c.id !== car.id);
        return { dynamicCars: [car, ...newDynamic].slice(0, 20) };
      }),
      
      setNickname: (name) => set({ nickname: name }),
      setPromoCode: (code) => set({ 
        promoCode: code, 
        promoCodeActivatedAt: code ? Date.now() : null 
      }),
      
      recordSearch: () => set((state) => {
        const now = Date.now();
        const twentyMinsAgo = now - 20 * 60 * 1000;
        const recentSearches = state.searchTimestamps.filter(t => t > twentyMinsAgo);
        return { searchTimestamps: [...recentSearches, now] };
      }),
      
      getSearchStatus: () => {
        const state = get();
        const now = Date.now();
        const twentyMinsAgo = now - 20 * 60 * 1000;
        const recentSearches = state.searchTimestamps.filter(t => t > twentyMinsAgo);
        
        let isPromoActive = false;
        if (state.promoCode === 'MASLOMARKET') {
          const sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000;
          if (!state.promoCodeActivatedAt || (now - state.promoCodeActivatedAt < sevenDaysInMillis)) {
            isPromoActive = true;
          }
        }
        
        const limit = isPromoActive ? 5 : 2;
        const remainingAttempts = Math.max(0, limit - recentSearches.length);
        
        let minutesUntilReset = 0;
        if (recentSearches.length > 0) {
          const oldestSearch = recentSearches[0];
          const timeUntilNext = (oldestSearch + 20 * 60 * 1000) - now;
          minutesUntilReset = Math.ceil(timeUntilNext / 60000);
        }
        
        return { remainingAttempts, totalAttempts: limit, minutesUntilReset };
      },

      canSearch: () => {
        const state = get();
        const now = Date.now();
        const twentyMinsAgo = now - 20 * 60 * 1000;
        const recentSearches = state.searchTimestamps.filter(t => t > twentyMinsAgo);
        
        // Check if promo code is active and within 7 days
        let isPromoActive = false;
        if (state.promoCode === 'MASLOMARKET') {
          const sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000;
          if (!state.promoCodeActivatedAt || (now - state.promoCodeActivatedAt < sevenDaysInMillis)) {
            isPromoActive = true;
          }
        }
        
        const limit = isPromoActive ? 5 : 2;
        
        if (recentSearches.length < limit) {
          return { allowed: true, remainingMinutes: 0 };
        }
        
        // Find the oldest search in the current 20-min window
        const oldestSearch = recentSearches[0];
        const timeUntilNext = (oldestSearch + 20 * 60 * 1000) - now;
        const remainingMinutes = Math.ceil(timeUntilNext / 60000);
        
        return { allowed: false, remainingMinutes };
      }
    }),
    {
      name: 'oil-selector-storage',
    }
  )
);
