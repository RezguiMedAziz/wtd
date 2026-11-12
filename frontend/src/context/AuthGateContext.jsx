import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useUser } from './UserContext';
import { useCart } from './Cartcontext';
import { customizationService } from '../services/customizationService';
import { authGate, GATE_CANCELLED } from '../services/authGate';
import OnboardingModal from '../components/onboarding/OnboardingModal';

export { GATE_CANCELLED };

const AuthGateContext = createContext(null);

/**
 * requireUser(action): runs `action` right away if the user already has a profile,
 * otherwise opens the onboarding popup first and runs `action` once it succeeds.
 * Resolves with GATE_CANCELLED if the user closes the popup.
 *
 * Must be rendered inside UserProvider and CartProvider.
 */
export function AuthGateProvider({ children }) {
  const { user, setUser } = useUser();
  const { replaceIds } = useCart();
  const [open, setOpen] = useState(false);
  const pending = useRef(null);
  const userRef = useRef(user);
  userRef.current = user;

  const requireUser = useCallback(
    (action) =>
      new Promise((resolve, reject) => {
        if (userRef.current) {
          Promise.resolve().then(action).then(resolve, reject);
          return;
        }
        pending.current?.resolve(GATE_CANCELLED); // a previous request is replaced
        pending.current = { action, resolve, reject };
        setOpen(true);
      }),
    []
  );

  // Lets services (e.g. orderService) trigger the popup too.
  useEffect(() => {
    authGate.register(requireUser);
    return () => authGate.register(null);
  }, [requireUser]);

  const handleSuccess = useCallback(
    async (newUser) => {
      setUser(newUser);
      setOpen(false);
      const p = pending.current;
      pending.current = null;
      // Push designs saved as a guest to the account that was just created.
      try {
        replaceIds(await customizationService.syncGuestDesigns());
      } catch {
        /* they stay local and will be retried next time */
      }
      if (p) Promise.resolve().then(p.action).then(p.resolve, p.reject);
    },
    [setUser, replaceIds]
  );

  const handleCancel = useCallback(() => {
    setOpen(false);
    pending.current?.resolve(GATE_CANCELLED);
    pending.current = null;
  }, []);

  const value = useMemo(() => ({ requireUser }), [requireUser]);

  return (
    <AuthGateContext.Provider value={value}>
      {children}
      <OnboardingModal open={open} onSuccess={handleSuccess} onCancel={handleCancel} />
    </AuthGateContext.Provider>
  );
}

export function useAuthGate() {
  const ctx = useContext(AuthGateContext);
  if (!ctx) throw new Error('useAuthGate must be used inside <AuthGateProvider>');
  return ctx;
}