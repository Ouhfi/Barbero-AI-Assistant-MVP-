import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User, loginUser as apiLogin, registerUser as apiRegister, getCurrentUser as apiGetCurrentUser } from "@/services/authService";
import { setAuthToken, registerUnauthorizedHandler } from "@/services/api";
import { router } from "expo-router";

/**
 * IMPORTANT SECURITY NOTE:
 * AsyncStorage is unencrypted key-value storage. It is used here for development
 * and web-compatible persistence. For production mobile applications, token storage
 * should be reviewed and migrated to an encrypted solution (such as expo-secure-store).
 */

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  hasHydrated: boolean;

  setHasHydrated: (hasHydrated: boolean) => void;
  loginUser: (email: string, password: string) => Promise<User>;
  registerUser: (fullName: string, email: string, password: string) => Promise<User>;
  refreshUser: () => Promise<User>;
  logoutUser: () => void;
}

/**
 * Shared 401 handler registered with the Axios client.
 * Extracted as a named constant so it can be re-registered (and the
 * idempotency flag reset) after each successful login — ensuring repeated
 * session expiry events within the same app lifetime are all handled.
 */
const handleUnauthorized = (): void => {
  setAuthToken(null);
  useAuthStore.setState({ user: null, token: null });
  // router.replace is safe here: this callback is only ever invoked in
  // response to an HTTP 401, which happens after the app is fully mounted.
  router.replace("/login");
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      hasHydrated: false,

      setHasHydrated: (hasHydrated: boolean) => {
        set({ hasHydrated });
      },

      loginUser: async (email: string, password: string): Promise<User> => {
        if (get().isLoading) {
          throw new Error("A request is already in progress.");
        }

        set({ isLoading: true });
        try {
          const response = await apiLogin({ email, password });
          if (!response.token || !response.user) {
            throw new Error("Invalid response received from server.");
          }

          // Attach token to Axios client for subsequent requests
          setAuthToken(response.token);

          // Re-register the 401 handler to reset the idempotency flag in api.ts.
          // This ensures a future session expiry event is still handled correctly
          // if the user logs in again after a previous forced logout.
          registerUnauthorizedHandler(handleUnauthorized);

          set({
            user: response.user,
            token: response.token,
          });

          return response.user;
        } finally {
          set({ isLoading: false });
        }
      },

      registerUser: async (
        fullName: string,
        email: string,
        password: string
      ): Promise<User> => {
        if (get().isLoading) {
          throw new Error("A request is already in progress.");
        }

        set({ isLoading: true });
        try {
          const response = await apiRegister({ fullName, email, password });
          if (!response.user) {
            throw new Error("Invalid response received from server.");
          }

          // Note: Registration does not issue a JWT token.
          return response.user;
        } finally {
          set({ isLoading: false });
        }
      },

      refreshUser: async (): Promise<User> => {
        const response = await apiGetCurrentUser();
        if (!response.user) {
          throw new Error("Invalid response received from server.");
        }
        const currentUser = get().user;
        const newUser = response.user;
        const isSame =
          currentUser !== null &&
          currentUser.id === newUser.id &&
          currentUser.email === newUser.email &&
          currentUser.fullName === newUser.fullName &&
          currentUser.role === newUser.role &&
          currentUser.area_id === newUser.area_id;

        if (!isSame) {
          set({ user: newUser });
        }
        return newUser;
      },

      logoutUser: () => {
        // Clear authorization header and state
        setAuthToken(null);
        set({
          user: null,
          token: null,
        });
        // Reset the 401 idempotency guard on manual logout
        registerUnauthorizedHandler(handleUnauthorized);
      },
    }),
    {
      name: "barbero_auth_storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Persist only the minimal authentication session state (never persist forms, errors, or passwords)
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("Auth hydration error:", error);
        }
        if (state) {
          state.setHasHydrated(true);
          if (state.token) {
            setAuthToken(state.token);
          }
        } else {
          // Hydration produced no state (e.g. first launch or corrupted storage)
          useAuthStore.setState({ hasHydrated: true });
        }

        // Register the global 401 handler once after storage hydration.
        // The same reference is re-registered on every successful login
        // (see loginUser) so the idempotency flag in api.ts is reset correctly.
        registerUnauthorizedHandler(handleUnauthorized);
      },
    }
  )
);

// Register handler immediately on module load so that a valid handler is active
// throughout the entire app lifecycle, including before persistence rehydration completes.
registerUnauthorizedHandler(handleUnauthorized);

