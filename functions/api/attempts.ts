import { Env, json, parseAttempt, userId } from "../_lib";

const MAX_BATCH = 100;

/** POST /api/attempts — body: one attempt or an array (offline queue flush). */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid JSON" }, { status: 400 });
  }
  const items = Array.isArray(body) ? body : [body];
  if (items.length === 0 || items.length > MAX_BATCH) return json({ error: "expected 1-100 attempts" }, { status: 400 });

  const attempts = items.map(parseAttempt);
  if (attempts.some((a) => a === null)) return json({ error: "invalid attempt" }, { status: 400 });

  const user = userId(request);
  const insert = env.DB.prepare(
    `INSERT INTO attempts (user_id, hand, draw, discard_chosen, discard_optimal, was_correct, shanten,
       ukeire_chosen, ukeire_optimal, category, chosen_shape)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  await env.DB.batch(
    attempts.map((a) =>
      insert.bind(user, a!.hand, a!.draw, a!.discardChosen, a!.discardOptimal.join(","), a!.wasCorrect ? 1 : 0,
        a!.shanten, a!.ukeireChosen, a!.ukeireOptimal, a!.category, a!.chosenShape),
    ),
  );
  return json({ saved: attempts.length }, { status: 201 });
};
