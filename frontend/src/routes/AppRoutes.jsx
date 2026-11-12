import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ROUTES } from '../constants/routes';
import PageTransition from '../components/animations/PageTransition';
import Loader from '../components/common/Loader';
import Welcome from '../pages/Welcome/Welcome';

const DashboardLayout = lazy(() => import('../components/layout/DashboardLayout'));
const StickerSheetsGallery = lazy(() => import('../pages/Dashboard/StickerSheets/StickerSheetsGallery'));
const StickerSheetDetail = lazy(() => import('../pages/Dashboard/StickerSheets/StickerSheetDetail'));
const PhonesCases = lazy(() => import('../pages/Dashboard/PhonesCases/PhonesCases'));
const MyOrders = lazy(() => import('../pages/Dashboard/MyOrders/MyOrders'));
const AdminLayout = lazy(() => import('../components/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('../pages/Admin/AdminDashboard'));
const AdminOrders = lazy(() => import('../pages/Admin/AdminOrders'));
const AdminOrderDetails = lazy(() => import('../pages/Admin/AdminOrderDetails'));
const AdminSheets = lazy(() => import('../pages/Admin/AdminSheets'));
const AdminSheetEditor = lazy(() => import('../pages/Admin/AdminSheetEditor'));

export default function AppRoutes() {
  const location = useLocation();
  const section = location.pathname.startsWith('/dashboard')
    ? 'dashboard'
    : location.pathname.startsWith('/admin')
      ? 'admin'
      : location.pathname;

  return (
    <Suspense fallback={<Loader />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={section}>
          <Route path={ROUTES.welcome} element={<PageTransition><Welcome /></PageTransition>} />
          {/* The dashboard is open to guests. The journey starts with the sticker-sheet gallery. */}
          <Route path={ROUTES.dashboard} element={<PageTransition><DashboardLayout /></PageTransition>}>
            <Route index element={<Navigate to="sticker-sheets" replace />} />
            <Route path="sticker-sheets" element={<StickerSheetsGallery />} />
            <Route path="sticker-sheets/:id" element={<StickerSheetDetail />} />
            <Route path="phones-cases" element={<PhonesCases />} />
            <Route path="my-orders" element={<MyOrders />} />
          </Route>
          {/* Admin: one layout route only (token login is inside AdminLayout) */}
          <Route path="/admin" element={<PageTransition><AdminLayout /></PageTransition>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:reference" element={<AdminOrderDetails />} />
            <Route path="sticker-sheets" element={<AdminSheets />} />
            <Route path="sticker-sheets/:id" element={<AdminSheetEditor />} />
          </Route>
          <Route path="*" element={<Navigate to={ROUTES.welcome} replace />} />
        </Routes>
      </AnimatePresence>
    </Suspense>
  );
}