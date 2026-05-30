"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

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

  useEffect(() => {
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
  }, [pathname]);

  return null;
}
