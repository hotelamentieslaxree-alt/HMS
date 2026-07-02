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
  const json = await res.json();
  if (!json.success) throw new Error(json.errors?.[0]?.message || "Request failed");
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
