import { apiFetch, clearToken, getToken, setToken } from "./client";

export interface MeUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "EMPLOYEE";
  isActive: boolean;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "EMPLOYEE";
  };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const result = await apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    token: null,
  });
  setToken(result.accessToken);
  return result;
}

export function logout(): void {
  clearToken();
}

export function hasToken(): boolean {
  return getToken() !== null;
}

export async function getMe(): Promise<MeUser> {
  return apiFetch<MeUser>("/auth/me");
}
