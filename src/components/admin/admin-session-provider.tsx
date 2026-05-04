"use client";

import { createContext, useContext, useEffect, useState } from "react";

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

  async function hydrateFromResponse(authResponse: AuthResponse) {
    const nextState = applyAuthResponse(authResponse);
    setAccessToken(nextState.accessToken);
    setUser(nextState.user);
    setStatus(nextState.status);
  }

  function clearSession() {
    setAccessToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }

  async function refresh() {
    try {
      const authResponse = await refreshAdminSession();
      const currentUser = await getAdminMe(authResponse.accessToken);

      await hydrateFromResponse({ ...authResponse, user: currentUser });
      return authResponse.accessToken;
    } catch {
      clearSession();
      return null;
    }
  }

  async function login(credentials: LoginRequest) {
    const authResponse = await loginAdmin(credentials);
    const currentUser = await getAdminMe(authResponse.accessToken);
    await hydrateFromResponse({ ...authResponse, user: currentUser });
  }

  async function logout() {
    try {
      await logoutAdmin();
    } finally {
      clearSession();
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function hydrateSession() {
      try {
        const authResponse = await refreshAdminSession();
        const currentUser = await getAdminMe(authResponse.accessToken);

        if (!isMounted) {
          return;
        }

        await hydrateFromResponse({ ...authResponse, user: currentUser });
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
  }, []);

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
