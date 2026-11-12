import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { ClipboardList, LayoutDashboard, Layers, Loader2, LogOut, Menu, X } from 'lucide-react';
import { LOGO_SRC } from '../../constants/ducks';
import { ADMIN_AUTH_LOST, adminService } from '../../services/adminService';

const NAV = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { path: '/admin/sticker-sheets', label: 'Sticker Sheets', icon: Layers },
];

function AdminLogin({ onSuccess }) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    adminService.setToken(token);
    try {
      await adminService.listOrders(); // validates the token
      onSuccess();
    } catch (err) {
      adminService.setToken('');
      setError(err.message || 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <form onSubmit={submit} className="sticker-card w-full max-w-sm p-6">
        <img src={LOGO_SRC} alt="What The Duck" className="mx-auto w-40" />
        <h1 className="mt-4 text-center text-2xl font-bold">Admin</h1>
        <label className="mt-4 block text-sm font-bold">
          Admin access token
          <input
            type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" required
            className="mt-1 w-full rounded-full border-[3px] border-brand-ink px-4 py-2.5 text-base font-normal outline-none focus:bg-brand-sky"
          />
        </label>
        {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        <button type="submit" disabled={busy || !token.trim()} className="btn-pop mt-4 w-full bg-brand-pink py-2.5 text-base disabled:opacity-60">
          {busy && <Loader2 className="animate-spin" size={18} aria-hidden />} Sign in
        </button>
      </form>
    </div>
  );
}

function SidebarContent({ onNavigate }) {
  return (
    <>
      <Link to="/admin/dashboard" onClick={onNavigate}><img src={LOGO_SRC} alt="What The Duck" className="mx-auto w-full max-w-[11rem]" /></Link>
      <p className="mt-2 text-center text-sm font-bold uppercase tracking-wide text-brand-ink/60">Admin</p>
      <nav aria-label="Admin" className="mt-5 flex flex-col gap-2">
        {NAV.map(({ path, label, icon: Icon }) => (
          <NavLink key={path} to={path} onClick={onNavigate}
            className={({ isActive }) => `flex items-center gap-3 rounded-full border-[3px] border-brand-ink px-4 py-3 text-lg font-bold transition-all hover:-translate-y-0.5 ${isActive ? 'bg-brand-yellow shadow-soft' : 'bg-white/85 hover:bg-white'}`}>
            <Icon size={22} aria-hidden className="shrink-0" /> {label}
          </NavLink>
        ))}
      </nav>
      <button type="button" onClick={adminService.signOut} className="btn-pop mt-auto bg-white px-3 py-2 text-base"><LogOut size={18} aria-hidden /> Sign out</button>
    </>
  );
}

export default function AdminLayout() {
  const [authed, setAuthed] = useState(adminService.hasToken());
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const lost = () => setAuthed(false);
    window.addEventListener(ADMIN_AUTH_LOST, lost);
    return () => window.removeEventListener(ADMIN_AUTH_LOST, lost);
  }, []);
  useEffect(() => setMobileOpen(false), [pathname]);

  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} />;

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col rounded-r-[2.5rem] border-r-[3px] border-brand-ink bg-brand-blue p-4 md:flex">
        <SidebarContent />
      </aside>

      <div className={`fixed inset-0 z-40 bg-brand-ink/50 md:hidden ${mobileOpen ? '' : 'pointer-events-none opacity-0'}`} onClick={() => setMobileOpen(false)} aria-hidden="true" />
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col rounded-r-[2.5rem] border-r-[3px] border-brand-ink bg-brand-blue p-4 transition-transform md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-[105%]'}`} aria-label="Admin menu">
        <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close menu" className="mb-2 self-end rounded-full border-[3px] border-brand-ink bg-white p-1.5"><X aria-hidden /></button>
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 bg-brand-cream/90 px-3 pb-3 pt-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-3 rounded-full border-[3px] border-brand-ink bg-brand-blue px-3 py-2 shadow-soft">
            <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu" className="rounded-full border-[3px] border-brand-ink bg-white p-2"><Menu aria-hidden /></button>
            <span className="text-lg font-bold">Admin</span>
          </div>
        </header>
        <main className="mx-auto max-w-6xl p-4 sm:p-8"><Outlet /></main>
      </div>
    </div>
  );
}