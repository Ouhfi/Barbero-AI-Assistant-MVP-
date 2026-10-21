import axios from "axios";
import { hasBearerToken } from "./api";

/**
 * Converts any caught API or network error into a clean, human-readable message.
 * Never logs or exposes passwords, tokens, or sensitive payload data.
 */
export function getReadableErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (data && typeof data === "object") {
      // 1. Array of validation errors (e.g. Zod validation issue format)
      // Check validation errors first so specific field errors take precedence over generic "Validation failed"
      if ("errors" in data && Array.isArray((data as { errors: unknown[] }).errors)) {
        const issues = (data as { errors: Array<{ field?: string; message?: string }> }).errors;
        const messages = issues
          .map((issue) => issue.message || issue.field)
          .filter(Boolean);
        if (messages.length > 0) {
          return messages.join(". ");
        }
      }

      // 2. Direct message string from backend
      if ("message" in data && typeof (data as { message: unknown }).message === "string") {
        return (data as { message: string }).message;
      }

      // 3. Fallback error string
      if ("error" in data && typeof (data as { error: unknown }).error === "string") {
        return (data as { error: string }).error;
      }
    }

    // 4. HTTP status-based fallback messages
    if (error.response?.status === 400) {
      return "Invalid request. Please check your information.";
    }
    if (error.response?.status === 401) {
      // Distinguish expired session (authenticated request) from bad credentials (login)
      const hadToken = hasBearerToken(error.config?.headers);
      return hadToken
        ? "Your session has expired. Please sign in again."
        : "Invalid email or password.";
    }
    if (error.response?.status === 403) {
      return "You do not have permission to perform this action.";
    }
    if (error.response?.status === 404) {
      return "Requested resource not found. Please try again.";
    }
    if (error.response?.status === 409) {
      const isAuth = error.config?.url?.includes("/auth");
      return isAuth
        ? "This email is already registered."
        : "The order cannot be updated due to a status conflict.";
    }
    if (error.response && error.response.status >= 500) {
      return "Server error. Please try again later.";
    }

    // 5. Network connectivity issues
    if (error.code === "ECONNABORTED") {
      return "Request timed out. Please check your connection.";
    }
    if (!error.response) {
      return "Unable to connect to server. Please check your network.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
}
