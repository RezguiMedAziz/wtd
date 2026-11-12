import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { onboardingService } from '../services/onboardingService';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUserState] = useState(() => onboardingService.getUser());
  const setUser = useCallback((u) => setUserState(u), []);
  const value = useMemo(() => ({ user, setUser }), [user, setUser]);
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export const useUser = () => useContext(UserContext);
