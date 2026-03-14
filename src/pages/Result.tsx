import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Heart, Copy, Info, CheckCircle2 } from 'lucide-react';
import { mockCars } from '../data/mockData';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useEffect } from 'react';

export default function Result() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { favorites, addFavorite, removeFavorite, addToHistory, dynamicCars } = useAppStore();
  
  const car = mockCars.find(c => c.id === id) || dynamicCars.find(c => c.id === id);
  const isFavorite = favorites.some(f => f.id === id);
  const isDynamic = !mockCars.some(c => c.id === id);

  useEffect(() => {
    if (car) {
      addToHistory(car);
    }
  }, [car, addToHistory]);

  if (!car) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <h2 className="text-xl font-bold">Автомобиль не найден</h2>
        <Button onClick={() => navigate('/search')} variant="outline">Вернуться к поиску</Button>
      </div>
    );
  }

  const toggleFavorite = () => {
    if (isFavorite) {
      removeFavorite(car.id);
    } else {
      addFavorite(car);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Масла для ${car.brand} ${car.model}`,
          text: `Подбор масел для ${car.brand} ${car.model} ${car.engine}`,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
          <ArrowLeft size={24} />
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={handleShare}>
            <Share2 size={20} />
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleFavorite} className={isFavorite ? "text-red-500" : ""}>
            <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
          </Button>
        </div>
      </div>

      {/* Car Info */}
      <div className="space-y-1">
        <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent ${isDynamic ? 'bg-purple-600 text-white hover:bg-purple-600/80' : 'bg-zinc-900 text-zinc-50 hover:bg-zinc-900/80 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-50/80'}`}>
          {isDynamic ? 'AI Подбор по VIN' : 'Точное совпадение'}
        </div>
        <h1 className="text-3xl font-bold tracking-tight mt-2">
          {car.brand} {car.model}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-lg">
          {car.generation} ({car.year_from}-{car.year_to})
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md text-sm font-medium">
            {car.engine} {car.engine_type === 'petrol' ? 'Бензин' : car.engine_type === 'diesel' ? 'Дизель' : car.engine_type === 'hybrid' ? 'Гибрид' : 'Газ'}
          </span>
          <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md text-sm font-medium">
            Код: {car.engine_code}
          </span>
          <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md text-sm font-medium">
            КПП: {car.transmission_type.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-6 mt-4">
        {car.recommendations.map((rec, idx) => (
          <Card key={idx} className="overflow-hidden border-zinc-200 dark:border-zinc-800">
            <div className="bg-zinc-100 dark:bg-zinc-900 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="font-semibold text-lg">{rec.unit}</h3>
              <span className="text-sm font-mono bg-white dark:bg-zinc-950 px-2 py-1 rounded shadow-sm">
                {rec.volume_liters} л
              </span>
            </div>
            <CardContent className="p-0">
              <div className="p-4 grid grid-cols-2 gap-4 text-sm border-b border-zinc-100 dark:border-zinc-800/50">
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400 mb-1">Допуск</p>
                  <p className="font-medium">{rec.approval}</p>
                </div>
                <div>
                  <p className="text-zinc-500 dark:text-zinc-400 mb-1">Вязкость</p>
                  <p className="font-medium">{rec.viscosity}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-zinc-500 dark:text-zinc-400 mb-1">Интервал замены</p>
                  <p className="font-medium">{rec.replacement_interval}</p>
                </div>
              </div>

              <div className="p-4 bg-zinc-50/50 dark:bg-zinc-900/20">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  Рекомендуемые продукты
                </h4>
                
                {rec.products && rec.products.length > 0 ? (
                  <Tabs defaultValue={rec.products[0]?.brand_name} className="w-full">
                    <TabsList className="w-full grid grid-cols-3 h-10 mb-4">
                      {Array.from(new Set(rec.products.map(p => p.brand_name))).map(brand => (
                        <TabsTrigger key={brand} value={brand} className="text-xs">
                          {brand}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    
                    {Array.from(new Set(rec.products.map(p => p.brand_name))).map(brand => (
                      <TabsContent key={brand} value={brand} className="space-y-3 mt-0">
                        {rec.products.filter(p => p.brand_name === brand).map(product => (
                          <div key={product.id} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                              <h5 className="font-bold text-blue-600 dark:text-blue-400 leading-tight">
                                {product.product_name}
                              </h5>
                            </div>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-2 line-clamp-2">
                              {product.description}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {product.approvals.slice(0, 3).map(app => (
                                <span key={app} className="text-[10px] px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-300">
                                  {app}
                                </span>
                              ))}
                              {product.approvals.length > 3 && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-300">
                                  +{product.approvals.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </TabsContent>
                    ))}
                  </Tabs>
                ) : (
                  <p className="text-sm text-zinc-500">Нет рекомендованных продуктов</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 flex gap-3 items-start mt-4">
        <Info className="text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" size={20} />
        <p className="text-sm text-amber-800 dark:text-amber-400 leading-relaxed">
          Выбор масла и указанные объемы являются справочными. Для более точного подбора рекомендуем обратиться к специалисту. При замене ориентируйтесь на уровень по щупу или контрольному отверстию.
        </p>
      </div>
    </div>
  );
}
