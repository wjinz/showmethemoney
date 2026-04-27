import { useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Unlock, EyeOff, ShieldCheck } from 'lucide-react';

export default function PrivateView({ transactions }: any) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handlePin = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin === '1234') { 
        setTimeout(() => setIsUnlocked(true), 300);
      } else if (newPin.length === 4) {
        setError(true);
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 500);
      }
    }
  };

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[85vh] p-6">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center space-y-6 mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-gray-800 to-black rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-black/50 border border-gray-800">
            <Lock size={32} className="text-[var(--theme-secondary)]" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">프라이빗 월렛</h2>
            <p className="text-gray-400 mt-2 font-medium">PIN 번호를 입력하세요<br/><span className="text-xs opacity-50">(테스트용: 1234)</span></p>
          </div>
        </motion.div>

        <motion.div animate={error ? { x: [-10, 10, -10, 10, 0] } : {}} transition={{ duration: 0.4 }} className="flex gap-6 mb-16">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={`w-4 h-4 rounded-full transition-all duration-300 ${pin.length > i ? 'bg-[var(--theme-secondary)] scale-110 shadow-[0_0_10px_var(--theme-secondary)]' : 'bg-gray-800'}`} />
          ))}
        </motion.div>

        {/* iOS Style PIN Pad */}
        <div className="grid grid-cols-3 gap-x-8 gap-y-6 w-full max-w-[280px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'].map((key, i) => (
            <button
              key={i}
              onClick={() => key === 'del' ? setPin(pin.slice(0, -1)) : key !== '' ? handlePin(key.toString()) : null}
              className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-light ${key === '' ? 'invisible' : 'bg-gray-900/50 hover:bg-gray-800 active:bg-gray-700 transition-colors'}`}
            >
              {key === 'del' ? '지우기' : key}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const totalPrivate = transactions.reduce((sum: number, t: any) => sum + t.amount, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 space-y-8 pb-10">
      <header className="flex justify-between items-center pt-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--theme-secondary)] flex items-center gap-2">
            나만의 비상금 <EyeOff size={20} />
          </h1>
          <p className="text-[var(--theme-text-muted)] mt-1 font-medium">배우자에게는 절대 보이지 않아요</p>
        </div>
        <button onClick={() => setIsUnlocked(false)} className="p-3 bg-gray-900 rounded-full hover:bg-gray-800 transition-colors border border-gray-800">
          <Unlock size={20} className="text-gray-400" />
        </button>
      </header>

      {/* Premium Black Card Dashboard */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-800 via-gray-900 to-black p-8 rounded-[2rem] border border-gray-700 shadow-2xl shadow-black/50">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-[var(--theme-secondary)] opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-blue-500 opacity-10 rounded-full blur-2xl"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-8">
            <ShieldCheck size={28} className="text-[var(--theme-secondary)] opacity-80" />
            <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">Private</span>
          </div>
          <p className="text-gray-400 font-medium mb-1">이번 달 비밀 지출</p>
          <p className="text-4xl font-extrabold tracking-tight text-white">{totalPrivate.toLocaleString()}<span className="text-2xl ml-1">원</span></p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold mb-4 text-gray-200">비밀 지출 내역</h2>
        {transactions.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center text-gray-600 bg-gray-900/50 rounded-3xl border border-gray-800">
            <EyeOff size={32} className="mb-3 opacity-50" />
            <p className="font-medium">아직 비밀 지출이 없네요!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((t: any) => (
              <div key={t.id} className="flex justify-between items-center p-4 bg-gray-900/80 rounded-2xl border border-gray-800 hover:bg-gray-800 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-xl border border-gray-800">
                    {t.category === '게임' ? '🎮' : t.category === '취미' ? '🎸' : '🛍️'}
                  </div>
                  <div>
                    <p className="font-bold text-gray-200">{t.description}</p>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">{t.category}</p>
                  </div>
                </div>
                <span className="font-bold text-[var(--theme-secondary)] text-lg">-{t.amount.toLocaleString()}원</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
