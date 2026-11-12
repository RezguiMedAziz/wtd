import { motion, useReducedMotion } from 'framer-motion';
import { LOGO_SRC } from '../../constants/ducks';

export default function Loader() {
  const reduce = useReducedMotion();
  return (
    <div className="grid min-h-screen place-items-center" role="status" aria-label="Loading">
      <motion.img src={LOGO_SRC} alt="" className="w-40" animate={reduce ? undefined : { opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.4, repeat: Infinity }} />
    </div>
  );
}
