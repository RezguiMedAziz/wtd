import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Building2, Home, Loader2, Mail, MapPin, Phone, Send, User, UserRound, X } from 'lucide-react';
import { EMPTY_FORM, submitOnboarding, validateField, validateForm } from '../../controllers/onboardingController';
import TextField from '../forms/TextField';
import Duck from '../ducks/Duck';

const GROUPS = [
  {
    title: 'Who are you?', accent: 'pink',
    fields: [
      { name: 'firstName', label: 'First name', icon: User, autoComplete: 'given-name', placeholder: 'Donald' },
      { name: 'lastName', label: 'Last name', icon: UserRound, autoComplete: 'family-name', placeholder: 'Duck' },
    ],
  },
  {
    title: 'How can we reach you?', accent: 'blue',
    fields: [
      { name: 'mobile', label: 'Mobile number', icon: Phone, type: 'tel', autoComplete: 'tel', placeholder: '+216 20 123 456', inputMode: 'tel' },
      { name: 'email', label: 'Email address', icon: Mail, type: 'email', autoComplete: 'email', placeholder: 'you@example.com' },
    ],
  },
  {
    title: 'Where do we waddle to?', accent: 'yellow',
    fields: [
      { name: 'address', label: 'Address', icon: Home, autoComplete: 'street-address', placeholder: '12 Pond Street', full: true },
      { name: 'city', label: 'City', icon: Building2, autoComplete: 'address-level2', placeholder: 'Tunis' },
      { name: 'postalCode', label: 'Postal code', icon: MapPin, autoComplete: 'postal-code', placeholder: '1000' },
    ],
  },
];
const ACCENT_BG = { pink: 'bg-brand-pink', blue: 'bg-brand-blue', yellow: 'bg-brand-yellow' };

/** Popup shown over a blurred page when a guest places an order. */
export default function OnboardingModal({ open, onSuccess, onCancel }) {
  const reduce = useReducedMotion();
  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const validCount = useMemo(() => Object.keys(EMPTY_FORM).filter((k) => !validateField(k, values[k])).length, [values]);

  // Lock page scroll, focus first field, close on Escape while the popup is open
  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => document.getElementById('firstName')?.focus(), 50);
    const onKey = (e) => e.key === 'Escape' && !submitting && onCancel();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, submitting, onCancel]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (touched[name]) setErrors((er) => ({ ...er, [name]: validateField(name, value) }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((t) => ({ ...t, [name]: true }));
    setErrors((er) => ({ ...er, [name]: validateField(name, value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validateForm(values);
    if (Object.keys(found).length) {
      setErrors(found);
      setTouched(Object.fromEntries(Object.keys(EMPTY_FORM).map((k) => [k, true])));
      document.getElementById(Object.keys(found)[0])?.focus();
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await submitOnboarding(values);
      if (result.ok) await onSuccess(result.user);
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
        >
          {/* Blurred backdrop */}
          <div
            className="absolute inset-0 bg-brand-ink/50 backdrop-blur-md"
            onClick={() => !submitting && onCancel()}
            aria-hidden="true"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
            className="sticker-card relative max-h-[92vh] w-full max-w-2xl overflow-y-auto bg-brand-cream p-4 sm:p-6"
            initial={{ opacity: 0, y: reduce ? 0 : 24, scale: reduce ? 1 : 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduce ? 0 : 24, scale: reduce ? 1 : 0.97 }}
            transition={{ duration: reduce ? 0 : 0.22 }}
          >
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              aria-label="Close"
              className="absolute right-3 top-3 rounded-full border-[3px] border-brand-ink bg-white p-1.5 hover:bg-brand-yellow disabled:opacity-50"
            >
              <X size={18} aria-hidden />
            </button>

            <div className="flex flex-col items-center text-center">
              <Duck name="sunny" size={72} />
              <h2 id="onboarding-title" className="mt-1 text-2xl font-bold sm:text-3xl">Almost there!</h2>
              <p className="mb-5 mt-1 max-w-md text-brand-ink/70">
                Tell us where to send your case and we’ll place your order.
              </p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              {GROUPS.map((group) => (
                <fieldset key={group.title} className="sticker-card relative p-4 pt-6 sm:p-5 sm:pt-7">
                  <legend className={`absolute -top-4 left-4 rounded-full border-[3px] border-brand-ink px-4 py-0.5 text-base font-bold ${ACCENT_BG[group.accent]}`}>
                    {group.title}
                  </legend>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {group.fields.map(({ full, ...f }) => (
                      <TextField
                        key={f.name}
                        id={f.name}
                        accent={group.accent}
                        className={full ? 'sm:col-span-2' : ''}
                        value={values[f.name]}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched[f.name] ? errors[f.name] : ''}
                        valid={touched[f.name] && !validateField(f.name, values[f.name])}
                        required
                        {...f}
                      />
                    ))}
                  </div>
                </fieldset>
              ))}

              {submitError && <p role="alert" className="text-center font-semibold text-red-600">{submitError}</p>}

              <div className="flex flex-col-reverse items-center justify-center gap-3 pt-1 sm:flex-row">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={submitting}
                  className="btn-pop bg-white px-6 text-base disabled:opacity-60"
                >
                  Not now
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-pop bg-brand-pink px-8 text-lg disabled:opacity-70"
                >
                  {submitting ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
                  {submitting ? 'Placing order…' : validCount === 7 ? 'Place my order!' : 'Continue'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}