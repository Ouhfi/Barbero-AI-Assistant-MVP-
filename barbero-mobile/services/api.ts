import axios from "axios";

/**
 * BARBERO Mobile - Centralized Axios Instance
 * Development base URL points to the local backend on port 3003.
 */
export const API_BASE_URL = "http://192.168.240.1:3003/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// In-memory token storage for request interceptor (avoids circular dependency with Zustand)
let authToken: string | null = null;

export const setAuthToken = (token: string | null): void => {
  authToken = token;
};

/**
 * Safely checks whether headers (AxiosHeaders instance or plain object)
 * contain a Bearer token in a case-insensitive manner.
 */
export const hasBearerToken = (headers: unknown): boolean => {
  if (!headers || typeof headers !== "object") return false;
  // If AxiosHeaders instance (has case-insensitive .get method)
  if ("get" in headers && typeof (headers as { get: unknown }).get === "function") {
    const val = (headers as { get: (name: string) => unknown }).get("Authorization");
    return typeof val === "string" && val.startsWith("Bearer ");
  }
  // Fallback for plain objects
  const rec = headers as Record<string, unknown>;
  const raw = rec["Authorization"] ?? rec["authorization"];
  return typeof raw === "string" && raw.startsWith("Bearer ");
};

// Automatically attach Bearer token to requests when authenticated
apiClient.interceptors.request.use(
  (config) => {
    // Never attach Authorization header to public auth endpoints
    const url = config.url ?? "";
    const isPublicAuthRoute = url.includes("/auth/login") || url.includes("/auth/register");

    if (authToken && config.headers && !isPublicAuthRoute) {
      if (typeof (config.headers as unknown as { set?: unknown }).set === "function") {
        (config.headers as unknown as { set: (k: string, v: string) => void }).set(
          "Authorization",
          `Bearer ${authToken}`
        );
      } else {
        config.headers.Authorization = `Bearer ${authToken}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Global 401 handler — registered once by the auth store after hydration.
 * Avoids a circular import: api.ts never imports authStore directly.
 * When an authenticated request receives HTTP 401 (expired / invalid token),
 * this callback clears persisted auth state and redirects to login.
 */
let onUnauthorized: (() => void) | null = null;

/** Prevents multiple simultaneous 401 responses from firing the handler repeatedly. */
let isHandlingUnauthorized = false;

export const registerUnauthorizedHandler = (handler: () => void): void => {
  onUnauthorized = handler;
  isHandlingUnauthorized = false; // reset guard whenever a new handler is registered
};

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      onUnauthorized &&
      !isHandlingUnauthorized
    ) {
      // Inspect the failed request's own Authorization header rather than the
      // module-level authToken variable. This is accurate even under concurrent
      // logout races: if this request carried a Bearer token it was authenticated,
      // regardless of what authToken holds at the time this callback executes.
      const wasAuthenticated = hasBearerToken(error.config?.headers);

      if (wasAuthenticated) {
        // Idempotency: mark as handling before the async callback so concurrent
        // 401 responses do not stack additional router.replace() calls.
        isHandlingUnauthorized = true;
        try {
          onUnauthorized();
        } catch (handlerError) {
          // If the handler encounters an exception (e.g. during navigation),
          // clear the flag so subsequent 401s do not remain permanently blocked.
          isHandlingUnauthorized = false;
          console.error("Error executing unauthorized handler:", handlerError);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

