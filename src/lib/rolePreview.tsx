import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export type PreviewRole = 'worker' | 'manager' | 'admin' | null;

interface PreviewRoleContextType {
  realRole: string | null;
  previewRole: PreviewRole;
  effectiveRole: string | null;
  setPreviewRole: (role: PreviewRole) => void;
  clearPreview: () => void;
  isPreviewActive: boolean;
}

const PreviewRoleContext = createContext<PreviewRoleContextType | undefined>(undefined);

export const usePreviewRole = () => {
  const context = useContext(PreviewRoleContext);
  if (context === undefined) {
    throw new Error('usePreviewRole must be used within a PreviewRoleProvider');
  }
  return context;
};

const STORAGE_KEY = 'preview.role';

export const PreviewRoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userRole } = useAuth();
  const [previewRole, setPreviewRoleState] = useState<PreviewRole>(null);

  // Load preview role from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ['worker', 'manager', 'admin'].includes(stored)) {
      setPreviewRoleState(stored as PreviewRole);
    }
  }, []);

  // Check for URL parameter on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roleParam = urlParams.get('as');
    
    if (roleParam && ['worker', 'manager', 'admin'].includes(roleParam)) {
      setPreviewRole(roleParam as PreviewRole);
      
      // Remove the parameter from URL
      urlParams.delete('as');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, []);

  const setPreviewRole = (role: PreviewRole) => {
    setPreviewRoleState(role);
    if (role) {
      localStorage.setItem(STORAGE_KEY, role);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const clearPreview = () => {
    setPreviewRole(null);
  };

  const effectiveRole = previewRole || userRole;
  const isPreviewActive = previewRole !== null;

  const value = {
    realRole: userRole,
    previewRole,
    effectiveRole,
    setPreviewRole,
    clearPreview,
    isPreviewActive,
  };

  return <PreviewRoleContext.Provider value={value}>{children}</PreviewRoleContext.Provider>;
};