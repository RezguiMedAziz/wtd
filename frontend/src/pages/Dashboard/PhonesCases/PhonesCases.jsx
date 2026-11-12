import { useState } from 'react';
import { motion } from 'framer-motion';
import { FolderHeart, Sparkles } from 'lucide-react';
import { useUser } from '../../../context/UserContext';
import { useCaseConfig } from '../../../services/caseService';
import { useCustomization } from '../../../context/CustomizationContext';
import { STEPS, canContinue } from '../../../controllers/customizationController';
import { DUCK_NAMES } from '../../../constants/ducks';
import { WORLD } from '../../../constants/characters';
import Duck from '../../../components/ducks/Duck';
import Stepper from '../../../components/customizer/Stepper';
import StepFooter from '../../../components/customizer/StepFooter';
import PhoneStep from '../../../components/customizer/PhoneStep';
import CaseStep from '../../../components/customizer/CaseStep';
import StickerStep from '../../../components/customizer/StickerStep';
import ReviewStep from '../../../components/customizer/ReviewStep';
import SavedDesigns from '../../../components/customizer/SavedDesigns';
import SheetShowcase from '../../../components/stickersheets/SheetShowcase';

const VIEWS = { 1: PhoneStep, 2: CaseStep, 3: StickerStep, 4: ReviewStep };

export default function PhonesCases() {
  const { user } = useUser();
  useCaseConfig();
  const { state, dispatch } = useCustomization();
  const [showSaved, setShowSaved] = useState(false);
  const View = VIEWS[state.step];
  const meta = STEPS[state.step - 1];
  const go = (step) => dispatch({ type: 'go', step });
  const inCheckout = state.step === 4 && state.checkout !== 'review';

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-brand-ink/70"><Sparkles size={16} aria-hidden /> Hi {user?.firstName}!</p>
          <h1 className="text-4xl font-bold sm:text-5xl">
            <span className="text-brand-pink [-webkit-text-stroke:2px_#141414]">Phones</span>{' '}
            <span className="text-brand-blue [-webkit-text-stroke:2px_#141414]">Cases</span>
          </h1>
        </div>
        <button type="button" onClick={() => setShowSaved(true)} className="btn-pop bg-brand-yellow py-2 text-base"><FolderHeart size={18} aria-hidden /> My designs</button>
      </header>

      {state.step <= 2 && state.checkout === 'review' && <SheetShowcase />}

      <Stepper state={state} onGo={go} />

      <section className="mt-6" aria-labelledby="step-title">
        {state.checkout !== 'done' && <h2 id="step-title" className="mb-4 text-center text-2xl font-bold sm:text-3xl">{meta.title}</h2>}
        {/* enter-only transition: the old step is removed immediately, so nothing can get stuck invisible */}
        <motion.div key={`${state.step}-${state.checkout}`} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.22 }}>
          <View />
        </motion.div>
        {!inCheckout && state.checkout !== 'done' && (
          <StepFooter
            onBack={state.step > 1 ? () => go(state.step - 1) : undefined}
            onNext={state.step < 4 && state.step > 1 ? () => go(state.step + 1) : state.step === 1 && state.phone ? () => go(2) : undefined}
            nextDisabled={!canContinue(state.step, state)}
            nextLabel={state.step === 3 ? 'Review my design' : 'Next'}
            hint={state.step === 2 ? 'Choose a case type to continue' : undefined}
          />
        )}
      </section>

      {state.step === 1 && (
        <section className="chalk-card mt-12 p-5 sm:p-8" aria-labelledby="meet">
          <h2 id="meet" className="text-center text-2xl font-bold">Meet the ducks</h2>
          <p className="mx-auto mt-1 max-w-xl text-center text-sm text-brand-ink/70">{WORLD.text} <b>{WORLD.slogan}</b> Tap a duck to read its story.</p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {DUCK_NAMES.map((id) => <Duck key={id} name={id} size="100%" showName />)}
          </div>
        </section>
      )}
      {showSaved && <SavedDesigns onClose={() => setShowSaved(false)} />}
    </div>
  );
}