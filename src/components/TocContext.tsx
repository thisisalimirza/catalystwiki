'use client';

import { createContext, useContext, useState } from 'react';
import type { TocItem } from './TocPanel';

interface TocContextType {
  tocItems: TocItem[];
  setTocItems: (items: TocItem[]) => void;
}

const TocContext = createContext<TocContextType>({ tocItems: [], setTocItems: () => {} });

export function TocProvider({ children }: { children: React.ReactNode }) {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  return (
    <TocContext.Provider value={{ tocItems, setTocItems }}>
      {children}
    </TocContext.Provider>
  );
}

export function useTocContext() {
  return useContext(TocContext);
}
