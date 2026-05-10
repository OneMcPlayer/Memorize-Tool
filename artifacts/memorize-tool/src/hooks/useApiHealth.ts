import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { apiPath } from "../lib/apiPath";

export type ApiHealthStatus = "checking" | "online" | "offline";

export interface ApiHealthState {
  status: ApiHealthStatus;
  errorMessage: string;
  lastChecked: Date | null;
  consecutiveFailures: number;
  recheck: () => void;
}

const POLL_INTERVAL_HEALTHY_MS = 30_000;
const POLL_INTERVAL_FAILING_MS = 5_000;
const REQUEST_TIMEOUT_MS = 5_000;

const buildHealthUrl = (): string => {
  return apiPath("/healthz");
};

export function useApiHealthState(): ApiHealthState {
  const [status, setStatus] = useState<ApiHealthStatus>("checking");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);

  const isMountedRef = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<AbortController | null>(null);
  const failuresRef = useRef(0);

  const clearScheduled = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const scheduleNext = useCallback((delay: number) => {
    clearScheduled();
    timeoutRef.current = setTimeout(() => {
      void runCheck();
    }, delay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runCheck = useCallback(async () => {
    if (inFlightRef.current) {
      inFlightRef.current.abort();
    }
    const controller = new AbortController();
    inFlightRef.current = controller;

    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(buildHealthUrl(), {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!isMountedRef.current) return;

      if (response.ok) {
        failuresRef.current = 0;
        setConsecutiveFailures(0);
        setStatus("online");
        setErrorMessage("");
      } else {
        failuresRef.current += 1;
        setConsecutiveFailures(failuresRef.current);
        setStatus("offline");
        setErrorMessage(`Server returned ${response.status}`);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      failuresRef.current += 1;
      setConsecutiveFailures(failuresRef.current);
      setStatus("offline");
      const message =
        err instanceof DOMException && err.name === "AbortError"
          ? "Health check timed out"
          : err instanceof Error
            ? err.message
            : "Unable to reach server";
      setErrorMessage(message);
    } finally {
      clearTimeout(timeoutId);
      if (inFlightRef.current === controller) {
        inFlightRef.current = null;
      }
      if (isMountedRef.current) {
        setLastChecked(new Date());
        const nextDelay =
          failuresRef.current > 0 ? POLL_INTERVAL_FAILING_MS : POLL_INTERVAL_HEALTHY_MS;
        scheduleNext(nextDelay);
      }
    }
  }, [scheduleNext]);

  useEffect(() => {
    isMountedRef.current = true;
    void runCheck();

    const handleOnline = () => {
      void runCheck();
    };
    window.addEventListener("online", handleOnline);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void runCheck();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      isMountedRef.current = false;
      clearScheduled();
      if (inFlightRef.current) {
        inFlightRef.current.abort();
        inFlightRef.current = null;
      }
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [runCheck]);

  const recheck = useCallback(() => {
    void runCheck();
  }, [runCheck]);

  return { status, errorMessage, lastChecked, consecutiveFailures, recheck };
}

const ApiHealthContext = createContext<ApiHealthState | null>(null);

export const ApiHealthProvider = ApiHealthContext.Provider;

export function useApiHealth(): ApiHealthState {
  const ctx = useContext(ApiHealthContext);
  if (!ctx) {
    throw new Error("useApiHealth must be used within an ApiHealthProvider");
  }
  return ctx;
}
