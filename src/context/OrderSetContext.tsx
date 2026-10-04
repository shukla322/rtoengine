import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { OrderSet } from '../data/types';
import { orderSets } from '../data/orderSets';

/** Top-level page: the tool launcher, the order workspace (engine or a saved analysis), the dashboard, or the engine guide. */
export type View = 'home' | 'workspace' | 'dashboard' | 'guide';

interface OrderSetContextValue {
  sets: OrderSet[];
  activeKey: string;
  setActiveKey: (key: string) => void;
  homeVersion: number;
  view: View;
  openDashboard: () => void;
  /** Opens the end-to-end RTO prevention engine; an order already in progress is kept. */
  openEngine: () => void;
  /** Opens the how-to guide for the engine; the order in progress is kept. */
  openGuide: () => void;
  goHome: () => void;
  active: OrderSet;
}

const OrderSetContext = createContext<OrderSetContextValue | null>(null);

export function OrderSetProvider({ children }: { children: ReactNode }) {
  const [activeKey, updateActiveKey] = useState('custom');
  const [view, setView] = useState<View>('home');
  const [homeVersion, setHomeVersion] = useState(0);
  const toTop = () => window.scrollTo({ top: 0 });

  const setActiveKey = (key: string) => { updateActiveKey(key); setView('workspace'); toTop(); };
  const openDashboard = () => { setView('dashboard'); toTop(); };
  const openEngine = () => { setActiveKey('custom'); };
  const openGuide = () => { setView('guide'); toTop(); };
  const goHome = () => {
    updateActiveKey('custom');
    setHomeVersion((value) => value + 1); // the engine restarts from a clean order next time it opens
    setView('home');
    toTop();
  };

  const value = useMemo<OrderSetContextValue>(() => {
    const active = orderSets.find((s) => s.key === activeKey) ?? orderSets[0];
    return { sets: orderSets, activeKey, setActiveKey, homeVersion, view, openDashboard, openEngine, openGuide, goHome, active };
  }, [activeKey, homeVersion, view]);

  return <OrderSetContext.Provider value={value}>{children}</OrderSetContext.Provider>;
}

export function useOrderSet(): OrderSetContextValue {
  const ctx = useContext(OrderSetContext);
  if (!ctx) throw new Error('useOrderSet must be used within an OrderSetProvider');
  return ctx;
}
