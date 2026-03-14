import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { History as HistoryIcon, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function History() {
  const { history, clearHistory } = useAppStore();

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <HistoryIcon className="text-blue-500" />
            История
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400">
            Последние просмотренные автомобили
          </p>
        </div>
        {history.length > 0 && (
          <Button variant="ghost" size="icon" onClick={clearHistory} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
            <Trash2 size={20} />
          </Button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-zinc-500 dark:text-zinc-400">
          <HistoryIcon size={48} className="opacity-20" />
          <p>История пуста</p>
          <Link to="/search" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
            Перейти к подбору
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {history.map((car, idx) => (
            <Link key={`${car.id}-${idx}`} to={`/result/${car.id}`}>
              <Card className="hover:border-blue-500 transition-colors cursor-pointer group">
                <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-lg">{car.brand} {car.model}</CardTitle>
                    <CardDescription className="mt-1">
                      {car.year_from}-{car.year_to} • {car.engine} ({car.engine_code})
                    </CardDescription>
                  </div>
                  <ChevronRight className="text-zinc-400 group-hover:text-blue-500 transition-colors" />
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
