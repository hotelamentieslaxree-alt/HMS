// ARIA HMS — API client + fetch hooks
"use client";

import { useEffect, useState, useCallback } from "react";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("aria_auth");
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed?.token ?? null;
  } catch {
    return null;
  }
}

export async function api<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers || {}),
    },
  });

  // ─── Safe JSON parsing ──────────────────────────────────────────────
  // Prevents "Unexpected token '<'" when the server returns HTML (404/500 page)
  // instead of JSON. This is the #1 cause of white blank page crashes.
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  let json: any;
  if (isJson) {
    try {
      json = await res.json();
    } catch {
      throw new Error(`Failed to parse JSON from ${path} (HTTP ${res.status})`);
    }
  } else {
    // Server returned non-JSON (likely HTML error page from Next.js)
    const text = await res.text();
    if (res.status === 404) {
      throw new Error(`API endpoint not found: ${path}`);
    }
    if (res.status === 401) {
      throw new Error("Session expired. Please log in again.");
    }
    if (res.status >= 500) {
      throw new Error(`Server error (${res.status}). Please try again.`);
    }
    // For other non-JSON responses, provide a clear error
    throw new Error(
      `Unexpected response from ${path} (HTTP ${res.status}, ${contentType || "no content-type"}). ` +
      `Expected JSON but received ${text.substring(0, 50).includes("<!DOCTYPE") ? "HTML page" : "non-JSON response"}.`
    );
  }

  // ─── Handle structured API errors ──────────────────────────────────
  if (!json.success) {
    const errMsg = json.errors?.[0]?.message || json.errors?.[0]?.code || "Request failed";
    // Auto-logout on auth errors
    if (json.errors?.[0]?.code === "AUTH_INVALID" || res.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("aria_auth");
        window.location.reload();
      }
      throw new Error("Session expired. Please log in again.");
    }
    throw new Error(errMsg);
  }

  return json.data as T;
}

export function useApi<T = any>(path: string | null, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!path) { setData(null); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const d = await api<T>(path);
      setData(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    reload();
  }, [path, ...deps]);

  return { data, loading, error, reload, setData };
}

export async function apiPost(path: string, body?: any) {
  return api(path, { method: "POST", body: JSON.stringify(body || {}) });
}
export async function apiPut(path: string, body?: any) {
  return api(path, { method: "PUT", body: JSON.stringify(body || {}) });
}
export async function apiDelete(path: string) {
  return api(path, { method: "DELETE" });
}
