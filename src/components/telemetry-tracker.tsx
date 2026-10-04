"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type TelemetryConsent = "loading" | "unknown" | "accepted" | "declined";

const consentStorageKey = "ko_telemetry_consent";

// Generate a random unique ID for anonymous sessions and visitor tracking
function generateId(length = 16): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function TelemetryTracker() {
  const pathname = usePathname();
  const lastPathname = useRef<string | null>(null);
  const [consent, setConsent] = useState<TelemetryConsent>("loading");

  useEffect(() => {
    const storedConsent = localStorage.getItem(consentStorageKey);
    setConsent(storedConsent === "accepted" || storedConsent === "declined" ? storedConsent : "unknown");
  }, []);

  useEffect(() => {
    if (consent !== "accepted") {
      return;
    }

    // Avoid double logging the exact same path within a render cycle
    if (lastPathname.current === pathname) {
      return;
    }
    lastPathname.current = pathname;

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    if (!projectId) {
      // Gracefully disable telemetry if Firebase project ID is not set
      return;
    }

    // Determine visitor ID (persistent across browser restarts)
    let visitorId = localStorage.getItem("ko_telemetry_visitor_id");
    let isNewVisitor = false;
    if (!visitorId) {
      visitorId = generateId();
      localStorage.setItem("ko_telemetry_visitor_id", visitorId);
      isNewVisitor = true;
    }

    // Determine session ID (transient, deleted when tab is closed)
    let sessionId = sessionStorage.getItem("ko_telemetry_session_id");
    let isNewSession = false;
    if (!sessionId) {
      sessionId = generateId();
      sessionStorage.setItem("ko_telemetry_session_id", sessionId);
      isNewSession = true;
    }

    const isDev =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    const referrer = document.referrer || "";
    const language = navigator.language || "unknown";
    const screenSize = `${window.innerWidth}x${window.innerHeight}`;
    const timestamp = new Date().toISOString();

    const telemetryData = {
      fields: {
        visitorId: { stringValue: visitorId },
        sessionId: { stringValue: sessionId },
        pathname: { stringValue: pathname },
        referrer: { stringValue: referrer },
        language: { stringValue: language },
        screenSize: { stringValue: screenSize },
        timestamp: { timestampValue: timestamp },
        isNewVisitor: { booleanValue: isNewVisitor },
        isNewSession: { booleanValue: isNewSession },
        isDev: { booleanValue: isDev }
      }
    };

    // Logging for developers to verify in the browser console
    if (isDev) {
      console.log(
        `%c[Telemetry Engine]%c Logging path: %c${pathname}%c | Session: %c${isNewSession ? "New" : "Existing"}%c | Visitor: %c${isNewVisitor ? "New" : "Existing"}%c`,
        "color: #a3a3a3; font-weight: bold;",
        "color: inherit;",
        "color: #ffffff; font-weight: bold; background: #262626; padding: 2px 4px; border-radius: 2px;",
        "color: inherit;",
        isNewSession ? "color: #22c55e; font-weight: bold;" : "color: #a3a3a3;",
        "color: inherit;",
        isNewVisitor ? "color: #22c55e; font-weight: bold;" : "color: #a3a3a3;",
        "color: inherit;"
      );
    }

    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/visits?key=${apiKey || ""}`;

    // Silent background telemetry fetch
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(telemetryData)
    }).catch((err) => {
      if (isDev) {
        console.warn("[Telemetry Engine] Failed to dispatch payload:", err);
      }
    });
  }, [consent, pathname]);

  const updateConsent = (value: Extract<TelemetryConsent, "accepted" | "declined">) => {
    localStorage.setItem(consentStorageKey, value);
    setConsent(value);
  };

  if (consent !== "unknown") {
    return null;
  }

  return (
    <aside
      aria-label="Analytics preference"
      className="fixed bottom-24 left-4 right-4 z-[60] mx-auto max-w-xl rounded-xl border border-border bg-bg p-4 shadow-lg sm:left-auto sm:right-6"
    >
      <p className="text-[13px] leading-6 text-text/70">
        May I collect anonymous visit data such as pages viewed, referrer, language, and screen size to
        improve this portfolio?
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => updateConsent("accepted")}
          className="focus-ring rounded-md bg-primary px-4 py-2 text-[13px] font-semibold text-bg transition-colors hover:bg-accent-violet"
        >
          Allow analytics
        </button>
        <button
          type="button"
          onClick={() => updateConsent("declined")}
          className="focus-ring rounded-md border border-border px-4 py-2 text-[13px] font-semibold text-text"
        >
          Decline
        </button>
      </div>
    </aside>
  );
}
