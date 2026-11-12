import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function StepFooter({ onBack, onNext, nextLabel = 'Next', nextDisabled = false, hint }) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      {onBack ? (
        <button type="button" onClick={onBack} className="btn-pop bg-white py-2.5 text-base"><ArrowLeft size={18} aria-hidden /> Back</button>
      ) : <span />}
      <div className="flex items-center gap-3">
        {hint && nextDisabled && <span className="hidden text-sm font-semibold text-brand-ink/60 sm:inline">{hint}</span>}
        {onNext && (
          <button type="button" onClick={onNext} disabled={nextDisabled} className="btn-pop bg-brand-pink py-2.5 text-base disabled:cursor-not-allowed disabled:opacity-50">
            {nextLabel} <ArrowRight size={18} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
