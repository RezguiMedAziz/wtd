import { AnimatePresence, motion } from 'framer-motion';
import { SPRING_POP } from '../../constants/animations';

const POSITION = {
  top: 'bottom-[96%] left-1/2 -translate-x-1/2',
  right: 'left-[92%] top-0',
  left: 'right-[92%] top-0',
};

export default function SpeechBubble({ show = true, side = 'top', children }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key={String(children)}
          role="status"
          className={`pointer-events-none absolute z-20 w-max max-w-[11rem] rounded-2xl border-[3px] border-brand-ink bg-white px-3 py-1.5 text-center text-sm font-bold leading-tight shadow-pop-sm sm:max-w-[14rem] sm:text-base ${POSITION[side]}`}
          initial={{ opacity: 0, scale: 0.4, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={SPRING_POP}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
