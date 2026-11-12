import { forwardRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';

const TextField = forwardRef(function TextField({ id, label, icon: Icon, error, valid, accent = 'blue', className = '', ...props }, ref) {
  const ring = { pink: 'focus-within:bg-brand-blush', blue: 'focus-within:bg-brand-sky', yellow: 'focus-within:bg-brand-butter' }[accent];
  const errId = `${id}-error`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      <div className={`flex items-center gap-2 rounded-full border-[3px] bg-white px-4 transition-colors ${ring} ${error ? 'border-red-500' : 'border-brand-ink'}`}>
        {Icon && <Icon size={18} aria-hidden className="shrink-0 opacity-60" />}
        <input
          ref={ref}
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? errId : undefined}
          className="w-full bg-transparent py-3 text-base outline-none placeholder:text-brand-ink/35"
          {...props}
        />
        {valid && !error && <Check size={18} aria-label="Looks good" className="shrink-0 text-green-600" />}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p
            id={errId}
            role="alert"
            className="mt-1 text-sm font-medium text-red-600"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
});

export default TextField;
