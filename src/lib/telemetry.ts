/**
 * ORRA & Portfolio Telemetry Engine
 * =================================
 * Anonymous, privacy-preserving event dispatcher communicating directly with
 * Google Cloud Firestore via REST. Respects user consent, incurs zero Three.js
 * render-loop overhead, and logs rich badges in local development.
 */

export interface WorldEventParams {
  [key: string]: string | number | boolean | undefined;
}

function generateId(length = 16): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getOrCreateVisitorId(): string {
  if (typeof window === "undefined" || !window.localStorage) return "server";
  let id = window.localStorage.getItem("ko_telemetry_visitor_id");
  if (!id) {
    id = generateId();
    window.localStorage.setItem("ko_telemetry_visitor_id", id);
  }
  return id;
}

export function getOrCreateSessionId(): string {
  if (typeof window === "undefined" || !window.sessionStorage) return "server";
  let id = window.sessionStorage.getItem("ko_telemetry_session_id");
  if (!id) {
    id = generateId();
    window.sessionStorage.setItem("ko_telemetry_session_id", id);
  }
  return id;
}

export function logWorldEvent(eventName: string, params?: WorldEventParams): void {
  if (typeof window === "undefined") return;

  const consent = window.localStorage?.getItem("ko_telemetry_consent");
  if (consent === "declined") {
    return;
  }

  const isDev =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  const visitorId = getOrCreateVisitorId();
  const sessionId = getOrCreateSessionId();
  const timestamp = new Date().toISOString();

  if (isDev) {
    console.log(
      `%c[ORRA Telemetry]%c ${eventName} %o`,
      "background: #ffb21a; color: #000000; font-weight: bold; padding: 2px 6px; border-radius: 3px;",
      "color: #ffffff; font-weight: 600;",
      params ?? {}
    );
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!projectId) {
    return;
  }

  // Construct Firestore REST Document fields
  const fields: Record<string, any> = {
    visitorId: { stringValue: visitorId },
    sessionId: { stringValue: sessionId },
    eventName: { stringValue: eventName },
    timestamp: { timestampValue: timestamp },
    isDev: { booleanValue: isDev },
  };

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      if (typeof value === "string") {
        fields[key] = { stringValue: value };
      } else if (typeof value === "number") {
        if (Number.isInteger(value)) {
          fields[key] = { integerValue: value.toString() };
        } else {
          fields[key] = { doubleValue: value };
        }
      } else if (typeof value === "boolean") {
        fields[key] = { booleanValue: value };
      }
    }
  }

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/world_events?key=${apiKey || ""}`;

  fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields }),
    keepalive: true,
  }).catch((err) => {
    if (isDev) {
      console.warn("[ORRA Telemetry] Failed to dispatch event:", err);
    }
  });
}
