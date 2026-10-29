'use client';

import React, { createContext, useContext, useState } from 'react';

export type NavigationTab =
  | 'dashboard'
  | 'register'
  | 'inspections'
  | 'recommendations'
  | 'marketplace'
  | 'outcomes'
  | 'shop'
  | 'waitlist'
  | 'pricing'
  | 'roi'
  | 'assistant'
  | 'reports'
  | 'settings';

interface NavigationContextType {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  selectedPathwayFilter: string | null;
  setSelectedPathwayFilter: (pathway: string | null) => void;
  selectedDefectFilter: string | null;
  setSelectedDefectFilter: (defect: string | null) => void;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [selectedPathwayFilter, setSelectedPathwayFilter] = useState<string | null>(null);
  const [selectedDefectFilter, setSelectedDefectFilter] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  return (
    <NavigationContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedPathwayFilter,
        setSelectedPathwayFilter,
        selectedDefectFilter,
        setSelectedDefectFilter,
        isAddModalOpen,
        setIsAddModalOpen,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

