import { Env, json, userId } from "../_lib";

/** Only recent attempts count for review, so old mistakes fade out. */
const RECENT = 300;

/** GET /api/stats — per-category results over recent attempts, plus all-time totals. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = userId(request);
  const [recent, overall] = await env.DB.batch<Record<string, number | string>>([
    env.DB.prepare(
      `SELECT category, COUNT(*) AS total, SUM(was_correct) AS correct
       FROM (SELECT category, was_correct FROM attempts WHERE user_id = ? ORDER BY id DESC LIMIT ?)
       GROUP BY category`,
    ).bind(user, RECENT),
    env.DB.prepare(`SELECT COUNT(*) AS total, COALESCE(SUM(was_correct), 0) AS correct FROM attempts WHERE user_id = ?`).bind(user),
  ]);
  return json({ categories: recent.results, overall: overall.results[0] });
};
