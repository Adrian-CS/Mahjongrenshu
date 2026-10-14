import { Env, json, userId } from "../_lib";

interface ProgressInput {
  lessonId: string;
  correct: number;
  answered: number;
  completed: boolean;
  updatedAt: string;
}

const ID = /^[a-z0-9-]{1,40}$/;
const isCount = (v: unknown) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 1000;

function parse(v: unknown): ProgressInput | null {
  if (typeof v !== "object" || v === null) return null;
  const p = v as Record<string, unknown>;
  const ok =
    typeof p.lessonId === "string" && ID.test(p.lessonId) &&
    isCount(p.correct) && isCount(p.answered) &&
    typeof p.completed === "boolean" &&
    typeof p.updatedAt === "string" && !Number.isNaN(Date.parse(p.updatedAt));
  return ok ? (p as unknown as ProgressInput) : null;
}

/** GET /api/lessons — this user's progress per lesson. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const { results } = await env.DB.prepare(
    `SELECT lesson_id, correct, answered, completed, updated_at FROM lesson_progress WHERE user_id = ?`,
  )
    .bind(userId(request))
    .all<{ lesson_id: string; correct: number; answered: number; completed: number; updated_at: string }>();
  const progress = Object.fromEntries(
    results.map((r) => [r.lesson_id, { correct: r.correct, answered: r.answered, completed: r.completed === 1, updatedAt: r.updated_at }]),
  );
  return json({ progress });
};

/** PUT /api/lessons — body: one entry or an array; an entry only replaces an older one. */
export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json().catch(() => null);
  const items = (Array.isArray(body) ? body : [body]).map(parse);
  if (items.length === 0 || items.length > 100 || items.some((i) => i === null)) {
    return json({ error: "invalid progress" }, { status: 400 });
  }
  const upsert = env.DB.prepare(
    `INSERT INTO lesson_progress (user_id, lesson_id, correct, answered, completed, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id, lesson_id) DO UPDATE SET
       correct = excluded.correct, answered = excluded.answered,
       completed = MAX(lesson_progress.completed, excluded.completed), updated_at = excluded.updated_at
     WHERE excluded.updated_at > lesson_progress.updated_at`,
  );
  const user = userId(request);
  await env.DB.batch(items.map((i) => upsert.bind(user, i!.lessonId, i!.correct, i!.answered, i!.completed ? 1 : 0, i!.updatedAt)));
  return json({ saved: items.length });
};
