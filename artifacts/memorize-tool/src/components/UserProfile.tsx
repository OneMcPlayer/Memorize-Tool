import React, { useState, useEffect } from "react";
import { useAuth, type AuthUser } from "../context/AuthContext";
import { useAppContext } from "../context/AppContext";
import { translations } from "../data/translations";
import { isPasskeySupported, registerPasskey, loginWithPasskey } from "../services/passkeyService";
import { showToast } from "../utils";
import { withAccessTokenHeader, clearAccessToken } from "../lib/accessToken";
import { apiPath } from "../lib/apiPath";
import { getScopedStorageItem } from "../lib/scopedLocalStorage";
import "./UserProfile.css";

interface UserProfileProps {
  onBack: () => void;
}

const UserProfile = ({ onBack }: UserProfileProps) => {
  const { user, logout, setUser } = useAuth();
  const { currentLang } = useAppContext();
  const t = (translations[currentLang] ?? {}) as Record<string, string>;
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [passkeyCount, setPasskeyCount] = useState<number | null>(null);
  const supported = isPasskeySupported();

  useEffect(() => {
    if (!user) {
      setPasskeyCount(null);
      return;
    }
    const token = getScopedStorageItem("authToken");
    if (!token) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(apiPath("/passkey/count"), {
          headers: withAccessTokenHeader({ Authorization: `Bearer ${token}` }),
        });
        if (res.status === 401) {
          try {
            const data = (await res.clone().json()) as { error?: string };
            if (data?.error === "invalid_access_token") clearAccessToken();
          } catch {
            /* ignore */
          }
        }
        if (!res.ok) return;
        const data = (await res.json()) as { count?: number };
        if (!cancelled && typeof data.count === "number") {
          setPasskeyCount(data.count);
        }
      } catch {
        // Non-fatal: passkey count display is informational only.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const applySession = (sessionUser: { username: string; email?: string | null } | undefined) => {
    if (!sessionUser) return;
    const next: AuthUser = {
      username: sessionUser.username,
      displayName: sessionUser.username,
      email: sessionUser.email ?? undefined,
      isAuthenticated: true,
    };
    setUser(next);
  };

  const handleRegister = async () => {
    if (!username.trim()) {
      showToast(t.username ?? "Username required", 3000, "error");
      return;
    }
    setBusy(true);
    try {
      const result = await registerPasskey(username.trim());
      applySession(result.user);
      showToast("Passkey registered and signed in.", 3000, "success");
      setUsername("");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Registration failed", 4000, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async () => {
    setBusy(true);
    try {
      const result = await loginWithPasskey();
      if (result.success) {
        applySession(result.user);
        showToast("Logged in successfully", 2500, "success");
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Login failed", 4000, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    showToast(t.logout ?? "Logged out", 2500, "info");
  };

  if (!user) {
    return (
      <div className="user-profile">
        <h2>{t.profile ?? "Profile"}</h2>
        <p>{t.notLoggedIn ?? "Not logged in"}</p>
        {!supported && <p className="error">{t.passkeyNotSupported ?? "Passkeys are not supported by this browser."}</p>}
        {supported && (
          <>
            <div className="auth-section">
              <h3>{t.loginWithPasskey ?? "Login with Passkey"}</h3>
              <button onClick={handleLogin} disabled={busy} className="primary-btn">
                {t.login ?? "Login"}
              </button>
            </div>
            <div className="auth-section">
              <h3>{t.registerPasskey ?? "Register a Passkey"}</h3>
              <input
                type="text"
                placeholder={t.username ?? "Username"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={busy}
              />
              <button onClick={handleRegister} disabled={busy || !username.trim()} className="secondary-btn">
                {t.register ?? "Register"}
              </button>
            </div>
          </>
        )}
        <div className="profile-actions">
          <button onClick={onBack} className="back-btn">
            {t.backButton ?? "Back"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-profile">
      <h2>{t.profile ?? "Profile"}</h2>
      <div className="profile-info">
        <p>
          <strong>{t.username ?? "Username"}:</strong> {user.username}
        </p>
        {user.displayName && (
          <p>
            <strong>{t.displayName ?? "Display Name"}:</strong> {user.displayName}
          </p>
        )}
        {user.email && (
          <p>
            <strong>{t.email ?? "Email"}:</strong> {user.email}
          </p>
        )}
        {user.groups && user.groups.length > 0 && (
          <p>
            <strong>{t.groups ?? "Groups"}:</strong> {user.groups.join(", ")}
          </p>
        )}
        <p data-testid="passkey-count">
          <strong>{t.passkeyCount ?? "Registered passkeys"}:</strong>{" "}
          {passkeyCount === null ? "…" : passkeyCount}
        </p>
      </div>
      <div className="profile-actions">
        <button onClick={handleLogout} className="logout-button">
          {t.logout ?? "Logout"}
        </button>
        <button onClick={onBack} className="back-btn">
          {t.backButton ?? "Back"}
        </button>
      </div>
    </div>
  );
};

export default UserProfile;
