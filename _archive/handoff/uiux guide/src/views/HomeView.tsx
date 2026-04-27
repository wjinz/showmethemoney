import { Transaction, SosRequest } from '../types';
import { motion } from 'motion/react';
import { CheckCircle2, Sparkles, XCircle, ReceiptText } from 'lucide-react';

export default function HomeView({ transactions, sosRequests, setSosRequests, setTransactions }: any) {
  const totalSpent = transactions.reduce((sum: number, t: any) => sum + t.amount, 0);
  const budget = 1000000;
  const percentage = Math.min((totalSpent / budget) * 100, 100);

  const handleApprove = (req: SosRequest) => {
    setSosRequests((prev: any) => prev.filter((r: any) => r.id !== req.id));
    setTransactions((prev: any) => [{
      id: Date.now().toString(),
      amount: req.amount,
      category: 'SOS 승인',
      description: req.reason,
      date: new Date().toISOString(),
      is_private: false
    }, ...prev]);
  };

  const handleReject = (req: SosRequest) => {
    setSosRequests((prev: any) => prev.filter((r: any) => r.id !== req.id));
  };

  return (
    <div className="p-6 space-y-8 pb-10">
      {/* Toss-style Large Header */}
      <header className="pt-6">
        <p className="text-[var(--theme-text-muted)] font-medium mb-1">이번 달 남은 공동 예산</p>
        <h1 className="text-4xl font-extrabold tracking-tight text-[var(--theme-primary)]">
          {(budget - totalSpent).toLocaleString()}<span className="text-2xl font-bold ml-1">원</span>
        </h1>
      </header>

      {/* Modern Budget Ring Card */}
      <div className="bg-[var(--theme-surface)] rounded-3xl p-6 shadow-sm border border-[var(--theme-border)] flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--theme-text-muted)] font-medium mb-1">현재 지출액</p>
          <p className="text-xl font-bold">{totalSpent.toLocaleString()}원</p>
          <p className="text-xs text-[var(--theme-secondary)] font-medium mt-2 bg-green-50 px-2 py-1 rounded-md inline-block">
            안전한 페이스 유지 중
          </p>
        </div>
        <div className="relative w-24 h-24">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--theme-bg)" strokeWidth="12" />
            <motion.circle
              cx="50" cy="50" r="40" fill="transparent"
              stroke="var(--theme-secondary)" strokeWidth="12"
              strokeDasharray={`${percentage * 2.51} 251`}
              initial={{ strokeDasharray: "0 251" }}
              animate={{ strokeDasharray: `${percentage * 2.51} 251` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold">{Math.round(percentage)}%</span>
          </div>
        </div>
      </div>

      {/* AI Coach Chat Bubble Style */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-3xl rounded-tl-none border border-blue-100 dark:border-blue-800/50 flex items-start gap-4 shadow-sm"
      >
        <div className="bg-white dark:bg-blue-800 p-2.5 rounded-full text-blue-600 dark:text-blue-300 shadow-sm">
          <Sparkles size={20} />
        </div>
        <div className="pt-1">
          <h3 className="font-bold text-blue-900 dark:text-blue-100 text-sm mb-1">AI 소비 코치</h3>
          <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
            외식비 지출이 지난달보다 15% 늘었어요.<br/>이번 주말은 오붓하게 집밥 어때요? 🍳
          </p>
        </div>
      </motion.div>

      {/* SOS Requests - Ticket Style */}
      {sosRequests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-[var(--theme-primary)]">
            🚨 결재 대기 중인 요청
          </h2>
          {sosRequests.map((req: any) => (
            <motion.div key={req.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} 
              className="bg-white dark:bg-red-900/10 border-2 border-red-100 dark:border-red-900/30 p-5 rounded-3xl shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-red-400"></div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-[var(--theme-text-muted)] mb-1">배우자의 애교 섞인 요청 🥺</p>
                  <p className="font-bold text-lg text-[var(--theme-text)]">{req.reason}</p>
                </div>
                <p className="text-xl font-extrabold text-red-500">{req.amount.toLocaleString()}원</p>
              </div>
              <div className="flex gap-3 mt-5">
                <button onClick={() => handleApprove(req)} className="flex-1 bg-red-500 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-600 transition-colors active:scale-95">
                  <CheckCircle2 size={20} /> 쿨하게 승인
                </button>
                <button onClick={() => handleReject(req)} className="px-5 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl font-bold hover:bg-red-100 transition-colors active:scale-95 flex items-center justify-center">
                  <XCircle size={20} className="mr-1" /> 반려
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Clean Transaction List */}
      <div>
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-lg font-bold text-[var(--theme-primary)]">최근 지출</h2>
          <button className="text-sm text-[var(--theme-text-muted)] font-medium hover:underline">전체보기</button>
        </div>
        <div className="bg-[var(--theme-surface)] rounded-3xl p-2 shadow-sm border border-[var(--theme-border)]">
          {transactions.map((t: any, index: number) => (
            <div key={t.id} className={`flex justify-between items-center p-4 ${index !== transactions.length - 1 ? 'border-b border-[var(--theme-border)]' : ''}`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[var(--theme-bg)] flex items-center justify-center text-2xl shadow-inner">
                  {t.category === '식비' ? '🍔' : t.category === '카페' ? '☕' : t.category === 'SOS 승인' ? '🚨' : '💳'}
                </div>
                <div>
                  <p className="font-bold text-[var(--theme-text)] text-base">{t.description}</p>
                  <p className="text-xs text-[var(--theme-text-muted)] font-medium mt-0.5">{t.category} · 오늘</p>
                </div>
              </div>
              <span className="font-bold text-lg text-[var(--theme-text)]">-{t.amount.toLocaleString()}원</span>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="p-8 text-center flex flex-col items-center justify-center text-[var(--theme-text-muted)]">
              <ReceiptText size={32} className="mb-3 opacity-50" />
              <p className="font-medium">아직 지출 내역이 없어요</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
