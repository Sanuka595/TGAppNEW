import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button.js';
import { triggerHaptic } from '../../lib/tmaProvider';

const TUTORIAL_KEY = 'perekup-tutorial-done';

const SLIDES = [
  {
    emoji: '🚗',
    title: 'Покупай авто',
    body: 'Попадай на клетки покупки — там появляются лоты. Торгуйся, смотри на дефекты и не переплачивай за хлам.',
  },
  {
    emoji: '🔧',
    title: 'Ремонтируй и продавай',
    body: 'Каждый дефект снижает цену продажи. Чини самые дорогие поломки — это твоя прибыль. Диагностика открывается после $50 000 выручки.',
  },
  {
    emoji: '🏆',
    title: 'Побеждай всех',
    body: 'Первый, кто накопит целевой капитал — победитель. Используй гонки, займы и новости рынка, чтобы обогнать соперников.',
  },
] as const;

export const TutorialOverlay: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [slide, setSlide] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (!localStorage.getItem(TUTORIAL_KEY)) {
      setVisible(true);
    }
  }, []);

  const finish = () => {
    localStorage.setItem(TUTORIAL_KEY, '1');
    setVisible(false);
    triggerHaptic('notification', 'success');
  };

  const next = () => {
    if (slide === SLIDES.length - 1) { finish(); return; }
    setDirection(1);
    setSlide((s) => s + 1);
    triggerHaptic('impact', 'light');
  };

  const prev = () => {
    if (slide === 0) return;
    setDirection(-1);
    setSlide((s) => s - 1);
    triggerHaptic('impact', 'light');
  };

  if (!visible) return null;

  const current = SLIDES[slide]!;
  const isLast = slide === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl px-6">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm"
      >
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === slide ? 'w-8 bg-white' : 'w-2 bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Slide */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={slide}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 40 }}
            transition={{ duration: 0.22 }}
            className="text-center mb-10"
          >
            <div className="text-7xl mb-6">{current.emoji}</div>
            <h2 className="text-2xl font-black text-white tracking-tight mb-3">
              {current.title}
            </h2>
            <p className="text-sm text-white/60 leading-relaxed">{current.body}</p>
          </motion.div>
        </AnimatePresence>

        {/* Controls */}
        <div className="flex gap-3">
          {slide > 0 && (
            <Button variant="secondary" className="flex-1" onClick={prev}>
              Назад
            </Button>
          )}
          <Button variant="primary" className="flex-[2]" onClick={next}>
            {isLast ? 'Начать игру' : (
              <span className="flex items-center justify-center gap-1">
                Далее <ChevronRight size={16} />
              </span>
            )}
          </Button>
        </div>

        <button
          onClick={finish}
          className="w-full mt-4 text-xs text-white/20 text-center py-2"
        >
          Пропустить
        </button>
      </motion.div>
    </div>
  );
};
