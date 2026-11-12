import { motion, useReducedMotion } from 'framer-motion';
import { COLORS } from '../../constants/colors';

const LINES = [
  { text: 'WHAT', color: COLORS.pink },
  { text: 'THE', color: COLORS.blue },
  { text: 'DUCK', color: COLORS.yellow },
];

// "WHAT THE DUCK" lettering in the logo's colors, letters bounce in one by one.
export default function Wordmark({ className = '', start = 0, size = 'text-5xl sm:text-7xl' }) {
  const reduce = useReducedMotion();
  let i = 0;
  return (
    <h1 className={`flex flex-wrap items-baseline justify-center gap-x-4 font-bold ${size} ${className}`} aria-label="What The Duck">
      {LINES.map(({ text, color }) => (
        <span key={text} className="flex" aria-hidden="true">
          {text.split('').map((ch) => {
            const d = start + 0.07 * i++;
            return (
              <motion.span
                key={d}
                className="wordmark inline-block"
                style={{ color }}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.3, rotate: -20 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 12, delay: d }}
              >
                {ch}
              </motion.span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}
