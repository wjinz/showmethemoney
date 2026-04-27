import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScanLine, AlertCircle, X, Sparkles, Check, ChevronDown } from 'lucide-react';

export default function ActionSheets({ activeSheet, setActiveSheet, setTransactions, setSosRequests, view }: any) {
  const close = () => setActiveSheet('none');

  return (
    <AnimatePresence>
      {activeSheet !== 'none' && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 bg-black/40 z-50 max-w-md mx-auto backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[var(--theme-surface)] rounded-t-[2rem] z-50 p-6 pt-2 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border-t border-[var(--theme-border)] text-[var(--theme-text)] transition-colors duration-500 pb-10"
          >
            {/* Drag Handle */}
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-6 mt-3"></div>
            
            <button onClick={close} className="absolute top-6 right-6 p-2 bg-[var(--theme-bg)] rounded-full text-[var(--theme-text-muted)] hover:bg-[var(--theme-border)] transition-colors">
              <X size={20} />
            </button>

            {activeSheet === 'main' && (
              <div className="space-y-4 mt-2">
                <h2 className="text-2xl font-extrabold mb-6 tracking-tight">무엇을 기록할까요?</h2>
                <button onClick={() => setActiveSheet('scan')} className="w-full flex items-center gap-4 p-5 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors active:scale-[0.98]">
                  <div className="bg-blue-500 text-white p-3.5 rounded-2xl shadow-sm">
                    <ScanLine size={24} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-blue-900 dark:text-blue-100 text-lg">AI 영수증 스캔</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mt-0.5">사진 한 장으로 자동 입력</p>
                  </div>
                </button>

                {view === 'home' && (
                  <button onClick={() => setActiveSheet('sos')} className="w-full flex items-center gap-4 p-5 bg-red-50 dark:bg-red-900/20 rounded-3xl border border-red-100 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors active:scale-[0.98]">
                    <div className="bg-red-500 text-white p-3.5 rounded-2xl shadow-sm">
                      <AlertCircle size={24} />
                    </div>
                    <div className="text-left">
                      <h3 className="font-bold text-red-900 dark:text-red-100 text-lg">SOS 긴급 결재</h3>
                      <p className="text-sm text-red-700 dark:text-red-300 font-medium mt-0.5">배우자에게 애교있게 조르기 🥺</p>
                    </div>
                  </button>
                )}
              </div>
            )}

            {activeSheet === 'scan' && <AiScanSheet close={close} setTransactions={setTransactions} view={view} />}
            {activeSheet === 'sos' && <SosRequestSheet close={close} setSosRequests={setSosRequests} />}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function AiScanSheet({ close, setTransactions, view }: any) {
  const [step, setStep] = useState<'upload' | 'scanning' | 'result'>('upload');
  const [result, setResult] = useState<any>(null);

  const handleScan = () => {
    setStep('scanning');
    setTimeout(() => {
      setResult({ amount: 55000, category: view === 'private' ? '게임' : '마트', description: view === 'private' ? '스팀 결제' : '홈플러스 장보기' });
      setStep('result');
    }, 2500);
  };

  const handleSave = () => {
    setTransactions((prev: any) => [{
      id: Date.now().toString(),
      amount: result.amount,
      category: result.category,
      description: result.description,
      date: new Date().toISOString(),
      is_private: view === 'private'
    }, ...prev]);
    close();
  };

  if (step === 'upload') {
    return (
      <div className="mt-2 text-center">
        <h2 className="text-2xl font-extrabold mb-2 tracking-tight">영수증 스캔</h2>
        <p className="text-[var(--theme-text-muted)] mb-8 font-medium">영수증이나 카드 결제 내역을 캡처해 올리세요</p>
        <div onClick={handleScan} className="border-2 border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 rounded-[2rem] p-12 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex flex-col items-center gap-4 active:scale-[0.98]">
          <div className="bg-white dark:bg-blue-900 p-4 rounded-full shadow-sm">
            <ScanLine size={40} className="text-blue-500" />
          </div>
          <span className="font-bold text-blue-600 dark:text-blue-400">터치하여 사진 선택</span>
        </div>
      </div>
    );
  }

  if (step === 'scanning') {
    return (
      <div className="mt-8 py-12 flex flex-col items-center justify-center space-y-8">
        <div className="relative">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="w-20 h-20 border-4 border-blue-100 dark:border-blue-900 border-t-blue-500 rounded-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles size={24} className="text-blue-500" />
          </div>
        </div>
        <div className="text-center">
          <h3 className="font-extrabold text-xl text-blue-600 dark:text-blue-400 mb-2">
            Gemini가 분석 중이에요
          </h3>
          <p className="text-sm text-[var(--theme-text-muted)] font-medium">항목과 금액을 똑똑하게 분류하고 있습니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <div className="flex items-center justify-center gap-2 mb-8 text-blue-600 dark:text-blue-400">
        <Check size={28} strokeWidth={3} />
        <h2 className="text-2xl font-extrabold tracking-tight">분석 완료!</h2>
      </div>
      <div className="space-y-5 bg-[var(--theme-bg)] p-6 rounded-3xl border border-[var(--theme-border)] shadow-inner">
        <div>
          <label className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1 block">지출 내용</label>
          <input type="text" value={result.description} onChange={(e) => setResult({...result, description: e.target.value})} className="w-full bg-transparent font-extrabold text-xl outline-none border-b-2 border-[var(--theme-border)] focus:border-blue-500 pb-2 text-[var(--theme-text)] transition-colors" />
        </div>
        <div className="flex gap-6">
          <div className="flex-1">
            <label className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1 block">금액</label>
            <input type="number" value={result.amount} onChange={(e) => setResult({...result, amount: Number(e.target.value)})} className="w-full bg-transparent font-extrabold text-xl outline-none border-b-2 border-[var(--theme-border)] focus:border-blue-500 pb-2 text-[var(--theme-text)] transition-colors" />
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1 block">카테고리</label>
            <input type="text" value={result.category} onChange={(e) => setResult({...result, category: e.target.value})} className="w-full bg-transparent font-extrabold text-xl outline-none border-b-2 border-[var(--theme-border)] focus:border-blue-500 pb-2 text-[var(--theme-text)] transition-colors" />
          </div>
        </div>
      </div>
      <button onClick={handleSave} className="w-full mt-8 bg-[var(--theme-primary)] text-white py-4 rounded-2xl font-bold text-lg hover:opacity-90 transition-opacity active:scale-[0.98] shadow-lg">
        저장하기
      </button>
    </div>
  );
}

function SosRequestSheet({ close, setSosRequests }: any) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (!amount || !reason) return;
    setSosRequests((prev: any) => [{
      id: Date.now().toString(),
      amount: Number(amount),
      reason,
      status: 'pending',
      requester: 'me',
      date: new Date().toISOString()
    }, ...prev]);
    close();
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2">
      <h2 className="text-2xl font-extrabold mb-2 tracking-tight">SOS 긴급 결재 요청 🚨</h2>
      <p className="text-[var(--theme-text-muted)] mb-8 font-medium">배우자에게 애교있게 결재를 요청해보세요!</p>

      <div className="space-y-6">
        <div className="bg-[var(--theme-bg)] p-5 rounded-3xl border border-[var(--theme-border)] focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100 dark:focus-within:ring-red-900/30 transition-all">
          <label className="block text-sm font-bold text-[var(--theme-text-muted)] mb-2">얼마가 필요한가요?</label>
          <div className="relative flex items-center">
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50,000" className="w-full bg-transparent outline-none font-extrabold text-3xl text-[var(--theme-text)] placeholder-gray-300 dark:placeholder-gray-700" />
            <span className="text-xl font-bold text-[var(--theme-text-muted)]">원</span>
          </div>
        </div>
        
        <div className="bg-[var(--theme-bg)] p-5 rounded-3xl border border-[var(--theme-border)] focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100 dark:focus-within:ring-red-900/30 transition-all">
          <label className="block text-sm font-bold text-[var(--theme-text-muted)] mb-2">어디에 쓸 건가요? 🥺</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="이번 달 용돈이 다 떨어졌어... 치킨 한 번만 ㅠㅠ" className="w-full bg-transparent outline-none font-medium text-lg text-[var(--theme-text)] placeholder-gray-300 dark:placeholder-gray-700 h-20 resize-none" />
        </div>
      </div>

      <button type="submit" className="w-full mt-8 bg-red-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-red-600 transition-colors active:scale-[0.98] shadow-lg shadow-red-500/30">
        조르기 완료!
      </button>
    </form>
  );
}
