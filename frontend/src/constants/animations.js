// Central animation configuration (durations in seconds).
export const SPRING_POP = { type: 'spring', stiffness: 380, damping: 14 };
export const SPRING_SOFT = { type: 'spring', stiffness: 220, damping: 24 };

export const PAGE_TRANSITION = {
  initial: { opacity: 0, y: 16, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35 } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
};

// Looping behaviours for ducks. Each returns framer-motion `animate` values.
export const DUCK_BEHAVIORS = {
  float: { y: [0, -10, 0], rotate: [-2, 2, -2], transition: { duration: 3.6, repeat: Infinity, ease: 'easeInOut' } },
  bounce: { y: [0, -18, 0], scaleY: [1, 1.04, 0.95, 1], transition: { duration: 1.2, repeat: Infinity, ease: 'easeOut' } },
  wave: { rotate: [0, 8, -8, 8, 0], transition: { duration: 2.2, repeat: Infinity, repeatDelay: 1.2 } },
  spin: { rotate: [0, 360], transition: { duration: 9, repeat: Infinity, ease: 'linear' } },
  sway: { x: [-6, 6, -6], rotate: [-3, 3, -3], transition: { duration: 4.5, repeat: Infinity, ease: 'easeInOut' } },
  // personality gaits: gentle walking bobs, no jumping (cadence differs per character)
  hop: { y: [0, -4, 0], rotate: [-2, 2, -2], transition: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' } },
  waddle: { rotate: [-3, 3, -3], y: [0, -2, 0], transition: { duration: 1.1, repeat: Infinity, ease: 'easeInOut' } },
  march: { y: [0, -4, 0], rotate: [-1, 1, -1], transition: { duration: 0.6, repeat: Infinity, ease: 'linear' } },
  puff: { scale: [1, 1.02, 1], transition: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } },
  ponder: { y: [0, -2, 0], rotate: [-1.5, 1.5, -1.5], transition: { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } },
  zigzag: { y: [0, -4, 0, -2, 0], rotate: [-3, 3, -2, 2, -3], transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' } },
  swagger: { rotate: [-3, 3, -3], y: [0, -2, 0], transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } },
  none: {},
};

export const SPLASH_TIMELINE = { text: 2400, ducks: 3300, bubble: 5000, exit: 7400 };
