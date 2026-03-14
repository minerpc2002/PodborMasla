import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search as SearchIcon, ScanLine, Loader2, Settings2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { searchByVin, searchByCarDetails, suggestCarBodies, suggestCarModels, suggestCarEngines } from '../lib/gemini';
import { useAppStore } from '../store/useAppStore';

const POPULAR_BRANDS = [
  'Toyota', 'Nissan', 'Honda', 'Mazda', 'Subaru', 'Mitsubishi', 'Suzuki', 'Lexus', 'Infiniti', 'Acura',
  'Hyundai', 'KIA', 'Genesis',
  'Chery', 'Haval', 'Geely', 'Changan', 'Exeed', 'Omoda', 'Tank', 'Zeekr', 'Li Auto', 'BYD',
  'Volkswagen', 'Audi', 'BMW', 'Mercedes-Benz', 'Skoda', 'Porsche', 'Volvo', 'Land Rover', 'Jaguar', 'Peugeot', 'Renault',
  'Ford', 'Chevrolet', 'Dodge', 'Jeep', 'Cadillac', 'Chrysler', 'Tesla', 'Daihatsu'
].sort();

export default function Search() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addDynamicCar, canSearch, recordSearch } = useAppStore();
  
  const defaultTab = location.state?.tab || 'manual';
  
  // Manual Search State
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [body, setBody] = useState('');
  const [engine, setEngine] = useState('');
  const [isSearchingManual, setIsSearchingManual] = useState(false);
  const [manualError, setManualError] = useState('');

  // Body Suggestions State
  const [bodySuggestions, setBodySuggestions] = useState<string[]>([]);
  const [isLoadingBodies, setIsLoadingBodies] = useState(false);

  // Model Suggestions State
  const [modelSuggestions, setModelSuggestions] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Engine Suggestions State
  const [engineSuggestions, setEngineSuggestions] = useState<string[]>([]);
  const [isLoadingEngines, setIsLoadingEngines] = useState(false);

  useEffect(() => {
    if (brand && brand.length >= 2) {
      const fetchModels = async () => {
        setIsLoadingModels(true);
        try {
          const models = await suggestCarModels(brand);
          setModelSuggestions(models);
        } catch (e) {
          console.error('Failed to fetch model suggestions', e);
        } finally {
          setIsLoadingModels(false);
        }
      };

      const timer = setTimeout(fetchModels, 800);
      return () => clearTimeout(timer);
    } else {
      setModelSuggestions([]);
    }
  }, [brand]);

  useEffect(() => {
    if (brand && model && year && year.length === 4) {
      const fetchBodies = async () => {
        setIsLoadingBodies(true);
        try {
          const bodies = await suggestCarBodies(brand, model, year);
          setBodySuggestions(bodies);
        } catch (e) {
          console.error('Failed to fetch body suggestions', e);
        } finally {
          setIsLoadingBodies(false);
        }
      };

      const timer = setTimeout(fetchBodies, 800);
      return () => clearTimeout(timer);
    } else {
      setBodySuggestions([]);
    }
  }, [brand, model, year]);

  useEffect(() => {
    if (brand && model && year && year.length === 4 && body) {
      const fetchEngines = async () => {
        setIsLoadingEngines(true);
        try {
          const engines = await suggestCarEngines(brand, model, year, body);
          setEngineSuggestions(engines);
        } catch (e) {
          console.error('Failed to fetch engine suggestions', e);
        } finally {
          setIsLoadingEngines(false);
        }
      };

      const timer = setTimeout(fetchEngines, 800);
      return () => clearTimeout(timer);
    } else {
      setEngineSuggestions([]);
    }
  }, [brand, model, year, body]);

  // VIN Search State
  const [vin, setVin] = useState('');
  const [isSearchingVin, setIsSearchingVin] = useState(false);
  const [vinError, setVinError] = useState('');

  // Common Parameters
  const [mileage, setMileage] = useState('');
  const [conditions, setConditions] = useState('');

  const handleManualSearch = async () => {
    if (!brand || !model || !body) {
      setManualError('Пожалуйста, заполните марку, модель и кузов автомобиля');
      return;
    }
    
    const { allowed, remainingMinutes } = canSearch();
    if (!allowed) {
      setManualError(`Лимит поисков исчерпан. Пожалуйста, подождите ${remainingMinutes} мин.`);
      return;
    }
    
    setIsSearchingManual(true);
    setManualError('');
    
    try {
      const carData = await searchByCarDetails(brand, model, year, body, engine, mileage, conditions);
      recordSearch();
      addDynamicCar(carData);
      navigate(`/result/${carData.id}`);
    } catch (error: any) {
      console.error('Manual Search Error:', error);
      setManualError(error.message || 'Не удалось найти данные по этому автомобилю. Проверьте правильность ввода.');
    } finally {
      setIsSearchingManual(false);
    }
  };

  const handleVinSearch = async () => {
    if (!vin || vin.length < 10) {
      setVinError('Введите корректный VIN код (минимум 10 символов)');
      return;
    }
    
    const { allowed, remainingMinutes } = canSearch();
    if (!allowed) {
      setVinError(`Лимит поисков исчерпан. Пожалуйста, подождите ${remainingMinutes} мин.`);
      return;
    }
    
    setIsSearchingVin(true);
    setVinError('');
    
    try {
      const carData = await searchByVin(vin, mileage, conditions);
      recordSearch();
      addDynamicCar(carData);
      navigate(`/result/${carData.id}`);
    } catch (error: any) {
      console.error('VIN Search Error:', error);
      setVinError(error.message || 'Не удалось распознать VIN или найти данные. Попробуйте ручной поиск.');
    } finally {
      setIsSearchingVin(false);
    }
  };

  const renderCommonParams = () => (
    <div className="space-y-4 pt-4 mt-4 border-t border-zinc-100 dark:border-zinc-800">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
        <Settings2 size={16} />
        Уточняющие параметры (опционально)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-500">Пробег</label>
          <Select value={mileage} onChange={(e) => setMileage(e.target.value)}>
            <option value="">Не указан</option>
            <option value="До 50 000 км">До 50 000 км</option>
            <option value="50 000 - 100 000 км">50 000 - 100 000 км</option>
            <option value="100 000 - 150 000 км">100 000 - 150 000 км</option>
            <option value="Более 150 000 км">Более 150 000 км</option>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-500">Условия эксплуатации</label>
          <Select value={conditions} onChange={(e) => setConditions(e.target.value)}>
            <option value="">Обычные</option>
            <option value="Город (пробки)">Город (пробки)</option>
            <option value="Трасса">Трасса</option>
            <option value="Смешанный">Смешанный</option>
            <option value="Тяжелые (бездорожье, прицеп)">Тяжелые (бездорожье, прицеп)</option>
            <option value="Спортивная езда">Спортивная езда</option>
          </Select>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Выбор авто</h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          Укажите параметры или введите VIN для точного подбора
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="manual" className="flex items-center gap-1.5">
            По автомобилю
            <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-[9px] font-bold uppercase tracking-wider rounded-md">
              Beta
            </span>
          </TabsTrigger>
          <TabsTrigger value="vin">По VIN коду</TabsTrigger>
        </TabsList>
        
        <TabsContent value="manual">
          <Card className="border-none shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Марка автомобиля</label>
                <Input 
                  list="brands-list"
                  placeholder="Например: Toyota" 
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  disabled={isSearchingManual}
                />
                <datalist id="brands-list">
                  {POPULAR_BRANDS.map(b => <option key={b} value={b} />)}
                </datalist>
              </div>

              <div className="space-y-2 relative">
                <label className="text-sm font-medium flex items-center gap-2">
                  Модель
                  {isLoadingModels && <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />}
                </label>
                <Input 
                  list="models-list"
                  placeholder="Например: Camry" 
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  disabled={isSearchingManual}
                />
                <datalist id="models-list">
                  {modelSuggestions.map(m => <option key={m} value={m} />)}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Год <span className="text-zinc-400 font-normal">(опц.)</span></label>
                  <Input 
                    type="number"
                    placeholder="Например: 2020" 
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    disabled={isSearchingManual}
                    min={1990}
                    max={2026}
                  />
                </div>
                <div className="space-y-2 relative">
                  <label className="text-sm font-medium flex items-center gap-2">
                    Кузов
                    {isLoadingBodies && <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />}
                  </label>
                  <Input 
                    list="body-list"
                    placeholder="Например: XV70" 
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    disabled={isSearchingManual}
                  />
                  <datalist id="body-list">
                    {bodySuggestions.map(b => <option key={b} value={b} />)}
                  </datalist>
                </div>
              </div>

              <div className="space-y-2 relative">
                <label className="text-sm font-medium flex items-center gap-2">
                  Двигатель <span className="text-zinc-400 font-normal">(опц.)</span>
                  {isLoadingEngines && <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />}
                </label>
                <Input 
                  list="engines-list"
                  placeholder="Например: 2.5 или 2AR-FE" 
                  value={engine}
                  onChange={(e) => setEngine(e.target.value)}
                  disabled={isSearchingManual}
                />
                <datalist id="engines-list">
                  {engineSuggestions.map(e => <option key={e} value={e} />)}
                </datalist>
              </div>

              {renderCommonParams()}

              {manualError && <p className="text-sm text-red-500 mt-2">{manualError}</p>}
              <p className="text-xs text-zinc-500">
                ИИ проанализирует данные и подберет жидкости для любого автомобиля мирового рынка.
              </p>

              <Button 
                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white" 
                size="lg"
                disabled={!brand || !model || !body || isSearchingManual}
                onClick={handleManualSearch}
              >
                {isSearchingManual ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Поиск в базе...
                  </>
                ) : (
                  <>
                    <SearchIcon className="mr-2 h-5 w-5" />
                    Подобрать масла
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="vin">
          <Card className="border-none shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  VIN код автомобиля
                </label>
                <Input 
                  placeholder="WVGZZZ..." 
                  value={vin}
                  onChange={(e) => setVin(e.target.value.toUpperCase())}
                  disabled={isSearchingVin}
                  className="uppercase font-mono"
                  maxLength={17}
                />
                {vinError && <p className="text-sm text-red-500">{vinError}</p>}
                <p className="text-xs text-zinc-500">
                  ИИ проанализирует VIN и автоматически подберет подходящие жидкости.
                </p>
              </div>

              {renderCommonParams()}

              <Button 
                className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white" 
                size="lg"
                disabled={!vin || isSearchingVin}
                onClick={handleVinSearch}
              >
                {isSearchingVin ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Анализ VIN кода...
                  </>
                ) : (
                  <>
                    <ScanLine className="mr-2 h-5 w-5" />
                    Найти по VIN
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
