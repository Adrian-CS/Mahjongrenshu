import { Env, json, userId } from "../../_lib";

const TILE = /^([1-9][mps]|[1-7]z)$/;
const HAND = /^([1-9]+[mps]|[1-7]+z)+$/;

/** POST /api/mistakes/mastered — body {hand, draw}: that hand leaves the mistakes queue. */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = (await request.json().catch(() => null)) as { hand?: unknown; draw?: unknown } | null;
  const hand = body?.hand;
  const draw = body?.draw;
  if (typeof hand !== "string" || hand.length > 40 || !HAND.test(hand) || typeof draw !== "string" || !TILE.test(draw)) {
    return json({ error: "invalid hand" }, { status: 400 });
  }
  const { meta } = await env.DB.prepare(`UPDATE attempts SET mastered = 1 WHERE user_id = ? AND hand = ? AND draw = ?`)
    .bind(userId(request), hand, draw)
    .run();
  return json({ updated: meta.changes });
};
