import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Plus, LogIn, Trophy } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useGameStore } from '../../store/gameStore';

export const MultiplayerModal: React.FC = () => {
  const isOpen = useUiStore((s) => s.isCreateRoomModalOpen);
  const setIsOpen = useUiStore((s) => s.setIsCreateRoomModalOpen);
  
  const createRoom = useGameStore((s) => s.createRoom);
  const joinRoom = useGameStore((s) => s.joinRoom);
  
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [winCondition, setWinCondition] = useState('500000');
  const [joinCode, setJoinCode] = useState('');

  if (!isOpen) return null;

  const handleCreate = () => {
    createRoom(parseInt(winCondition) || 500000);
    setIsOpen(false);
  };

  const handleJoin = () => {
    if (!joinCode) return;
    joinRoom(joinCode.toUpperCase());
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 bg-black/80 backdrop-blur-xl">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-sm bg-[#1a1a1a] border border-white/10 rounded-[2.5rem] p-6 shadow-2xl relative"
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
                <button
                  onClick={handleCreate}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-tighter shadow-lg shadow-blue-600/20 active:scale-95"
                >
                  Создать комнату
                </button>
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
                <button
                  onClick={handleJoin}
                  disabled={joinCode.length < 4}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:hover:bg-emerald-600 text-white font-black py-4 rounded-2xl transition-all uppercase tracking-tighter shadow-lg shadow-emerald-600/20 active:scale-95"
                >
                  Присоединиться
                </button>
              </div>
            )}
            
            <p className="mt-6 text-[10px] text-white/20 text-center leading-relaxed">
              {activeTab === 'create' 
                ? 'Создайте комнату и отправьте код друзьям, чтобы играть вместе.'
                : 'Введите 6-значный код, который вам отправил хост комнаты.'}
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
