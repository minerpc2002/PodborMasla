import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ShieldCheck, User } from 'lucide-react';

export default function AuthModal() {
  const { nickname, setNickname, setPromoCode } = useAppStore();
  const [nameInput, setNameInput] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [error, setError] = useState('');

  if (nickname) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim().length < 3) {
      setError('Никнейм должен содержать минимум 3 символа');
      return;
    }
    
    setNickname(nameInput.trim());
    if (promoInput.trim()) {
      setPromoCode(promoInput.trim().toUpperCase());
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md border-none shadow-2xl animate-in fade-in zoom-in-95 duration-300">
        <CardHeader className="space-y-3 pb-4">
          <div className="w-12 h-12 bg-blue-900/30 rounded-full flex items-center justify-center mb-2 mx-auto">
            <User className="text-blue-400" size={24} />
          </div>
          <CardTitle className="text-2xl text-center font-display">Авторизация</CardTitle>
          <CardDescription className="text-center text-base">
            Пожалуйста, представьтесь для использования сервиса подбора
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ваш никнейм *</label>
              <Input 
                placeholder="Например: Alex99" 
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                autoFocus
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
            
            <div className="space-y-2 pt-2">
              <label className="text-sm font-medium">Промокод (опционально)</label>
              <Input 
                placeholder="Введите промокод" 
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                className="uppercase"
              />
              <p className="text-xs text-zinc-500 leading-relaxed">
                <span className="font-semibold text-zinc-300">Внимание:</span> Промокод могут предоставить только продавцы магазина MasloMarket. Он увеличивает лимит поисков.
              </p>
            </div>

            <Button type="submit" className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white" size="lg">
              Продолжить
            </Button>
            
            <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-400 mt-4">
              <ShieldCheck size={14} />
              <span>Данные защищены M.A.R.A.T Guard</span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
