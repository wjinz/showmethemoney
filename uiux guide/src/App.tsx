import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import HomeView from './views/HomeView';
import PrivateView from './views/PrivateView';
import BottomNav from './components/BottomNav';
import ActionSheets from './components/ActionSheets';
import { Transaction, SosRequest, ViewType, SheetType } from './types';

export default function App() {
  const [view, setView] = useState<ViewType>('home');
  const [activeSheet, setActiveSheet] = useState<SheetType>('none');
  const [transactions, setTransactions] = useState<Transaction[]>([
    { id: '1', amount: 45000, category: '식비', description: '이마트 장보기', date: new Date().toISOString(), is_private: false },
    { id: '2', amount: 12000, category: '카페', description: '스타벅스', date: new Date().toISOString(), is_private: false },
    { id: '3', amount: 35000, category: '게임', description: '스팀 결제', date: new Date().toISOString(), is_private: true },
  ]);
  const [sosRequests, setSosRequests] = useState<SosRequest[]>([
    { id: 's1', amount: 150000, reason: '플스 타이틀 할인해요 🥺', status: 'pending', requester: 'spouse', date: new Date().toISOString() }
  ]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', view === 'private' ? 'private' : 'joint');
  }, [view]);

  return (
    <div className="min-h-screen w-full max-w-md mx-auto relative overflow-hidden flex flex-col transition-colors duration-500" style={{ backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)' }}>
      <main className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {view === 'home' ? (
            <motion.div key="home" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.3 }}>
              <HomeView transactions={transactions.filter(t => !t.is_private)} sosRequests={sosRequests} setSosRequests={setSosRequests} setTransactions={setTransactions} />
            </motion.div>
          ) : (
            <motion.div key="private" initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}>
              <PrivateView transactions={transactions.filter(t => t.is_private)} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav view={view} setView={setView} onAddClick={() => setActiveSheet('main')} />

      <ActionSheets
        activeSheet={activeSheet}
        setActiveSheet={setActiveSheet}
        setTransactions={setTransactions}
        setSosRequests={setSosRequests}
        view={view}
      />
    </div>
  );
}
