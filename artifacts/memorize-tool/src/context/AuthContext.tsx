import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { withAccessTokenHeader, clearAccessToken } from "../lib/accessToken";

// Returns true when the 401 came from the access-token gate (not from the
// passkey session). Callers should skip clearing the user's session in that
// case — the access gate will re-prompt and the existing session is still
// valid once a fresh access code is entered.
async function isAccessTokenRejection(response: Response): Promise<boolean> {
  if (response.status !== 401) return false;
  try {
    const data = (await response.clone().json()) as { error?: string };
    if (data?.error === "invalid_access_token") {
      clearAccessToken();
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

export interface AuthUser {
  username: string;
  displayName?: string;
  email?: string;
  groups?: string[];
  isAuthenticated?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  setUser: React.Dispatch<React.SetStateAction<AuthUser | null>>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isTokenExpired = useCallback((): boolean => {
    const expiresAt = localStorage.getItem("authTokenExpires");
    if (!expiresAt) return true;
    const expiryTime = parseInt(expiresAt, 10);
    if (Number.isNaN(expiryTime)) return true;
    return Date.now() > expiryTime - 5 * 60 * 1000;
  }, []);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const authToken = localStorage.getItem("authToken");
      if (!authToken) return false;
      const response = await fetch("/api/passkey/refresh", {
        method: "POST",
        headers: withAccessTokenHeader({
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        }),
      });
      if (await isAccessTokenRejection(response)) {
        // Keep the passkey session intact; the access gate will re-prompt.
        return false;
      }
      if (response.ok) {
        const data = (await response.json()) as { success: boolean; token: string; expiresAt: number };
        if (data.success && data.token) {
          localStorage.setItem("authToken", data.token);
          localStorage.setItem("authTokenExpires", String(data.expiresAt));
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error("Token refresh failed:", err);
      return false;
    }
  }, []);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const authToken = localStorage.getItem("authToken");
        if (!authToken) {
          setUser(null);
          setLoading(false);
          return;
        }
        if (isTokenExpired()) {
          const refreshed = await refreshToken();
          if (!refreshed) {
            localStorage.removeItem("authToken");
            localStorage.removeItem("authTokenExpires");
            localStorage.removeItem("authUser");
            setUser(null);
            setLoading(false);
            return;
          }
        }
        const storedUser = localStorage.getItem("authUser");
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser) as AuthUser);
          } catch (e) {
            console.error("Error parsing stored user:", e);
          }
        }
        const tokenForRequest = localStorage.getItem("authToken");
        const response = await fetch("/api/user/me", {
          headers: withAccessTokenHeader({ Authorization: `Bearer ${tokenForRequest}` }),
        });
        if (await isAccessTokenRejection(response)) {
          // Don't drop the passkey session for an access-gate 401.
        } else if (response.ok) {
          const userData = (await response.json()) as AuthUser;
          setUser(userData);
          localStorage.setItem("authUser", JSON.stringify(userData));
        } else if (response.status === 401) {
          localStorage.removeItem("authToken");
          localStorage.removeItem("authTokenExpires");
          localStorage.removeItem("authUser");
          setUser(null);
        }
      } catch (err) {
        console.error("Authentication check failed:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    void checkAuthStatus();

    refreshTimerRef.current = setInterval(() => {
      if (isTokenExpired()) {
        refreshToken().catch((err) => console.error("Background token refresh failed:", err));
      }
    }, 5 * 60 * 1000);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [isTokenExpired, refreshToken]);

  const logout = useCallback(async (): Promise<void> => {
    try {
      const authToken = localStorage.getItem("authToken");
      if (authToken) {
        await fetch("/api/passkey/logout", {
          method: "POST",
          headers: withAccessTokenHeader({
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          }),
        }).catch((err) => console.error("Logout API call failed:", err));
      }
      localStorage.removeItem("authToken");
      localStorage.removeItem("authTokenExpires");
      localStorage.removeItem("authUser");
      setUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }, []);

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    loading,
    logout,
    refreshToken,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
