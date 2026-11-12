import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Loader2, PlusCircle, RefreshCw, Search } from 'lucide-react';
import { phoneService } from '../../services/phoneService';
import { useCustomization } from '../../context/CustomizationContext';
import PhonePreview from './PhonePreview';

export default function PhoneStep() {
  const { state, dispatch } = useCustomization();
  const [query, setQuery] = useState('');
  const [brand, setBrand] = useState('All');
  const [manual, setManual] = useState('');
  const [error, setError] = useState('');
  const [brands, setBrands] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { phoneService.brands().then(setBrands).catch(() => setBrands(['Apple', 'Samsung', 'Xiaomi', 'Google', 'Other'])); }, [attempt]);

  // live search against the backend catalog (debounced, previous request cancelled)
  useEffect(() => {
    const ctl = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      phoneService.search({ query, brand }, { signal: ctl.signal })
        .then((list) => { setResults(list); setLoadError(''); setLoading(false); })
        .catch((err) => { if (err.name !== 'AbortError') { setLoadError(err.message); setLoading(false); } });
    }, query ? 250 : 0);
    return () => { clearTimeout(t); ctl.abort(); };
  }, [query, brand, attempt]);

  const choose = (phone) => {
    dispatch({ type: 'setPhone', phone });
    // phone changed → keep the design, just go on to the case step
    window.setTimeout(() => dispatch({ type: 'go', step: 2 }), 350);
  };

  const addCustom = async (e) => {
    e.preventDefault();
    try { choose(await phoneService.createCustom(manual || query)); setError(''); } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <label className="relative block">
        <span className="sr-only">Search by brand or model</span>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" size={20} aria-hidden />
        <input
          type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a brand or type your model… (e.g. “iPhone 15” or “Redmi”)"
          className="w-full rounded-full border-[3px] border-brand-ink bg-white py-3.5 pl-12 pr-5 text-base outline-none focus:bg-brand-sky"
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Brand filter">
        {['All', ...brands].map((b) => (
          <button key={b} type="button" onClick={() => setBrand(b)} aria-pressed={brand === b}
            className={`rounded-full border-[3px] border-brand-ink px-4 py-1 text-sm font-bold ${brand === b ? 'bg-brand-yellow' : 'bg-white hover:bg-brand-butter'}`}>{b}</button>
        ))}
      </div>

      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-label="Phone models">
        {results.map((p, i) => {
          const selected = state.phone?.id === p.id;
          return (
            <motion.li key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.02 }}>
              <button type="button" onClick={() => choose(p)} aria-pressed={selected}
                className={`relative flex h-full w-full flex-col items-center gap-2 rounded-[1.6rem] border-[3px] border-brand-ink p-3 text-center transition-colors ${selected ? 'bg-brand-yellow shadow-soft' : 'bg-white hover:bg-brand-sky'}`}>
                {selected && <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full border-2 border-brand-ink bg-brand-pink"><Check size={14} aria-hidden /></span>}
                <PhonePreview phone={p} className="w-14" />
                <span className="text-xs font-semibold text-brand-ink/60">{p.brand}</span>
                <span className="-mt-2 text-sm font-bold leading-tight">{p.name}</span>
                {p.needsVerification && <span className="rounded-full bg-brand-butter px-2 text-[11px] font-bold">custom model</span>}
              </button>
            </motion.li>
          );
        })}
      </ul>
      {loading && <p className="mt-6 flex items-center justify-center gap-2 font-semibold text-brand-ink/70" role="status"><Loader2 className="animate-spin" size={18} aria-hidden /> Loading phones…</p>}
      {loadError && (
        <p role="alert" className="mt-6 text-center font-semibold text-red-600">
          {loadError} <button type="button" onClick={() => setAttempt((n) => n + 1)} className="ml-2 inline-flex items-center gap-1 underline"><RefreshCw size={14} aria-hidden /> Try again</button>
        </p>
      )}
      {!loading && !loadError && !results.length && <p className="mt-6 text-center font-semibold text-brand-ink/70">No phone found for “{query}”. Add it below!</p>}

      <form onSubmit={addCustom} className="chalk-card mt-6 flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
        <label className="flex-1 text-sm font-bold">
          Can’t find your model? Type it here
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="e.g. Nokia G42"
            className="mt-1 block w-full rounded-full border-[3px] border-brand-ink bg-white px-4 py-2.5 text-base font-normal outline-none focus:bg-brand-sky" />
        </label>
        <button type="submit" className="btn-pop mt-1 bg-brand-blue py-2.5 text-base sm:mt-5"><PlusCircle size={18} aria-hidden /> Use this model</button>
      </form>
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-brand-ink/60">Custom models are flagged so we can verify them in the catalog before production.</p>
    </div>
  );
}
