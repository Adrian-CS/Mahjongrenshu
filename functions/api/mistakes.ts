import { Env, json, userId } from "../_lib";

/** GET /api/mistakes — hands answered wrong and not yet mastered, most recent first. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const { results } = await env.DB.prepare(
    `SELECT hand, draw, COUNT(*) AS misses, MAX(id) AS last_id
     FROM attempts
     WHERE user_id = ? AND was_correct = 0 AND mastered = 0
     GROUP BY hand, draw
     ORDER BY last_id DESC
     LIMIT 100`,
  )
    .bind(userId(request))
    .all<{ hand: string; draw: string; misses: number }>();
  return json({ mistakes: results.map(({ hand, draw, misses }) => ({ hand, draw, misses })) });
};
