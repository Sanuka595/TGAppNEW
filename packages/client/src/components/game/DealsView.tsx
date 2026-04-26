import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Lock, Unlock, Plus, X, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { Button } from '../ui/Button.js';
import type { Debt } from '@tgperekup/shared';
import { Decimal } from 'decimal.js';

type Tab = 'board' | 'my_debts';

export const DealsView: React.FC = () => {
  const { player, activeDebts, players, roomId, offerLoan, acceptLoan, repayDebt } = useGameStore();
  const [tab, setTab] = useState<Tab>('board');
  const [showOffer, setShowOffer] = useState(false);

  // Offer form state
  const [amount, setAmount] = useState('500');
  const [interestPct, setInterestPct] = useState(20);
  const [turns, setTurns] = useState(5);

  // Accept form state
  const [acceptingDebt, setAcceptingDebt] = useState<Debt | null>(null);
  const [selectedCarId, setSelectedCarId] = useState('');

  const garage = player.garage ?? [];
  const pendingOffers = activeDebts.filter(d => d.status === 'pending' && d.lenderId !== player.id);
  const myOffers = activeDebts.filter(d => d.lenderId === player.id && d.status === 'pending');
  const myActiveDebts = activeDebts.filter(d => d.borrowerId === player.id && d.status === 'active');
  const incomingActiveDebts = activeDebts.filter(d => d.lenderId === player.id && d.status === 'active');

  const handleOffer = () => {
    if (new Decimal(amount).lte(0)) return;
    offerLoan(amount, interestPct, turns);
    setShowOffer(false);
  };

  const handleAccept = () => {
    if (!acceptingDebt || !selectedCarId) return;
    acceptLoan(acceptingDebt.id, selectedCarId);
    setAcceptingDebt(null);
    setSelectedCarId('');
  };

  const playerName = (id: string) => {
    const p = players.find(x => x.id === id);
    return p?.name ?? id.substring(0, 4).toUpperCase();
  };

  if (!roomId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="text-6xl mb-6">💼</div>
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-3">Perekup Hub</h2>
        <p className="text-sm text-white/50 max-w-[240px] leading-relaxed">
          P2P-сделки доступны только в мультиплеере. Создай или вступи в комнату!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white">💼 Perekup Hub</h2>
          <button
            onClick={() => setShowOffer(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-black uppercase tracking-widest active:scale-95 transition-transform"
          >
            <Plus size={14} /> Дать в долг
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(['board', 'my_debts'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                tab === t ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-white/5 text-white/40'
              }`}
            >
              {t === 'board' ? `Офферы (${pendingOffers.length})` : `Мои долги (${myActiveDebts.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4 space-y-4 scrollbar-hide">
        <AnimatePresence mode="wait">
          {tab === 'board' && (
            <motion.div key="board" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-3 pt-3">
              {pendingOffers.length === 0 && myOffers.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-5xl mb-4">🏦</p>
                  <p className="text-white/30 text-sm font-bold uppercase tracking-widest">Пока никто не занимает</p>
                  <p className="text-white/20 text-xs mt-2">Стань первым ростовщиком!</p>
                </div>
              ) : null}

              {/* My own pending offers */}
              {myOffers.map(d => (
                <div key={d.id} className="glass-panel rounded-2xl p-4 border-l-4 border-l-amber-400/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] text-amber-300 uppercase font-black tracking-widest">Твой оффер · Ждёт заёмщика</span>
                      <p className="text-lg font-black text-white mt-1">${d.amount} <span className="text-sm text-white/40">→ вернуть ${d.totalToPay}</span></p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-black">{d.turnsLeft} ходов</span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Others' offers */}
              {pendingOffers.map(d => (
                <motion.div key={d.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel rounded-2xl p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-[10px] text-white/30 uppercase font-black tracking-widest">
                        Кредитор: {playerName(d.lenderId)}
                      </span>
                      <p className="text-xl font-black text-white mt-0.5">${d.amount}</p>
                      <p className="text-xs text-white/50 mt-0.5">
                        Вернуть: <span className="text-rose-400 font-bold">${d.totalToPay}</span>
                        &nbsp;за <span className="text-cyan-300 font-bold">{d.turnsLeft} ходов</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-lg font-black text-amber-300">+{new Decimal(d.interest).div(d.amount).mul(100).toFixed(0)}%</span>
                      <span className="text-[10px] text-white/30">процент</span>
                    </div>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-3 flex items-start gap-2">
                    <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-300/80 leading-relaxed">
                      Нужен залог — машина из гаража стоимостью ≥ 80% от суммы займа. Просрочишь — машину заберут!
                    </p>
                  </div>
                  {garage.length > 0 ? (
                    <Button variant="primary" className="w-full" onClick={() => { setAcceptingDebt(d); setSelectedCarId(garage[0]?.id ?? ''); }}>
                      Занять до получки
                    </Button>
                  ) : (
                    <p className="text-center text-xs text-white/30 italic">Нет машин для залога</p>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}

          {tab === 'my_debts' && (
            <motion.div key="my_debts" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-3 pt-3">
              {/* Borrowed (I owe) */}
              {myActiveDebts.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] text-white/30 uppercase font-black tracking-widest px-1">Я должен</p>
                  {myActiveDebts.map(d => {
                    const car = garage.find(c => c.id === d.collateralCarId);
                    return (
                      <div key={d.id} className="glass-panel rounded-2xl p-4 border-l-4 border-l-rose-400/50">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-[10px] text-white/30 uppercase font-black tracking-widest">Кредитор: {playerName(d.lenderId)}</span>
                            <p className="text-lg font-black text-rose-400 mt-0.5">${d.totalToPay}</p>
                          </div>
                          <div className="flex items-center gap-1.5 bg-red-500/10 px-2 py-1 rounded-xl border border-red-500/20">
                            <Clock size={12} className="text-red-400" />
                            <span className="text-xs font-black text-red-400">{d.turnsLeft} ход.</span>
                          </div>
                        </div>
                        {car && (
                          <div className="flex items-center gap-2 mb-3 bg-white/5 rounded-xl px-3 py-2">
                            <Lock size={12} className="text-amber-400" />
                            <span className="text-xs text-white/60">Залог: <span className="text-white font-bold">{car.name}</span></span>
                          </div>
                        )}
                        <Button variant="primary" className="w-full" onClick={() => repayDebt(d.id)}>
                          Расплатиться (${d.totalToPay})
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Lent (others owe me) */}
              {incomingActiveDebts.length > 0 && (
                <div className="space-y-3">
                  <p className="text-[10px] text-white/30 uppercase font-black tracking-widest px-1 mt-2">Мне должны</p>
                  {incomingActiveDebts.map(d => (
                    <div key={d.id} className="glass-panel rounded-2xl p-4 border-l-4 border-l-emerald-400/50">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] text-white/30 uppercase font-black tracking-widest">Заёмщик: {playerName(d.borrowerId ?? '')}</span>
                          <p className="text-lg font-black text-emerald-400 mt-0.5">+${d.totalToPay}</p>
                        </div>
                        <div className="flex items-center gap-1.5 bg-cyan-500/10 px-2 py-1 rounded-xl border border-cyan-500/20">
                          <Clock size={12} className="text-cyan-400" />
                          <span className="text-xs font-black text-cyan-400">{d.turnsLeft} ход.</span>
                        </div>
                      </div>
                      {d.collateralCarId && (
                        <div className="flex items-center gap-2 mt-2 bg-white/5 rounded-xl px-3 py-2">
                          <Unlock size={12} className="text-emerald-400" />
                          <span className="text-xs text-white/60">Залог взят. Не заплатит — машина твоя.</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {myActiveDebts.length === 0 && incomingActiveDebts.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-5xl mb-4">✨</p>
                  <p className="text-white/30 text-sm font-bold uppercase tracking-widest">Долгов нет</p>
                  <p className="text-white/20 text-xs mt-2">Живёшь как кристалл</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Offer Modal */}
      <AnimatePresence>
        {showOffer && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-10 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md glass-panel rounded-[3rem] p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Расписка на салфетке</h3>
                <button onClick={() => setShowOffer(false)} className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-[10px] text-white/30 uppercase font-black tracking-widest block mb-2">Сумма займа ($)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-bold text-lg focus:outline-none focus:border-cyan-400/50"
                    min={100}
                    max={Number(player.balance)}
                  />
                </div>

                <div>
                  <label className="text-[10px] text-white/30 uppercase font-black tracking-widest block mb-2">Процент ({interestPct}%)</label>
                  <input
                    type="range" min={5} max={50} step={5} value={interestPct}
                    onChange={e => setInterestPct(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] text-white/30 mt-1">
                    <span>5%</span><span>50%</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-white/30 uppercase font-black tracking-widest block mb-2">Срок ({turns} ходов)</label>
                  <input
                    type="range" min={1} max={20} step={1} value={turns}
                    onChange={e => setTurns(Number(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] text-white/30 mt-1">
                    <span>1 ход</span><span>20 ходов</span>
                  </div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Вернуть:</span>
                    <span className="text-emerald-400 font-black">${new Decimal(amount || 0).mul(1 + interestPct / 100).toFixed(0)}</span>
                  </div>
                </div>

                <Button variant="primary" className="w-full" onClick={handleOffer}>
                  <FileText size={16} /> Поставить на счётчик
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Accept Loan Modal */}
      <AnimatePresence>
        {acceptingDebt && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-10 bg-black/60 backdrop-blur-md">
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-md glass-panel rounded-[3rem] p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Занять до получки</h3>
                <button onClick={() => setAcceptingDebt(null)} className="p-2 bg-white/5 rounded-full text-white/40 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-5">
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-white">${acceptingDebt.amount}</p>
                  <p className="text-xs text-white/50 mt-1">Вернуть ${acceptingDebt.totalToPay} за {acceptingDebt.turnsLeft} ходов</p>
                </div>

                <div>
                  <label className="text-[10px] text-white/30 uppercase font-black tracking-widest block mb-2">Выбери залог</label>
                  <div className="space-y-2">
                    {garage.filter(c => !c.isLocked).map(car => (
                      <button
                        key={car.id}
                        onClick={() => setSelectedCarId(car.id)}
                        className={`w-full flex justify-between items-center p-3 rounded-2xl border transition-all ${
                          selectedCarId === car.id
                            ? 'bg-cyan-500/20 border-cyan-400/40 text-white'
                            : 'bg-white/5 border-white/10 text-white/60'
                        }`}
                      >
                        <span className="font-bold text-sm">{car.name}</span>
                        <span className="text-xs opacity-60">{car.tier}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 flex items-start gap-2">
                  <Lock size={14} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-300/80 leading-relaxed">
                    Выбранная машина будет заблокирована. Не выплатишь вовремя — кредитор заберёт её автоматически!
                  </p>
                </div>

                <Button
                  variant="primary"
                  className="w-full"
                  disabled={!selectedCarId}
                  onClick={handleAccept}
                >
                  <DollarSign size={16} /> Подписать расписку
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
