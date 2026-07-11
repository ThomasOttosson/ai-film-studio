import apiClient from "./client";

export interface User {
  id: number;
  email: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: "bearer";
  user: User;
}

export interface Credentials {
  email: string;
  password: string;
}

export async function register(credentials: Credentials): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>(
    "/api/auth/register",
    credentials
  );

  return response.data;
}

export async function login(credentials: Credentials): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>(
    "/api/auth/login",
    credentials
  );

  return response.data;
}

export async function getCurrentUser(): Promise<User> {
  const response = await apiClient.get<User>("/api/auth/me");
  return response.data;
}