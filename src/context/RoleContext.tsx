import React, { createContext, useContext, useState } from 'react';
import { UserRole, RoleDefinition } from '../../shared/types.js';

export const ROLE_DEFINITIONS: Record<UserRole, RoleDefinition> = {
  admin: {
    id: 'admin',
    label: 'Administrator',
    description: 'Full unconstrained access to all FinOps tools, technical inventory, and department rules.',
    badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    allowedNavItems: ['*'] // All tabs
  },
  finance: {
    id: 'finance',
    label: 'Finance & Accounting',
    description: 'Financial accountability, department cost bifurcation, bill reconciliation, executive PDFs, and forecasts.',
    badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    allowedNavItems: [
      'overview',
      'executive',
      'forecast',
      'departments',
      'invoice',
      'services',
      'drilldown',
      'anomalies',
      'tags',
      'accounts',
      'export',
      'glossary',
      'ask'
    ]
  },
  devops: {
    id: 'devops',
    label: 'DevOps & Cloud Arch',
    description: 'Technical infrastructure, per-resource TCO, idle resource Waste Hunter, and CloudTrail activity.',
    badgeColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    allowedNavItems: [
      'overview',
      'waste',
      'inventory',
      'activity',
      'services',
      'daily',
      'regions',
      'compute',
      'storage',
      'databases',
      'datatransfer',
      'ai',
      'anomalies',
      'settings',
      'ask'
    ]
  },
  viewer: {
    id: 'viewer',
    label: 'Executive Viewer',
    description: 'High-level business overview and plain-English financial insights.',
    badgeColor: 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    allowedNavItems: [
      'overview',
      'executive',
      'departments',
      'ask',
      'glossary'
    ]
  }
};

interface RoleContextType {
  role: UserRole;
  setRole: (r: UserRole) => void;
  activeRoleDef: RoleDefinition;
  availableRoles: RoleDefinition[];
  isNavAllowed: (navItemId: string) => boolean;
}

const RoleContext = createContext<RoleContextType | null>(null);

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>(() => {
    const saved = localStorage.getItem('aws_costlens_user_role') as UserRole;
    return saved && ROLE_DEFINITIONS[saved] ? saved : 'admin';
  });

  const setRole = (r: UserRole) => {
    if (ROLE_DEFINITIONS[r]) {
      setRoleState(r);
      localStorage.setItem('aws_costlens_user_role', r);
    }
  };

  const activeRoleDef = ROLE_DEFINITIONS[role];

  const isNavAllowed = (navItemId: string): boolean => {
    if (activeRoleDef.allowedNavItems.includes('*')) return true;
    return activeRoleDef.allowedNavItems.includes(navItemId);
  };

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole,
        activeRoleDef,
        availableRoles: Object.values(ROLE_DEFINITIONS),
        isNavAllowed
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export function useRole(): RoleContextType {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    return {
      role: 'admin',
      setRole: () => {},
      activeRoleDef: ROLE_DEFINITIONS.admin,
      availableRoles: Object.values(ROLE_DEFINITIONS),
      isNavAllowed: () => true
    };
  }
  return ctx;
}
