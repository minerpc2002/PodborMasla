import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Search, History, Heart, ShieldCheck, User, Gift, HelpCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useEffect, useState } from 'react';
import { setupTelegram } from '../lib/telegram';
import AuthModal from './AuthModal';
import PromoModal from './PromoModal';
import FAQModal from './FAQModal';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'motion/react';

export default function Layout() {
  const location = useLocation();
  const { nickname, promoCode, promoCodeActivatedAt } = useAppStore();
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [isFAQModalOpen, setIsFAQModalOpen] = useState(false);

  useEffect(() => {
    setupTelegram();
  }, []);

  const navItems = [
    { path: '/', icon: Home, label: 'Главная' },
    { path: '/search', icon: Search, label: 'Подбор' },
    { path: '/history', icon: History, label: 'История' },
    { path: '/favorites', icon: Heart, label: 'Избранное' },
  ];

  const isPromoActive = promoCode === 'MASLOMARKET' && 
    (!promoCodeActivatedAt || Date.now() - promoCodeActivatedAt < 7 * 24 * 60 * 60 * 1000);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans">
      <AuthModal />
      <PromoModal isOpen={isPromoModalOpen} onClose={() => setIsPromoModalOpen(false)} />
      <FAQModal isOpen={isFAQModalOpen} onClose={() => setIsFAQModalOpen(false)} />
      
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 w-full bg-slate-50/80 backdrop-blur-xl dark:bg-zinc-950/80 border-b border-zinc-200/50 dark:border-zinc-800/50"
      >
        <div className="flex h-16 items-center justify-between px-6 max-w-md mx-auto w-full">
          <Link to="/" className="flex items-center gap-3 font-display font-bold text-lg tracking-tight">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-blue-600 text-white p-1.5 rounded-xl shadow-sm"
            >
              <Search size={20} strokeWidth={2.5} />
            </motion.div>
            <div className="flex flex-col leading-none">
              <span className="text-zinc-900 dark:text-zinc-50">MasloMARKET</span>
              <span className="text-[10px] uppercase tracking-widest text-purple-600 dark:text-purple-400 mt-0.5 font-black">
                ПОДБОР AI
              </span>
            </div>
          </Link>
          
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsFAQModalOpen(true)}
              className="p-2 text-zinc-400 hover:text-blue-600 transition-colors"
            >
              <HelpCircle size={20} />
            </motion.button>

            {nickname && (
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsPromoModalOpen(true)}
                className="flex items-center gap-2 bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <User size={12} className="text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs font-medium max-w-[80px] truncate">{nickname}</span>
                {isPromoActive ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="PRO Аккаунт" />
                ) : (
                  <Gift size={14} className="text-emerald-500" title="Ввести промокод" />
                )}
              </motion.button>
            )}
          </div>
        </div>
      </motion.header>

      <main className="flex-1 w-full max-w-md mx-auto p-4 pb-8">
        <Outlet />
        
        <footer className="mt-12 mb-24 flex flex-col items-center justify-center text-center space-y-3 opacity-60">
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-500" />
            <span>Конфиденциально и защищено M.A.R.A.T Guard</span>
          </div>
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 max-w-[280px] leading-relaxed">
            Проверка идет по официальной базе данных MasloMarket.
            <br />
            &copy; {new Date().getFullYear()} MasloMarket. Все права защищены.
          </p>
        </footer>
      </main>

      <motion.nav 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-6 left-0 right-0 z-50 px-4 pb-safe pointer-events-none"
      >
        <div className="max-w-md mx-auto pointer-events-auto">
          <div className="flex h-16 items-center justify-around px-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 rounded-full nav-shadow">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex flex-col items-center justify-center w-16 h-full gap-1 text-[10px] font-medium transition-all duration-200",
                    isActive 
                      ? "text-blue-600 dark:text-blue-400 scale-105" 
                      : "text-zinc-400 hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-300"
                  )}
                >
                  <motion.div
                    animate={isActive ? { y: -2 } : { y: 0 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  </motion.div>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </motion.nav>
    </div>
  );
}
