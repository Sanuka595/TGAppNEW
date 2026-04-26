import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Plus, LogIn, Trophy } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useGameStore } from '../../store/gameStore';
import { Button } from '../ui/Button.js';

export const MultiplayerModal: React.FC = () => {
  const isOpen = useUiStore((s) => s.isCreateRoomModalOpen);
  const setIsOpen = useUiStore((s) => s.setIsCreateRoomModalOpen);
  
  // Debug log to trace modal state
  console.log('[MultiplayerModal] isOpen:', isOpen);

  const createRoom = useGameStore((s) => s.createRoom);
  const joinRoom = useGameStore((s) => s.joinRoom);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const roomId = useGameStore((s) => s.roomId);
  
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [winCondition, setWinCondition] = useState('500000');
  const [joinCode, setJoinCode] = useState('');

  const handleCreate = () => {
    createRoom(parseInt(winCondition) || 500000);
  };

  const handleJoin = () => {
    if (!joinCode) return;
    joinRoom(joinCode.toUpperCase());
  };

  const handleCopyLink = () => {
    if (!roomId) return;
    // Bot Username: @perekup_Buh_bot
    const botLink = `https://t.me/perekup_Buh_bot/play?startapp=${roomId}`;
    navigator.clipboard.writeText(botLink);
    // В идеале тут нужен тост, но пока добавим лог
    useGameStore.getState().addLog('Ссылка скопирована!', 'success');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 bg-black/80 backdrop-blur-xl">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-sm glass-panel rounded-[2.5rem] p-6 shadow-2xl relative"
          >
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-6 right-6 p-2 bg-white/5 rounded-full text-white/40 hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="mb-6">
              <div className="flex items-center space-x-2 text-blue-400 mb-1">
                <Users size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Мультиплеер</span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Сетевая игра</h2>
            </div>

            {roomId ? (
              <div className="space-y-6 text-center py-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-3xl">
                  <span className="text-[10px] font-black text-emerald-400/50 uppercase tracking-[0.2em] mb-2 block">Ваш код комнаты</span>
                  <div className="text-5xl font-black text-white tracking-[0.2em] font-mono select-all">
                    {roomId}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <Button
                    onClick={() => setIsOpen(false)}
                    variant="primary"
                    className="w-full"
                  >
                    <span>К игре</span>
                  </Button>
                  <Button
                    onClick={handleCopyLink}
                    variant="secondary"
                    className="w-full"
                  >
                    <span>Пригласить друга</span>
                  </Button>
                  <Button
                    onClick={() => { leaveRoom(); }}
                    className="w-full bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  >
                    Выйти из комнаты
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex bg-white/5 p-1 rounded-2xl mb-6">
                  <button
                    onClick={() => setActiveTab('create')}
                    className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-bold transition-all ${
                      activeTab === 'create' ? 'bg-white text-black' : 'text-white/40'
                    }`}
                  >
                    <Plus size={16} />
                    <span>Создать</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('join')}
                    className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-bold transition-all ${
                      activeTab === 'join' ? 'bg-white text-black' : 'text-white/40'
                    }`}
                  >
                    <LogIn size={16} />
                    <span>Войти</span>
                  </button>
                </div>

                {activeTab === 'create' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 block">Цель для победы ($)</label>
                      <div className="relative">
                        <Trophy className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                        <input
                          type="number"
                          value={winCondition}
                          onChange={(e) => setWinCondition(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-mono focus:border-blue-500/50 outline-none transition-all"
                          placeholder="Напр. 500000"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleCreate}
                      variant="primary"
                      className="w-full"
                    >
                      Создать комнату
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 block">Код комнаты</label>
                      <input
                        type="text"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        maxLength={6}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-white font-mono text-center text-xl tracking-[0.5em] focus:border-blue-500/50 outline-none transition-all uppercase"
                        placeholder="XXXXXX"
                      />
                    </div>
                    <Button
                      onClick={handleJoin}
                      disabled={joinCode.length < 4}
                      variant="primary"
                      className="w-full disabled:opacity-30"
                    >
                      Присоединиться
                    </Button>
                  </div>
                )}
              </>
            )}
            
            {!roomId && (
              <p className="mt-6 text-[10px] text-white/20 text-center leading-relaxed">
                {activeTab === 'create' 
                  ? 'Создайте комнату и отправьте код друзьям, чтобы играть вместе.'
                  : 'Введите 6-значный код, который вам отправил хост комнаты.'}
              </p>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
