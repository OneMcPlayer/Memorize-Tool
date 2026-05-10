import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { withAccessTokenHeader, clearAccessToken } from "../lib/accessToken";
import { apiPath } from "../lib/apiPath";

async function handleInvalidAccessToken(response: Response): Promise<void> {
  if (response.status !== 401) return;
  try {
    const data = (await response.clone().json()) as { error?: string };
    if (data?.error === "invalid_access_token") clearAccessToken();
  } catch {
    /* ignore */
  }
}

export const isPasskeySupported = (): boolean => browserSupportsWebAuthn();

interface ApiUser {
  id: string;
  username: string;
  email: string | null;
}

interface RegisterResult {
  success: boolean;
  message?: string;
  userId?: string;
  user?: ApiUser;
  token?: string;
  expiresAt?: number;
}

interface LoginResult {
  success: boolean;
  message?: string;
  user?: ApiUser;
  token?: string;
  expiresAt?: number;
}

function persistSession(data: { token?: string; expiresAt?: number; user?: ApiUser }) {
  if (data.token && data.expiresAt && data.user) {
    localStorage.setItem("authToken", data.token);
    localStorage.setItem("authTokenExpires", String(data.expiresAt));
    localStorage.setItem(
      "authUser",
      JSON.stringify({
        username: data.user.username,
        displayName: data.user.username,
        email: data.user.email,
        isAuthenticated: true,
      }),
    );
  }
}

export async function registerPasskey(username: string): Promise<RegisterResult> {
  if (!username) throw new Error("Username is required");
  const trimmedUsername = username.trim();

  // Step 1: ask the server for registration options (challenge)
  const optsRes = await fetch(apiPath("/passkey/register/options"), {
    method: "POST",
    headers: withAccessTokenHeader({ "Content-Type": "application/json" }),
    body: JSON.stringify({ username: trimmedUsername }),
  });
  await handleInvalidAccessToken(optsRes);
  const optsData = (await optsRes.json().catch(() => ({}))) as
    | PublicKeyCredentialCreationOptionsJSON
    | { error?: string };
  if (!optsRes.ok) {
    throw new Error((optsData as { error?: string }).error ?? "Failed to start registration");
  }

  // Step 2: prompt the authenticator
  const credential = await startRegistration({
    optionsJSON: optsData as PublicKeyCredentialCreationOptionsJSON,
  });

  // Step 3: send the response back for cryptographic verification
  const verifyRes = await fetch(apiPath("/passkey/register/verify"), {
    method: "POST",
    headers: withAccessTokenHeader({ "Content-Type": "application/json" }),
    body: JSON.stringify({ username: trimmedUsername, response: credential }),
  });
  await handleInvalidAccessToken(verifyRes);
  const verifyData = (await verifyRes.json().catch(() => ({}))) as RegisterResult & {
    error?: string;
  };
  if (!verifyRes.ok) {
    throw new Error(verifyData.error ?? "Failed to verify registration");
  }

  if (verifyData.success) {
    persistSession(verifyData);
  }
  return verifyData;
}

export async function loginWithPasskey(): Promise<LoginResult> {
  // Step 1: ask the server for authentication options (challenge)
  const optsRes = await fetch(apiPath("/passkey/authenticate/options"), {
    method: "POST",
    headers: withAccessTokenHeader({ "Content-Type": "application/json" }),
    body: JSON.stringify({}),
  });
  await handleInvalidAccessToken(optsRes);
  const optsData = (await optsRes.json().catch(() => ({}))) as
    | PublicKeyCredentialRequestOptionsJSON
    | { error?: string };
  if (!optsRes.ok) {
    throw new Error((optsData as { error?: string }).error ?? "Failed to start authentication");
  }

  // Step 2: prompt the authenticator
  const credential = await startAuthentication({
    optionsJSON: optsData as PublicKeyCredentialRequestOptionsJSON,
  });

  // Step 3: send the assertion back for cryptographic verification
  const verifyRes = await fetch(apiPath("/passkey/authenticate/verify"), {
    method: "POST",
    headers: withAccessTokenHeader({ "Content-Type": "application/json" }),
    body: JSON.stringify({ response: credential }),
  });
  await handleInvalidAccessToken(verifyRes);
  const verifyData = (await verifyRes.json().catch(() => ({}))) as LoginResult & {
    error?: string;
  };
  if (!verifyRes.ok) {
    throw new Error(verifyData.error ?? "Failed to authenticate");
  }

  if (verifyData.success) {
    persistSession(verifyData);
  }
  return verifyData;
}
