import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { storageService } from '../../services/storageService';
import Sidebar from '../navigation/Sidebar';
import TopNavbar from '../navigation/TopNavbar';

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(() => storageService.get('sidebarCollapsed', false) === true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setMobileOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggle = () =>
    setCollapsed((c) => {
      storageService.set('sidebarCollapsed', !c);
      return !c;
    });

  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={collapsed} onToggle={toggle} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
      <div className="min-w-0 flex-1">
        <TopNavbar onOpenMenu={() => setMobileOpen(true)} />
        <main className="p-4 sm:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}