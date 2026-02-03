'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { type Role, type Permission, hasPermission } from '@/lib/permissions';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
}

interface AuthState {
  user: AuthUser | null;
  permissions: Permission[];
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (username: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    permissions: [],
    isLoading: true,
    isAuthenticated: false,
  });

  const refreshAuth = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setState({
          user: data.user,
          permissions: data.permissions || [],
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setState({
          user: null,
          permissions: [],
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch {
      setState({
        user: null,
        permissions: [],
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = useCallback(async (username: string, pin: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, pin }),
      });

      const data = await response.json();

      if (response.ok) {
        await refreshAuth();
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch {
      return { success: false, error: 'Network error' };
    }
  }, [refreshAuth]);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore errors
    } finally {
      setState({
        user: null,
        permissions: [],
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  const checkPermission = useCallback((permission: Permission) => {
    if (!state.user) return false;
    return hasPermission(state.user.role, permission);
  }, [state.user]);

  const checkAnyPermission = useCallback((permissions: Permission[]) => {
    if (!state.user) return false;
    return permissions.some(p => hasPermission(state.user!.role, p));
  }, [state.user]);

  const checkAllPermissions = useCallback((permissions: Permission[]) => {
    if (!state.user) return false;
    return permissions.every(p => hasPermission(state.user!.role, p));
  }, [state.user]);

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    refreshAuth,
    hasPermission: checkPermission,
    hasAnyPermission: checkAnyPermission,
    hasAllPermissions: checkAllPermissions,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to check if the current user has a specific permission
 */
export function usePermission(permission: Permission): boolean {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}

/**
 * Component that only renders children if user has the specified permission
 */
export function RequirePermission({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const hasPermission = usePermission(permission);
  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

/**
 * Component that only renders children if user has any of the specified permissions
 */
export function RequireAnyPermission({
  permissions,
  children,
  fallback = null,
}: {
  permissions: Permission[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { hasAnyPermission } = useAuth();
  return hasAnyPermission(permissions) ? <>{children}</> : <>{fallback}</>;
}

/**
 * Component that only renders children if user is authenticated
 */
export function RequireAuth({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return isAuthenticated ? <>{children}</> : <>{fallback}</>;
}
