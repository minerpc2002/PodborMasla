import { Link } from 'react-router-dom';
import { Search, ScanLine, ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

export default function Home() {
  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-3 pt-2">
        <h1 className="text-4xl font-display font-bold tracking-tight leading-tight">
          Умный подбор<br/>
          <span className="text-blue-600 dark:text-blue-500">масел и жидкостей</span>
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-base">
          Профессиональный сервис для точного подбора технических жидкостей
        </p>
      </div>

      <div className="grid gap-5">
        <Link to="/search" state={{ tab: 'vin' }} className="block group">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-[1px]">
            <div className="absolute inset-0 bg-white/10 group-hover:bg-transparent transition-colors" />
            <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[23px] p-6 text-white overflow-hidden">
              <div className="absolute -right-6 -top-6 opacity-20 group-hover:scale-110 transition-transform duration-500">
                <ScanLine size={120} strokeWidth={1} />
              </div>
              
              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl w-fit">
                    <ScanLine size={28} className="text-white" />
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold tracking-wider uppercase">
                    <Sparkles size={12} />
                    AI Подбор
                  </div>
                </div>
                
                <div>
                  <h2 className="text-2xl font-display font-bold mb-1">По VIN коду</h2>
                  <p className="text-blue-100 text-sm">Нейросеть проанализирует VIN и подберет 100% подходящие жидкости</p>
                </div>
                
                <div className="flex items-center gap-2 text-sm font-medium mt-2 group-hover:translate-x-1 transition-transform">
                  Начать поиск <ArrowRight size={16} />
                </div>
              </div>
            </div>
          </div>
        </Link>

        <Link to="/search" state={{ tab: 'manual' }}>
          <Card className="rounded-3xl border-none shadow-sm bg-white dark:bg-zinc-900 hover:shadow-md transition-all group">
            <CardHeader className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded-2xl group-hover:scale-110 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                  <Search size={24} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg font-display flex items-center gap-2">
                    По автомобилю
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded-full">
                      Beta
                    </span>
                  </CardTitle>
                  <CardDescription className="text-sm mt-0.5">Марка, модель, год, двигатель</CardDescription>
                </div>
                <ArrowRight size={20} className="text-zinc-300 dark:text-zinc-700 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <div className="mt-2 p-5 rounded-3xl bg-white dark:bg-zinc-900 shadow-sm">
        <h3 className="font-display font-semibold mb-3 text-sm text-zinc-500 uppercase tracking-wider">Официальные партнеры</h3>
        <div className="flex flex-wrap gap-2">
          <span className="px-4 py-2 bg-slate-50 dark:bg-zinc-800/50 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-300">Ravenol</span>
          <span className="px-4 py-2 bg-slate-50 dark:bg-zinc-800/50 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-300">Motul</span>
          <span className="px-4 py-2 bg-slate-50 dark:bg-zinc-800/50 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-300">BARDAHL</span>
          <span className="px-4 py-2 bg-slate-50 dark:bg-zinc-800/50 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-300">Liqui Moly</span>
          <span className="px-4 py-2 bg-slate-50 dark:bg-zinc-800/50 rounded-xl text-sm font-semibold text-zinc-700 dark:text-zinc-300">Moly Green</span>
        </div>
      </div>
    </div>
  );
}
