import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Mode } from '../data/types';

interface ModeContextValue {
  mode: Mode;
  setMode: (mode: Mode) => void;
  toggle: () => void;
}

const ModeContext = createContext<ModeContextValue | null>(null);

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>('etdb');

  const value = useMemo<ModeContextValue>(
    () => ({
      mode,
      setMode,
      toggle: () => setMode((m) => (m === 'etdb' ? 'base' : 'etdb')),
    }),
    [mode],
  );

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode(): ModeContextValue {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useMode must be used within a ModeProvider');
  return ctx;
}
