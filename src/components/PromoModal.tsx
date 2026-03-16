import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Gift, X, CheckCircle2, Clock, Search } from 'lucide-react';

interface PromoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PromoModal({ isOpen, onClose }: PromoModalProps) {
  const { promoCode, promoCodeActivatedAt, setPromoCode, getSearchStatus } = useAppStore();
  const [promoInput, setPromoInput] = useState('');
  const [status, setStatus] = useState({ remainingAttempts: 2, totalAttempts: 2, minutesUntilReset: 0 });

  useEffect(() => {
    if (isOpen) {
      setStatus(getSearchStatus());
    }
  }, [isOpen, getSearchStatus]);

  if (!isOpen) return null;

  const isPromoActive = promoCode === 'MASLOMARKET' && 
    (!promoCodeActivatedAt || Date.now() - promoCodeActivatedAt < 7 * 24 * 60 * 60 * 1000);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (promoInput.trim()) {
      setPromoCode(promoInput.trim().toUpperCase());
      setStatus(getSearchStatus());
      onClose();
    }
  };

  const getDaysLeft = () => {
    if (!promoCodeActivatedAt) return 7;
    const daysPassed = (Date.now() - promoCodeActivatedAt) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(7 - daysPassed));
  };

  const formatResetTime = (minutes: number) => {
    if (minutes <= 0) return '0 мин';
    if (minutes < 60) return `${minutes} мин`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} ч ${mins} мин`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md border-none shadow-2xl animate-in fade-in zoom-in-95 duration-300 relative">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X size={20} />
        </button>
        
        {isPromoActive ? (
          <>
            <CardHeader className="space-y-3 pb-4 pt-8">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-2 mx-auto">
                <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={24} />
              </div>
              <CardTitle className="text-2xl text-center font-display">PRO Аккаунт активен</CardTitle>
              <CardDescription className="text-center text-base">
                У вас активирован промокод <span className="font-bold text-zinc-900 dark:text-zinc-100">{promoCode}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl text-center space-y-2 mb-4">
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                  Вам доступно {status.totalAttempts} поисков раз в 20 минут.
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  Осталось дней: <span className="font-bold">{getDaysLeft()}</span>
                </p>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Search size={16} className="text-blue-500" />
                    <span>Осталось попыток:</span>
                  </div>
                  <span className="font-bold text-lg">{status.remainingAttempts} / {status.totalAttempts}</span>
                </div>
                {status.minutesUntilReset > 0 && (
                  <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock size={16} />
                      <span>Обновление через:</span>
                    </div>
                    <span className="text-sm font-medium">{formatResetTime(status.minutesUntilReset)}</span>
                  </div>
                )}
              </div>

              <Button 
                onClick={onClose}
                className="w-full mt-6 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white" 
                size="lg"
              >
                Отлично
              </Button>
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader className="space-y-3 pb-4 pt-8">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-2 mx-auto">
                <Gift className="text-emerald-600 dark:text-emerald-400" size={24} />
              </div>
              <CardTitle className="text-2xl text-center font-display">Активация промокода</CardTitle>
              <CardDescription className="text-center text-base">
                Введите промокод от продавца MasloMarket, чтобы увеличить лимит до 5 поисков раз в 20 минут.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl space-y-3 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Search size={16} className="text-blue-500" />
                    <span>Осталось попыток:</span>
                  </div>
                  <span className="font-bold text-lg">{status.remainingAttempts} / {status.totalAttempts}</span>
                </div>
                {status.minutesUntilReset > 0 && (
                  <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock size={16} />
                      <span>Обновление через:</span>
                    </div>
                    <span className="text-sm font-medium">{formatResetTime(status.minutesUntilReset)}</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Input 
                    placeholder="Введите промокод" 
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value)}
                    className="uppercase text-center font-bold tracking-widest"
                    autoFocus
                  />
                  <p className="text-xs text-zinc-500 text-center mt-2">
                    Бонус действует ровно 7 дней с момента активации.
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white" 
                  size="lg"
                  disabled={!promoInput.trim()}
                >
                  Активаровать
                </Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
