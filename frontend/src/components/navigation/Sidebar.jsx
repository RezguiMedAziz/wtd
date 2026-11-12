import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronsLeft, ChevronsRight, Volume2, VolumeX, X } from 'lucide-react';
import { NAV_ITEMS } from '../../constants/navigation';
import { LOGO_SRC } from '../../constants/ducks';
import { CHARACTERS, CHARACTER_ORDER } from '../../constants/characters';
import { SPRING_SOFT } from '../../constants/animations';
import { playQuack } from '../../services/soundService';
import { useSound } from '../../context/SoundContext';

function NavContent({ collapsed, onNavigate }) {
  return (
    <nav aria-label="Main" className="mt-5 flex flex-col gap-2">
      {NAV_ITEMS.map(({ id, label, path, icon: Icon }) => (
        <NavLink
          key={id} to={path} onClick={onNavigate} title={collapsed ? label : undefined}
          className={({ isActive }) =>
            `group relative flex items-center gap-3 rounded-full border-[3px] border-brand-ink py-3 text-lg font-bold transition-all hover:-translate-y-0.5 ${
              isActive ? 'bg-brand-yellow shadow-soft' : 'bg-white/85 hover:bg-white'
            } ${collapsed ? 'justify-center px-0' : 'px-4'}`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={22} aria-hidden className="shrink-0" />
              {collapsed ? <span className="sr-only">{label}</span> : <span className="truncate">{label}</span>}
              {isActive && <span className="absolute -left-[13px] h-6 w-2 rounded-full border-2 border-brand-ink bg-brand-pink" aria-hidden />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

// Collapsed-mode duck: each click quacks and shows the next duck (in order, looping through all six).
function DuckSwitcher() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const c = CHARACTERS[CHARACTER_ORDER[index]];
  const next = () => { playQuack(); setIndex((i) => (i + 1) % CHARACTER_ORDER.length); };
  return (
    <button type="button" onClick={next} aria-label={`${c.name} — click to switch duck and quack`} title="Click me!" className="relative mx-auto block w-[4.5rem] rounded-[1.2rem] border-[3px] border-brand-ink bg-white" style={{ boxShadow: `0 0 0 4px ${c.color}` }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.img key={c.name} src={c.src} alt="" draggable={false} className="block h-auto w-full rounded-[0.95rem]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.18 }} />
      </AnimatePresence>
    </button>
  );
}

function SoundToggle({ collapsed }) {
  const { muted, toggle } = useSound();
  return (
    <button type="button" onClick={toggle} aria-pressed={muted} aria-label={muted ? 'Unmute quack sound' : 'Mute quack sound'} title={muted ? 'Sound off' : 'Sound on'}
      className={`flex items-center justify-center gap-2 rounded-full border-[3px] border-brand-ink bg-white/85 py-2 text-sm font-bold hover:bg-white ${collapsed ? 'px-0' : 'px-4'}`}>
      {muted ? <VolumeX size={18} aria-hidden /> : <Volume2 size={18} aria-hidden />}
      {!collapsed && (muted ? 'Sound off' : 'Sound on')}
    </button>
  );
}

const Bubbles = () => (
  <>
    <span aria-hidden className="pointer-events-none absolute -right-8 top-40 h-24 w-24 rounded-full bg-white/20" />
    <span aria-hidden className="pointer-events-none absolute -left-6 bottom-32 h-16 w-16 rounded-full bg-brand-pink/40" />
    <span aria-hidden className="pointer-events-none absolute right-3 bottom-48 h-6 w-6 rounded-full bg-brand-yellow/70" />
  </>
);

export default function Sidebar({ collapsed, onToggle, mobileOpen, onCloseMobile }) {
  const reduce = useReducedMotion();
  const transition = reduce ? { duration: 0 } : SPRING_SOFT;

  return (
    <>
      <motion.aside
        className="sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden rounded-r-[2.5rem] border-r-[3px] border-brand-ink bg-brand-blue p-4 md:flex"
        animate={{ width: collapsed ? 96 : 280 }} initial={false} transition={transition}
      >
        <Bubbles />
        <div className="relative flex flex-col">
          {collapsed ? <DuckSwitcher /> : <img src={LOGO_SRC} alt="What The Duck" className="mx-auto w-full max-w-[13rem]" />}
          <NavContent collapsed={collapsed} />
        </div>
        <div className="relative mt-auto flex flex-col gap-2">
          <SoundToggle collapsed={collapsed} />
          <button type="button" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed}
            className="btn-pop bg-brand-pink px-3 py-2 text-base">
            {collapsed ? <ChevronsRight aria-hidden /> : <><ChevronsLeft aria-hidden /> Collapse</>}
          </button>
        </div>
      </motion.aside>

      <motion.div className={`fixed inset-0 z-40 bg-brand-ink/50 md:hidden ${mobileOpen ? '' : 'pointer-events-none'}`} animate={{ opacity: mobileOpen ? 1 : 0 }} onClick={onCloseMobile} aria-hidden="true" />
      <motion.aside
        className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col overflow-hidden rounded-r-[2.5rem] border-r-[3px] border-brand-ink bg-brand-blue p-4 md:hidden"
        initial={false} animate={{ x: mobileOpen ? 0 : '-105%' }} transition={transition} aria-label="Navigation menu" {...(mobileOpen ? {} : { inert: '' })}
      >
        <Bubbles />
        <button type="button" onClick={onCloseMobile} aria-label="Close menu" className="relative mb-2 self-end rounded-full border-[3px] border-brand-ink bg-white p-1.5"><X aria-hidden /></button>
        <img src={LOGO_SRC} alt="What The Duck" className="relative mx-auto w-48" />
        <div className="relative"><NavContent collapsed={false} onNavigate={onCloseMobile} /></div>
        <div className="relative mt-auto"><SoundToggle collapsed={false} /></div>
      </motion.aside>
    </>
  );
}
