import { motion, useReducedMotion } from 'framer-motion';
import { PAGE_TRANSITION } from '../../constants/animations';

export default function PageTransition({ children, className = '' }) {
  const reduce = useReducedMotion();
  const variants = reduce ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } } : PAGE_TRANSITION;
  return (
    <motion.div className={className} {...variants}>
      {children}
    </motion.div>
  );
}
