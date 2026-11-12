import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { isMuted, setMuted as persist } from '../services/soundService';

const SoundContext = createContext(null);

export function SoundProvider({ children }) {
  const [muted, setMutedState] = useState(isMuted);
  const toggle = useCallback(() => setMutedState((m) => { persist(!m); return !m; }), []);
  const value = useMemo(() => ({ muted, toggle }), [muted, toggle]);
  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}
export const useSound = () => useContext(SoundContext);
