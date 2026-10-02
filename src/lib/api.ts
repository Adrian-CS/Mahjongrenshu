import type { CategoryStats, Shape } from "@/lib/mahjong";

/** Attempt as sent to POST /api/attempts (tiles in compact notation). */
export interface AttemptRecord {
  hand: string;
  draw: string;
  discardChosen: string;
  discardOptimal: string[];
  wasCorrect: boolean;
  shanten: number;
  ukeireChosen: number;
  ukeireOptimal: number;
  category: Shape;
  chosenShape: Shape;
}

export interface Stats {
  categories: CategoryStats[];
  overall: { total: number; correct: number };
}

/**
 * Attempts are queued in localStorage and flushed in batches, so answers made
 * offline (installed PWA) or while the API is unreachable are not lost.
 */
const QUEUE_KEY = "nanikiru:pending-attempts";

function readQueue(): AttemptRecord[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as AttemptRecord[];
  } catch {
    return [];
  }
}

function writeQueue(queue: AttemptRecord[]) {
  try {
    if (queue.length) localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    else localStorage.removeItem(QUEUE_KEY);
  } catch {
    // Storage unavailable (private mode): the attempt is simply not persisted.
  }
}

let flushing = false;

export async function flushAttempts(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    for (let queue = readQueue(); queue.length; queue = readQueue()) {
      const batch = queue.slice(0, 100);
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch),
      });
      // 400 means the API rejected the data: drop it rather than retry forever.
      // Anything else (404 without Functions, 5xx, Access login redirect) is retried later.
      if (!res.ok && res.status !== 400) return;
      if (res.ok && !res.headers.get("content-type")?.includes("json")) return;
      writeQueue(readQueue().slice(batch.length));
    }
  } catch {
    // Offline or no API (e.g. `next dev`): keep the queue for later.
  } finally {
    flushing = false;
  }
}

export function saveAttempt(attempt: AttemptRecord): void {
  writeQueue([...readQueue(), attempt]);
  void flushAttempts();
}

export async function fetchStats(): Promise<Stats | null> {
  try {
    const res = await fetch("/api/stats", { cache: "no-store" });
    if (!res.ok || !res.headers.get("content-type")?.includes("json")) return null;
    return (await res.json()) as Stats;
  } catch {
    return null;
  }
}
