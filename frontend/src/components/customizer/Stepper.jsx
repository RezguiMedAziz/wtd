import { Check } from 'lucide-react';
import { STEPS, canEnterStep } from '../../controllers/customizationController';

export default function Stepper({ state, onGo }) {
  return (
    <nav aria-label="Progress" className="sticker-card px-3 py-3 sm:px-6">
      <ol className="flex items-center justify-between gap-1">
        {STEPS.map((s, i) => {
          const done = state.step > s.id;
          const active = state.step === s.id;
          const enabled = canEnterStep(s.id, state);
          return (
            <li key={s.id} className="flex flex-1 items-center gap-1 last:flex-none">
              <button
                type="button" disabled={!enabled} onClick={() => onGo(s.id)} aria-current={active ? 'step' : undefined}
                className={`flex items-center gap-2 rounded-full border-[3px] border-brand-ink py-1 pl-1 pr-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${active ? 'bg-brand-yellow' : done ? 'bg-brand-sky' : 'bg-white'}`}
              >
                <span className={`grid h-7 w-7 place-items-center rounded-full border-2 border-brand-ink ${active ? 'bg-brand-pink' : 'bg-white'}`}>
                  {done ? <Check size={15} aria-hidden /> : s.id}
                </span>
                <span className={active ? '' : 'hidden sm:inline'}>{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <span className="mx-1 h-[3px] flex-1 rounded-full bg-brand-ink/20" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
