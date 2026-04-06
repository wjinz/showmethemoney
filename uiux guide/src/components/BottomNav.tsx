import { Home, Wallet, Plus } from 'lucide-react';
import { ViewType } from '../types';

interface BottomNavProps {
  view: ViewType;
  setView: (v: ViewType) => void;
  onAddClick: () => void;
}

export default function BottomNav({ view, setView, onAddClick }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[var(--theme-surface)]/90 backdrop-blur-xl border-t border-[var(--theme-border)] px-8 py-4 flex justify-between items-center z-40 transition-colors duration-500 pb-safe">
      <button
        onClick={() => setView('home')}
        className={`flex flex-col items-center gap-1 transition-all duration-300 ${view === 'home' ? 'text-[var(--theme-primary)] scale-110' : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]'}`}
      >
        <Home size={24} strokeWidth={view === 'home' ? 2.5 : 2} />
        <span className="text-[10px] font-bold tracking-wide">공동</span>
      </button>

      <button
        onClick={onAddClick}
        className="w-16 h-16 bg-gradient-to-tr from-[var(--theme-primary)] to-blue-600 dark:to-blue-800 text-white rounded-full flex items-center justify-center shadow-[0_8px_30px_rgba(28,43,74,0.4)] transform -translate-y-6 hover:scale-105 active:scale-95 transition-all duration-300 border-4 border-[var(--theme-bg)]"
      >
        <Plus size={32} strokeWidth={2.5} />
      </button>

      <button
        onClick={() => setView('private')}
        className={`flex flex-col items-center gap-1 transition-all duration-300 ${view === 'private' ? 'text-[var(--theme-secondary)] scale-110' : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]'}`}
      >
        <Wallet size={24} strokeWidth={view === 'private' ? 2.5 : 2} />
        <span className="text-[10px] font-bold tracking-wide">개인</span>
      </button>
    </div>
  );
}
