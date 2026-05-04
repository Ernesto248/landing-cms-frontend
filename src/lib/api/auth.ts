import { apiFetch } from "@/lib/api/http";
import type { AuthResponse, AuthUser, LoginRequest } from "@/lib/api/types";

export function loginAdmin(credentials: LoginRequest) {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: credentials,
    credentials: "include",
    cache: "no-store",
  });
}

export function refreshAdminSession() {
  return apiFetch<AuthResponse>("/auth/refresh", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });
}

export function logoutAdmin() {
  return apiFetch<{ message: string }>("/auth/logout", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });
}

export function getAdminMe(accessToken: string) {
  return apiFetch<AuthUser>("/admin/me", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}
