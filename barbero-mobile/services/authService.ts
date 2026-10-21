import { apiClient } from "./api";

export interface User {
  id: number;
  fullName: string | null;
  email: string;
  role: "CUSTOMER" | "BARBER";
  area_id: number | null;
}

export interface AuthResponse {
  message?: string;
  token?: string;
  user: User;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
}

export interface BarberRegisterPayload {
  fullName: string;
  email: string;
  password: string;
  area_id: number;
  invite_key: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

/**
 * Registers a new customer with the backend.
 * Endpoint: POST /api/auth/register
 * Payload: { fullName, email, password }
 */
export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/auth/register", {
    fullName: payload.fullName.trim(),
    email: payload.email.trim(),
    password: payload.password,
  });
  return response.data;
}

/**
 * Registers a new barber with the backend.
 * Endpoint: POST /api/auth/register/barber
 * Payload: { fullName, email, password, area_id, invite_key }
 * The invite_key is validated server-side against the BARBER_INVITE_KEY env var.
 */
export async function registerBarber(payload: BarberRegisterPayload): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/auth/register/barber", {
    fullName: payload.fullName.trim(),
    email: payload.email.trim(),
    password: payload.password,
    area_id: payload.area_id,
    invite_key: payload.invite_key,
  });
  return response.data;
}

/**
 * Authenticates an existing user and retrieves a JWT token.
 * Endpoint: POST /api/auth/login
 * Payload: { email, password }
 */
export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/auth/login", {
    email: payload.email.trim(),
    password: payload.password,
  });
  return response.data;
}

/**
 * Retrieves the current authenticated user's profile.
 * Endpoint: GET /api/auth/me
 * Uses Bearer token attached via Axios request interceptor.
 */
export async function getCurrentUser(): Promise<{ user: User }> {
  const response = await apiClient.get<{ user: User }>("/auth/me");
  return response.data;
}
