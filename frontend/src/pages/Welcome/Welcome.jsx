import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { LOGO_SRC } from '../../constants/ducks';
import { SPLASH_TIMELINE } from '../../constants/animations';
import { navigationController } from '../../controllers/navigationController';
import Duck from '../../components/ducks/Duck';
import Wordmark from '../../components/ducks/Wordmark';

// Duck placement around the stage (percentages of the viewport).
const STAGE = [
  { name: 'softie', top: '6%', left: '5%', size: 'clamp(76px, 12vw, 150px)', delay: 0 },
  { name: 'boss', top: '8%', right: '5%', size: 'clamp(76px, 12vw, 150px)', delay: 0.12 },
  { name: 'sassy', bottom: '8%', left: '4%', size: 'clamp(76px, 12vw, 150px)', delay: 0.24 },
  { name: 'thinky', bottom: '8%', right: '4%', size: 'clamp(76px, 12vw, 150px)', delay: 0.36 },
  { name: 'sunny', top: '42%', left: '1%', size: 'clamp(76px, 12vw, 150px)', delay: 0.48 },
  { name: 'chaotic', top: '40%', right: '1%', size: 'clamp(76px, 12vw, 150px)', delay: 0.6 },
];

export default function Welcome() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t = SPLASH_TIMELINE;
    const timers = [
      setTimeout(() => setPhase(1), t.text),
      setTimeout(() => setPhase(2), t.ducks),
      setTimeout(() => setPhase(3), t.bubble),
      setTimeout(() => navigate(navigationController.afterSplash(), { replace: true }), t.exit),
    ];
    return () => timers.forEach(clearTimeout);
  }, [navigate]);

  const skip = () => navigate(navigationController.afterSplash(), { replace: true });

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4">
      <div className="relative z-10 flex flex-col items-center gap-4 text-center">
        <motion.img
          src={LOGO_SRC}
          alt="What The Duck logo"
          className="w-[min(78vw,420px)] "
          initial={{ scale: 0.1, rotate: -270, opacity: 0 }}
          animate={
            reduce
              ? { scale: 1, rotate: 0, opacity: 1 }
              : { scale: [0.1, 1.1, 0.95, 1], rotate: [-270, 0, 360, 360], x: [0, -90, 90, 0], y: [0, 40, -40, 0], opacity: 1 }
          }
          transition={{ duration: reduce ? 0.4 : 2.2, ease: 'easeInOut' }}
        />
        {phase >= 1 && <Wordmark />}
      </div>

      {phase >= 2 &&
        STAGE.map(({ name, size, delay, ...pos }) => (
          <Duck
            key={name}
            name={name}
            size={size}
            delay={delay}
            className="!absolute z-0"
            style={pos}
            bubble={name === 'softie' && phase >= 3 ? 'Welcome!' : undefined}
            bubbleSide="right"
          />
        ))}

      <button type="button" onClick={skip} className="btn-pop absolute bottom-5 z-20 bg-brand-yellow py-2 text-base hover:-translate-y-0.5">
        Lets Ducking Go ! <ArrowRight size={18} aria-hidden />
      </button>
    </main>
  );
}
