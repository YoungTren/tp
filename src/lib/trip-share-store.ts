import { randomBytes } from "crypto";
import type { TripData } from "@/types/trip";

const TTL_SEC = 60 * 60 * 24 * 60;

type MemEntry = { json: string; exp: number };

const mem = (): Map<string, MemEntry> => {
  const g = globalThis as unknown as { __tpShare?: Map<string, MemEntry> };
  if (!g.__tpShare) g.__tpShare = new Map();
  return g.__tpShare;
};

const upstash = async (cmd: (string | number)[]): Promise<unknown> => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url?.trim() || !token?.trim()) {
    return null;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(cmd),
  });
  return res.json() as Promise<unknown>;
};

const hasUpstash = (): boolean =>
  Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );

export const saveSharedTrip = async (trip: TripData): Promise<string> => {
  const id = randomBytes(12).toString("base64url");
  const key = `trip_share:${id}`;
  const value = JSON.stringify(trip);

  if (hasUpstash()) {
    try {
      await upstash(["SET", key, value, "EX", TTL_SEC]);
      return id;
    } catch {
      // fallback: in-memory
    }
  }
  mem().set(id, { json: value, exp: Date.now() + TTL_SEC * 1000 });
  return id;
};

export const getSharedTrip = async (id: string): Promise<TripData | null> => {
  const key = `trip_share:${id}`;

  if (hasUpstash()) {
    try {
      const raw = (await upstash(["GET", key])) as {
        result?: string | null;
      } | null;
      const s = raw?.result;
      if (s) {
        return JSON.parse(s) as TripData;
      }
    } catch {
      // try memory
    }
  }
  const e = mem().get(id);
  if (!e || e.exp < Date.now()) {
    if (e) mem().delete(id);
    return null;
  }
  try {
    return JSON.parse(e.json) as TripData;
  } catch {
    return null;
  }
};
