import { SHAPES } from "../src/lib/mahjong/shapes";

export interface Env {
  DB: D1Database;
}

/**
 * The whole site sits behind Cloudflare Access, which authenticates the user
 * and forwards their email. Without Access (local `wrangler pages dev`) all
 * attempts belong to "local".
 */
export function userId(request: Request): string {
  return request.headers.get("Cf-Access-Authenticated-User-Email") ?? "local";
}

export function json(data: unknown, init: ResponseInit = {}): Response {
  return Response.json(data, { ...init, headers: { "Cache-Control": "no-store", ...init.headers } });
}

const TILE = /^([1-9][mps]|[1-7]z)$/;
const HAND = /^([1-9]+[mps]|[1-7]+z)+$/;
const isShape = (v: unknown): v is string => typeof v === "string" && (SHAPES as string[]).includes(v);
const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

export interface AttemptInput {
  hand: string;
  draw: string;
  discardChosen: string;
  discardOptimal: string[];
  wasCorrect: boolean;
  shanten: number;
  ukeireChosen: number;
  ukeireOptimal: number;
  category: string;
  chosenShape: string;
}

export function parseAttempt(v: unknown): AttemptInput | null {
  if (typeof v !== "object" || v === null) return null;
  const a = v as Record<string, unknown>;
  const ok =
    typeof a.hand === "string" && a.hand.length <= 40 && HAND.test(a.hand) &&
    typeof a.draw === "string" && TILE.test(a.draw) &&
    typeof a.discardChosen === "string" && TILE.test(a.discardChosen) &&
    Array.isArray(a.discardOptimal) && a.discardOptimal.length > 0 && a.discardOptimal.length <= 14 &&
    a.discardOptimal.every((t) => typeof t === "string" && TILE.test(t)) &&
    typeof a.wasCorrect === "boolean" &&
    isInt(a.shanten, -1, 8) && isInt(a.ukeireChosen, 0, 136) && isInt(a.ukeireOptimal, 0, 136) &&
    isShape(a.category) && isShape(a.chosenShape);
  return ok ? (a as unknown as AttemptInput) : null;
}
