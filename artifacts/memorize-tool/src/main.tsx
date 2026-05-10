import { createRoot } from "react-dom/client";
import {
  setBaseUrl,
  setAccessTokenGetter,
  setInvalidAccessTokenHandler,
} from "@workspace/api-client-react";
import App from "./App";
import "./index.css";
import { clearAccessToken, getAccessToken } from "./lib/accessToken";
import { appBasePath } from "./lib/apiPath";

declare global {
  interface Window {
    __memorizeBootLoaded?: () => void;
  }
}

// Wire the shared invite-code access token into every request the generated
// API client makes. Raw `fetch` callers add the header themselves via
// `withAccessTokenHeader()`.
setBaseUrl(appBasePath() || null);
setAccessTokenGetter(() => getAccessToken());
setInvalidAccessTokenHandler(() => {
  clearAccessToken();
});

// Acknowledge as soon as main.tsx executes — proves the dev server delivered
// the entry module. Doing it before render() avoids hitting the boot fallback
// when React's first paint is slightly delayed.
if (typeof window !== "undefined" && typeof window.__memorizeBootLoaded === "function") {
  window.__memorizeBootLoaded();
}

createRoot(document.getElementById("root")!).render(<App />);
