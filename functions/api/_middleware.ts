import { Env, json } from "../_lib";

/**
 * Turns setup problems into explicit JSON errors the app can show, instead of
 * an opaque Cloudflare error page.
 */
export const onRequest: PagesFunction<Env> = async ({ env, next }) => {
  if (!env.DB) {
    return json(
      { error: "missing-binding", message: "Falta el binding D1 \"DB\" en el proyecto de Pages (wrangler.toml o Settings → Bindings)." },
      { status: 500 },
    );
  }
  try {
    return await next();
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    if (/no such table/i.test(detail)) {
      return json(
        { error: "missing-table", message: "La tabla attempts no existe en D1: ejecuta npm run db:migrate:remote." },
        { status: 500 },
      );
    }
    return json({ error: "internal", message: detail }, { status: 500 });
  }
};
