"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { getAdminMe, loginAdmin, logoutAdmin, refreshAdminSession } from "@/lib/api/auth";
import type { AuthResponse, AuthUser, LoginRequest } from "@/lib/api/types";

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

type AdminSessionContextValue = {
  accessToken: string | null;
  status: SessionStatus;
  user: AuthUser | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<string | null>;
};

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);

function applyAuthResponse(authResponse: AuthResponse) {
  return {
    accessToken: authResponse.accessToken,
    status: "authenticated" as const,
    user: authResponse.user,
  };
}

export function AdminSessionProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");
  const refreshPromiseRef = useRef<Promise<AuthResponse> | null>(null);

  const hydrateFromResponse = useCallback((authResponse: AuthResponse) => {
    const nextState = applyAuthResponse(authResponse);
    setAccessToken(nextState.accessToken);
    setUser(nextState.user);
    setStatus(nextState.status);
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const fetchFreshSession = useCallback(() => {
    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = (async () => {
        const authResponse = await refreshAdminSession();
        const currentUser = await getAdminMe(authResponse.accessToken);
        return { ...authResponse, user: currentUser };
      })().finally(() => {
        refreshPromiseRef.current = null;
      });
    }

    return refreshPromiseRef.current;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const authResponse = await fetchFreshSession();
      hydrateFromResponse(authResponse);
      return authResponse.accessToken;
    } catch {
      clearSession();
      return null;
    }
  }, [clearSession, fetchFreshSession, hydrateFromResponse]);

  const login = useCallback(async (credentials: LoginRequest) => {
    const authResponse = await loginAdmin(credentials);
    const currentUser = await getAdminMe(authResponse.accessToken);
    hydrateFromResponse({ ...authResponse, user: currentUser });
  }, [hydrateFromResponse]);

  const logout = useCallback(async () => {
    try {
      await logoutAdmin();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    let isMounted = true;

    async function hydrateSession() {
      try {
        const authResponse = await fetchFreshSession();

        if (!isMounted) {
          return;
        }

        hydrateFromResponse(authResponse);
      } catch {
        if (!isMounted) {
          return;
        }

        clearSession();
      }
    }

    void hydrateSession();

    return () => {
      isMounted = false;
    };
  }, [clearSession, fetchFreshSession, hydrateFromResponse]);

  const value: AdminSessionContextValue = { accessToken, status, user, login, logout, refresh };

  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession() {
  const context = useContext(AdminSessionContext);

  if (!context) {
    throw new Error("useAdminSession must be used inside AdminSessionProvider.");
  }

  return context;
}
