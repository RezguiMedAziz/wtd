import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Pipette } from 'lucide-react';
import { caseService, useCaseConfig } from '../../services/caseService';
import { useCustomization } from '../../context/CustomizationContext';
import { isHex } from '../../utils/ColorPicker';
import PhonePreview from './PhonePreview';
import ColorWheel from './ColorWheel';

const RAINBOW = 'conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)';

export default function CaseStep() {
  useCaseConfig();
  const { state, dispatch } = useCustomization();
  const { phone, caseType, color } = state;
  // The backend stores every color as '#rrggbb', so a loaded design may hold a hex that equals a swatch:
  // resolve it to the swatch; it is a "custom" color only when no swatch matches.
  const current = caseService.color(color);
  const custom = isHex(color) && current.id === color;
  const [wheelOpen, setWheelOpen] = useState(custom);

  const choose = (id) => {
    dispatch({ type: 'setCaseType', value: id });
    // transparent has nothing else to configure: go straight to the stickers
    if (id === 'transparent') window.setTimeout(() => dispatch({ type: 'go', step: 3 }), 350);
  };

  return (
    <div>
      <p className="mb-4 text-center font-semibold text-brand-ink/70">{phone.brand === 'Custom' ? '' : `${phone.brand} `}{phone.name}</p>
      <div className="grid gap-4 sm:grid-cols-2" role="radiogroup" aria-label="Case type">
        {caseService.types().map((t) => {
          const selected = caseType === t.id;
          return (
            <motion.div key={t.id} whileHover={{ y: -3 }} className={`relative flex flex-col items-center rounded-[2rem] border-[3px] border-brand-ink p-5 text-center transition-colors ${selected ? 'bg-brand-yellow shadow-soft' : 'bg-white'}`}>
              {selected && <span className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full border-2 border-brand-ink bg-brand-pink"><Check size={16} aria-hidden /></span>}
              <div className="grid h-64 place-items-center">
                <PhonePreview phone={phone} caseType={t.id} color={color} className="w-32" />
              </div>
              <h3 className="mt-2 text-xl font-bold">{t.label}</h3>
              <p className="mt-1 max-w-xs text-sm text-brand-ink/70">{t.description}</p>
              <button type="button" role="radio" aria-checked={selected} onClick={() => choose(t.id)}
                className={`btn-pop mt-4 py-2 text-base ${selected ? 'bg-white' : 'bg-brand-pink'}`}>{selected ? 'Selected' : `Choose ${t.id}`}</button>
            </motion.div>
          );
        })}
      </div>

      {caseType === 'silicone' && (
        <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="sticker-card mt-6 grid items-start gap-6 p-5 sm:grid-cols-[auto,1fr] sm:p-6" aria-label="Silicone color">
          <PhonePreview phone={phone} caseType="silicone" color={color} className="mx-auto w-40" />
          <div>
            <h3 className="text-xl font-bold">Pick your silicone color</h3>
            <p className="mb-3 text-sm text-brand-ink/70">{current.label} — the case on the left updates instantly.</p>
            <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Silicone colors">
              {caseService.colors().map((c) => {
                const active = !custom && current.id === c.id;
                return (
                  <button key={c.id} type="button" role="radio" aria-checked={active} aria-label={c.label} title={c.label}
                    onClick={() => dispatch({ type: 'setColor', value: c.id })}
                    className={`grid h-12 w-12 place-items-center rounded-full border-[3px] border-brand-ink transition-transform hover:scale-105 ${active ? 'ring-4 ring-brand-ink/30 ring-offset-2' : ''}`}
                    style={{ background: c.hex }}>
                    {active && <Check size={18} aria-hidden className={['black'].includes(c.id) ? 'text-white' : 'text-brand-ink'} />}
                  </button>
                );
              })}

              {/* any color: opens the color wheel */}
              <button type="button" aria-pressed={wheelOpen} aria-label="Pick any color with the color wheel" title="Any color"
                onClick={() => setWheelOpen((o) => !o)}
                className={`grid h-12 w-12 place-items-center rounded-full border-[3px] border-brand-ink transition-transform hover:scale-105 ${custom ? 'ring-4 ring-brand-ink/30 ring-offset-2' : ''}`}
                style={{ background: RAINBOW }}>
                <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-brand-ink" style={{ background: custom ? color : '#fff' }}>
                  {!custom && <Pipette size={13} aria-hidden />}
                </span>
              </button>
            </div>

            {wheelOpen && (
              <div className="mt-5">
                <ColorWheel value={current.hex} onChange={(hex) => dispatch({ type: 'setColor', value: hex })} />
              </div>
            )}
          </div>
        </motion.section>
      )}
    </div>
  );
}